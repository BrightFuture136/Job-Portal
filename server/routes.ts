import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import { setupAuth, isAuthenticated, restrictTo } from "./auth";
import { storage } from "./storage";
import { insertJobSchema, insertApplicationSchema,users,insertJobAlertSchema } from "@shared/schema";
import { eq, and, sql, inArray, SQLWrapper } from "drizzle-orm";
import { db } from "./db";
import rateLimit from "express-rate-limit";
import * as schema from "../shared/schema";
import twilio from "twilio";
import * as fs from "fs/promises"; // Correct import for fs.promises
import path from "path";
import multer from "multer";
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import nlp from "compromise";
import bcrypt from "bcrypt";
// import fuzzy from "fuzzy";
const client = twilio("AC8d161734a4954ca405a103aa3f540a15", "4197f3e95b9f077e01333855b9197ce1"); // Replace with your Twilio credentials
import stringSimilarity from 'string-similarity'; // For fuzzy matching


interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again later.",
});

// Configure multer for file uploads


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resumeUpload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const brandingUpload = multer({
  dest: "uploads/", // Save branding files in a separate directory
  fileFilter: (req, file, cb) => {
    // Allow only image files (e.g., JPEG, PNG)
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for branding"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});
const upload = multer({
  dest: "uploads/payments/",
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
const profileImageUpload = multer({
  dest: "uploads/profilepic/",
  fileFilter: (req, file, cb) => {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      return cb(new Error("Only JPEG and PNG images are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

const plans: Record<"professional" | "enterprise", number> = {
  professional: 49,
  enterprise: 99,
};
// Expanded skills dictionary
const skillsDictionary: { [key: string]: string } = {
  "js": "javascript",
  "javascript": "javascript",
  "es6": "javascript",
  "typescript": "javascript",
  "node": "nodejs",
  "node.js": "nodejs",
  "reactjs": "react",
  "react.js": "react",
  "py": "python",
  "python": "python",
  "sql": "sql",
  "db": "database",
  "html5": "html",
  "css3": "css",
  "aws": "cloud",
  "azure": "cloud",
  "gcp": "cloud",
  "docker": "devops",
  "kubernetes": "devops",
  "ci/cd": "devops",
  "machine learning": "ai",
  "ml": "ai",
  "ai": "ai",
  "deep learning": "ai",
  // Add more mappings as needed
};

// Experience normalization dictionary
const experienceDictionary: { [key: string]: string } = {
  "software engineer": "developer",
  "devops engineer": "devops",
  "cloud engineer": "cloud",
  "data scientist": "data",
  "data analyst": "data",
  "frontend developer": "developer",
  "backend developer": "developer",
  "full stack developer": "developer",
  // Add more mappings as needed
};

// Normalize skill names
const normalizeSkill = (skill: string): string => {
  return skillsDictionary[skill.toLowerCase()] || skill.toLowerCase();
};

// Normalize experience titles
const normalizeExperience = (title: string): string => {
  return experienceDictionary[title.toLowerCase()] || title.toLowerCase();
};

// Extract text from a PDF resume
async function extractTextFromResume(resumeUrl: string): Promise<string> {
  try {
    const resumePath = path.join(__dirname, "../", resumeUrl);
    const buffer = await fs.readFile(resumePath);
    const pdfData = await pdfParse(buffer);
    return pdfData.text.toLowerCase();
  } catch (error) {
    console.error("Error extracting resume text:", error);
    return "";
  }
}

// Enhanced ATS Resume Parser with NLP
async function extractResumeData(resumeUrl: string): Promise<{ skills: string[]; experience: { title: string; years: number }[] }> {
  const text = await extractTextFromResume(resumeUrl);
  const doc = nlp(text);

  // Extract skills using NLP
  const skillsSection = text.match(/(?:skills|technical skills|proficiencies):?\s*([\s\S]+?)(?=\n\n|\n(?:experience|education|work history)|$)/i)?.[1] || text;
  const skillsDoc = nlp(skillsSection);
  const skills = skillsDoc
    .topics()
    .out('array')
    .map(normalizeSkill)
    .filter((s: string) => s.length > 2 && !s.match(/^\d+$/))
    .filter((s: any, i: any, arr: string | any[]) => arr.indexOf(s) === i); // Remove duplicates

  // Extract experience with NLP
  const experienceSection = text.match(/(?:experience|work experience|employment history):?\s*([\s\S]+?)(?=\n\n|\n(?:education|skills)|$)/i)?.[1] || text;
  const experienceLines = experienceSection.split("\n").filter(line => line.match(/\d{4}\s*-\s*\d{4}|\d{4}\s*-\s*present/i));
  const experience: { title: string; years: number }[] = experienceLines.map(line => {
    const docLine = nlp(line);
    const title = docLine.organizations().out('array')[0] || docLine.topics().out('array')[0] || line.split(/\d{4}/)[0]?.trim() || "Unknown";
    const normalizedTitle = normalizeExperience(title);
    const dateMatch = line.match(/(\d{4})\s*-\s*(\d{4}|present)/i);
    let years = 0;
    if (dateMatch) {
      const startYear = parseInt(dateMatch[1], 10);
      const endYear = dateMatch[2] === "present" ? new Date().getFullYear() : parseInt(dateMatch[2], 10);
      years = endYear - startYear;
    }
    return { title: normalizedTitle, years: Math.max(years, 0) };
  });

  return { skills: skills || [], experience };
}

// Enhanced ATS Scoring Function
async function calculateATSScore(job: schema.Job, application: Partial<schema.Application> & { seekerId: number; resumeUrl: string }): Promise<number> {
  try {
    if (application.atsScore !== undefined && application.atsScore !== null) return application.atsScore;

    const resumeData = await extractResumeData(application.resumeUrl);
    const seeker = await db.select().from(schema.users).where(eq(schema.users.id, application.seekerId)).limit(1).then(res => res[0]);

    const jobSkills = (job.skills || []).map(normalizeSkill);
    const jobRequirements = (job.requirements || []).map(r => r.toLowerCase());
    const jobExperienceLevel = job.experienceLevel?.toLowerCase();
    const jobContext = job.description.toLowerCase().match(/(software|marketing|finance|engineering)/)?.[0] || "";
    const isTechnical = job.title.toLowerCase().includes("engineer") || (job.skills?.length ?? 0) > 5;

    const weights = isTechnical
      ? { skills: 60, experience: 20, requirements: 20 }
      : jobExperienceLevel === "senior"
      ? { skills: 40, experience: 40, requirements: 20 }
      : { skills: 50, experience: 30, requirements: 20 };

    const resumeSkills = resumeData.skills.map(normalizeSkill);
    const seekerSkills = (seeker?.skills || []).map(normalizeSkill);
    const allSeekerSkills = Array.from(new Set([...resumeSkills, ...seekerSkills]));
    const resumeExperience = resumeData.experience;
    const seekerExperience = seeker?.experience || [];

    let score = 0;

    // Skill Matching with Fuzzy Logic
    const skillMatches = jobSkills.filter(jobSkill =>
      allSeekerSkills.some(seekerSkill => stringSimilarity.compareTwoStrings(jobSkill, seekerSkill) > 0.7) // 70% similarity threshold
    ).length;
    const skillScore = jobSkills.length > 0 ? (skillMatches / jobSkills.length) * 50 : 0;
    score += skillScore * (weights.skills / 50);

    // Experience Matching
    const totalExperienceYears = resumeExperience.reduce((sum, exp) => sum + exp.years, 0) +
      seekerExperience.reduce((sum, exp) => {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
      }, 0);
    const targetYears = jobExperienceLevel === "senior" ? 5 : jobExperienceLevel === "mid" ? 2 : 0;
    const experienceMatch = Math.max(30 - Math.abs(totalExperienceYears - targetYears) * 5, 10);
    score += experienceMatch * (weights.experience / 30);

    // Requirement Matching
    const requirementMatches = jobRequirements.filter(req => {
      const resumeMatch = resumeExperience.some(exp => exp.title.toLowerCase().includes(req));
      const seekerMatch = seekerExperience.some(exp => exp.title.toLowerCase().includes(req));
      return resumeMatch || seekerMatch;
    }).length;
    const requirementScore = jobRequirements.length > 0 ? (requirementMatches / jobRequirements.length) * 20 : 0;
    score += requirementScore * (weights.requirements / 20);

    // Penalize Irrelevant Experience
    const irrelevantExperience = resumeExperience.some(exp =>
      !jobRequirements.some(req => exp.title.toLowerCase().includes(req)) &&
      !exp.title.toLowerCase().includes(jobContext) &&
      !job.title.toLowerCase().includes(exp.title.toLowerCase())
    );
    score -= irrelevantExperience ? 10 : 0;

    return Math.min(Math.round(score), 100);
  } catch (error) {
    console.error("Error calculating ATS score:", error);
    return 0;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.use(cors()); 
  // app.use(limiter); 
  app.use(express.json());
  setupAuth(app);

  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/api/auth/me", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return only necessary user details (avoid sensitive data like password)
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      companyName: user.companyName,
      industry: user.industry,
      website: user.website,
      companyDescription: user.companyDescription,
      culture: user.culture,
      benefits: user.benefits,
      logoUrl: user.logoUrl,
      officePhotos: user.officePhotos,
      companySize: user.companySize,
      location: user.location,
      founded: user.founded,
    };

    res.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

  // Jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      const employerId = req.query.employerId ? Number(req.query.employerId) : undefined;
      const jobs = await storage.getJobs(employerId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(
    "/api/jobs",
    isAuthenticated,
    restrictTo("employer"),
    async (req, res) => {
      const parsed = insertJobSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      try {
        const job = await storage.createJob({
          ...parsed.data,
          employerId: req.user!.id,
          skills: parsed.data.skills ?? null,
          requirements: parsed.data.requirements ?? null,
          benefits: parsed.data.benefits ?? null,
          applicationDeadline: parsed.data.applicationDeadline ?? null,
          experienceLevel: parsed.data.experienceLevel ?? null,
          remote: parsed.data.remote ?? null,
          createdAt: new Date(),
        });
        res.status(201).json(job);
      } catch (error) {
        console.error("Error creating job:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  );
  app.get("/api/jobs/:id", async (req, res) => {
    const jobId = Number(req.params.id);
    if (isNaN(jobId)) return res.status(400).json({ message: "Invalid job ID" });
  
    try {
      const job = await storage.getJobById(jobId);
      if (!job) return res.sendStatus(404);
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Applications
  app.post(
    "/api/jobs/:id/apply",
    isAuthenticated,
    restrictTo("seeker"),
    resumeUpload.single("resume"),
    async (req: MulterRequest, res) => {
      const jobId = Number(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Resume file is required" });
      }

      const { coverLetter } = req.body;

      const uploadDir = path.join(__dirname, "../uploads/resumes");
      console.log("Resolved uploadDir:", uploadDir);

      try {
        await fs.access(uploadDir).catch(async () => {
          console.log(`Directory ${uploadDir} does not exist, creating it...`);
          await fs.mkdir(uploadDir, { recursive: true });
          console.log(`Directory ${uploadDir} created successfully`);
        });
      } catch (error) {
        console.error("Error ensuring upload directory exists:", error);
        return res.status(500).json({ message: "Failed to ensure upload directory exists", error: String(error) });
      }

      const resumeFileName = `${req.user!.id}-${Date.now()}${path.extname(req.file.originalname)}`;
      const resumePath = path.join(uploadDir, resumeFileName);

      try {
        await fs.rename(req.file.path, resumePath);
        const resumeUrl = `/uploads/resumes/${resumeFileName}`;

        const parsed = insertApplicationSchema.safeParse({
          jobId,
          seekerId: req.user!.id,
          resumeUrl,
          coverLetter: coverLetter || null,
          status: "pending",
        });

        if (!parsed.success) {
          await fs.unlink(resumePath);
          return res.status(400).json(parsed.error);
        }

        const atsScore = await calculateATSScore(job, { ...parsed.data, seekerId: req.user!.id });
        const application = await storage.createApplication({
          ...parsed.data,
          appliedAt: new Date(),
          interviewDate: null,
          atsScore, // Store ATS score on creation
        });

        res.status(201).json(application);
      } catch (error) {
        console.error("Error submitting application:", error);
        try {
          await fs.unlink(resumePath);
        } catch (unlinkError) {
          console.error("Error cleaning up file:", unlinkError);
        }
        res.status(500).json({ message: "Internal Server Error", error: String(error) });
      } finally {
        if (req.file && await fs.access(req.file.path).then(() => true).catch(() => false)) {
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            console.error("Error cleaning up temporary file:", unlinkError);
          }
        }
      }
    }
  );

  app.get("/api/applications/employer", isAuthenticated,
    restrictTo("employer"),async (req, res) => {

    const { jobId } = req.query;

    try {
      let applications = await storage.getApplicationsByEmployer(req.user!.id);

      if (jobId) {
        applications = applications.filter((app) => app.jobId === Number(jobId));
      }

      const job = jobId ? await storage.getJobById(Number(jobId)) : null;
      if (job) {
        const scoredApplications = await Promise.all(
          applications.map(async (app) => ({
            ...app,
            atsScore: app.atsScore ?? await calculateATSScore(job, app), // Use cached score if available
          }))
        );
        applications = scoredApplications.filter(app => app.atsScore >= 20);
      }

      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  app.get("/api/applications/seeker", isAuthenticated,
    restrictTo("seeker"),async (req, res) => {

    try {
      const applications = await storage.getApplicationsBySeeker(req.user!.id);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching seeker applications:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.patch("/api/applications/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || !req.user || req.user.role !== "employer") {
      return res.sendStatus(403);
    }
  
    const applicationId = Number(req.params.id);
    if (isNaN(applicationId)) {
      return res.status(400).json({ message: "Invalid application ID" });
    }
  
    const { status } = req.body;
    if (!["accepted", "rejected", "hired", "interview"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
  
    try {
      // Fetch the application to check if it belongs to a job posted by the employer
      const application = await storage.getApplicationById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
  
      // Fetch the job to verify the employer owns it
      const job = await storage.getJobById(application.jobId);
      if (!job || job.employerId !== req.user.id) {
        return res.status(403).json({ message: "You are not authorized to update this application" });
      }
  
      console.log("Updating application status to:", status); // Debug log
      console.log("Current application status:", application.status); // Debug log
  
      // Update the application status
      const updatedApplication = await storage.updateApplicationStatus(applicationId, status);
  
      console.log("Updated application:", updatedApplication); // Debug log
  
      // Fetch the enriched application data (with seekerName and jobTitle)
      const enrichedApplication = await storage.getApplicationWithDetails(applicationId);
  
      res.json(enrichedApplication);
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  app.get("/api/applications/stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "employer") {
      return res.sendStatus(403);
    }
  
    try {
      const applications = await storage.getApplicationsByEmployer(req.user.id);
  
      const stats = {
        totalApplications: applications.length,
        shortlisted: applications.filter((app) => app.status === "accepted").length,
        interviewsScheduled: applications.filter((app) => app.status === "interview").length,
        hired: applications.filter((app) => app.status === "hired").length,
      };
  
      res.json(stats);
    } catch (error) {
      console.error("Error fetching application stats:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/applications", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "employer") {
      return res.sendStatus(403);
    }

    const { status } = req.query;

    try {
      let applications = await storage.getApplicationsByEmployer(req.user.id);

      if (status && status !== "all") {
        applications = applications.filter((app) => app.status === status);
      }

      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  app.patch("/api/applications/:id/schedule", async (req, res) => {
    if (!req.isAuthenticated() || !req.user || req.user.role !== "employer") {
      return res.sendStatus(403);
    }
  
    const applicationId = Number(req.params.id);
    if (isNaN(applicationId)) {
      return res.status(400).json({ message: "Invalid application ID" });
    }
  
    const { interviewDate } = req.body;
    if (!interviewDate) {
      return res.status(400).json({ message: "Interview date is required" });
    }
  
    try {
      // Fetch the application to check if it belongs to a job posted by the employer
      const application = await storage.getApplicationById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
  
      // Fetch the job to verify the employer owns it
      const job = await storage.getJobById(application.jobId);
      if (!job || job.employerId !== req.user.id) {
        return res.status(403).json({ message: "You are not authorized to schedule an interview for this application" });
      }
  

  
      // Update the application with the interview date and set status to "interview"
      const updatedApplication = await storage.updateApplicationInterviewDate(applicationId, interviewDate);
  
      console.log("Updated application:", updatedApplication); // Debug log
  
      // Fetch the enriched application data (with seekerName and jobTitle)
      const enrichedApplication = await storage.getApplicationWithDetails(applicationId);
  
      res.json(enrichedApplication);
    } catch (error) {
      console.error("Error scheduling interview:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  app.get("/api/applications/export", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "employer") {
      return res.sendStatus(403);
    }
  
    try {
      const applications = await storage.getApplicationsByEmployer(req.user.id);
  
      const csv = [
        ["ID", "Job Title", "Candidate Name", "Status", "Applied At", "Interview Date"],
        ...applications.map((app) => [
          app.id,
          app.jobTitle,
          app.seekerName,
          app.status,
          app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "N/A",
          app.interviewDate ? new Date(app.interviewDate).toLocaleDateString() : "N/A",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");
  
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=applications.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting applications:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/analytics", async (req, res) => {
    if (!req.isAuthenticated() || !req.user || req.user.role !== "employer") {
      return res.sendStatus(403);
    }

    const days = Number(req.query.days) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const applications = await storage.getApplicationsByEmployer(req.user.id);
      const jobs = await storage.getJobsByEmployer(req.user.id);

      const filteredApplications = applications.filter((app) => {
        const appliedDate = app.appliedAt ? new Date(app.appliedAt) : new Date();
        return appliedDate >= cutoffDate;
      });
      const totalViews = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobViews)
      .where(inArray(schema.jobViews.jobId, jobs.map((job) => job.id)))
      .then((res) => res[0]?.count || 0);


      const statusDistribution = {
        pending: filteredApplications.filter(app => app.status === "pending").length,
        accepted: filteredApplications.filter(app => app.status === "accepted").length,
        rejected: filteredApplications.filter(app => app.status === "rejected").length,
        interview: filteredApplications.filter(app => app.status === "interview").length,
        hired: filteredApplications.filter(app => app.status === "hired").length,
      };
      const hiredApps = filteredApplications.filter(app => app.status === "hired");
          const avgTimeToHire = hiredApps.length > 0
            ? hiredApps.reduce((sum, app) => {
                const appliedDate = app.appliedAt ? new Date(app.appliedAt) : new Date();
                const hiredDate = app.interviewDate ? new Date(app.interviewDate) : new Date();
                return sum + (hiredDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24);
              }, 0) / hiredApps.length
            : 0;
      const trends = Array.from({ length: days }, (_, i) => {
        const date = new Date(cutoffDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        return {
          date: dateStr,
          applications: filteredApplications.filter((app) => {
            const appliedDate = app.appliedAt ? new Date(app.appliedAt) : new Date();
            return appliedDate.toISOString().split('T')[0] === dateStr;
          }).length,
        };
      });

      
      res.json({
        totalApplications: filteredApplications.length,
        views: totalViews, // Replace shortlisted with views
        interviewsScheduled: filteredApplications.filter(app => app.status === "interview").length,
        hired: filteredApplications.filter(app => app.status === "hired").length,
        avgTimeToHire: Math.round(avgTimeToHire), // Placeholder, update if needed
        conversionRate: filteredApplications.length > 0 
          ? Number(((filteredApplications.filter(app => app.status === "hired").length / filteredApplications.length) * 100).toFixed(1))
          : 0,
        trends,
        jobCount: jobs.length,
        statusDistribution,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  
  });



  app.post("/api/jobs/:id/view", async (req, res) => {
    const jobId = Number(req.params.id);
    if (isNaN(jobId)) return res.status(400).json({ message: "Invalid job ID" });
  
    try {
      const job = await storage.getJobById(jobId);
      if (!job) return res.sendStatus(404);
  
      const userId = req.user?.id;
      if (userId) {
        // Check if the user has already viewed the job
        const existingView = await db
          .select()
          .from(schema.jobViews)
          .where(and(eq(schema.jobViews.jobId, jobId), eq(schema.jobViews.userId, userId)))
          .limit(1);
  
        if (existingView.length === 0) {
          // Insert a new view record
          await db.insert(schema.jobViews).values({
            jobId,
            userId,
            viewedAt: new Date(),
          });
        }
      }
  
      // Fetch the total number of unique views for this job
      const totalViews = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.jobViews)
        .where(eq(schema.jobViews.jobId, jobId))
        .then((res) => res[0]?.count || 0);
  
      res.status(200).json({ message: "View recorded", views: totalViews });
    } catch (error) {
      console.error("Error recording job view:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/jobs/:id/has-applied", async (req, res) => {
    if (!req.isAuthenticated() || !req.user || req.user.role !== "seeker") {
      return res.sendStatus(403);
    }
  
    const jobId = Number(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }
  
    try {
      const applications = await storage.getApplicationsBySeeker(req.user.id);
      const hasApplied = applications.some((app) => app.jobId === jobId);
      res.json({ hasApplied });
    } catch (error) {
      console.error("Error checking application status:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  app.post("/api/applications/send-sms", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "employer") {
      return res.sendStatus(403);
    }
  
    const { jobId } = req.body;
  
    try {
      let applications = await storage.getAcceptedApplicationsByEmployer(req.user.id);
      if (jobId) {
        applications = applications.filter((app) => app.jobId === Number(jobId));
      }
      if (!applications.length) {
        return res.status(404).json({ message: "No accepted applicants found" });
      }
  
      const validApplications = applications.filter((app) => app.phoneNum);
      if (!validApplications.length) {
        return res.status(400).json({ message: "No accepted applicants have phone numbers" });
      }
  
      const messages = validApplications.map((app) => {
        const message = `Dear ${app.seekerName}, you have been shortlisted for ${app.jobTitle}.`;
        // For demo: Replace app.phoneNum with a verified number or log instead
        const demoPhoneNumber = "+12345678901"; // Replace with your verified number
        console.log(`Simulating SMS to ${app.phoneNum || demoPhoneNumber}: ${message}`);
        
        // Uncomment to send real SMS in trial mode (costs trial credits)
        return client.messages.create({
          body: message,
          from: "+15172003432", // e.g., +12345678901 from Twilio
          to:"+251904859055", // Use a verified number for demo
        });
        
        // For pure simulation without sending, comment the above and use:
        // return Promise.resolve({ sid: "SIMULATED_SID", to: app.phoneNum, body: message });
      });
  
      const results = await Promise.all(messages);
      res.json({
        message: `SMS sent to ${validApplications.length} accepted applicants`,
        results, // Optional: Return Twilio response for debugging
      });
    } catch (error) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ message: "Failed to send SMS" });
    }
  });

  // Add Branding Endpoints
app.get("/api/employer/branding", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "employer") {
    return res.sendStatus(403);
  }

  const employerId = req.user.id;

  try {
    const user = await storage.getUser(employerId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const brandingData = {
      companyName: user.companyName,
      industry: user.industry,
      website: user.website,
      about: user.companyDescription,
      culture: user.culture,
      benefits: user.benefits,
      logoUrl: user.logoUrl,
      officePhotos: user.officePhotos || [],
      companySize: user.companySize,
      location: user.location,
      founded: user.founded,
    };

    res.json(brandingData);
  } catch (error) {
    console.error("Error fetching branding data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post(
  "/api/employer/branding",
  brandingUpload.fields([
    { name: "logo", maxCount: 1 }, // Allow 1 logo file
    { name: "officePhotos", maxCount: 10 }, // Allow up to 10 office photos
  ]),
  async (req: any, res) => {
    if (!req.isAuthenticated() || req.user.role !== "employer") {
      return res.sendStatus(403);
    }

    const employerId = req.user.id;
    const { companyName, industry, website, about, culture, benefits, companySize, location, founded } = req.body;

    try {
      // Ensure the branding upload directories exist
      const logoUploadDir = path.join(__dirname, "../uploads/branding/logo");
      const officePhotosUploadDir = path.join(__dirname, "../uploads/branding/officephoto");

      await fs.access(logoUploadDir).catch(async () => {
        console.log(`Directory ${logoUploadDir} does not exist, creating it...`);
        await fs.mkdir(logoUploadDir, { recursive: true });
        console.log(`Directory ${logoUploadDir} created successfully`);
      });

      await fs.access(officePhotosUploadDir).catch(async () => {
        console.log(`Directory ${officePhotosUploadDir} does not exist, creating it...`);
        await fs.mkdir(officePhotosUploadDir, { recursive: true });
        console.log(`Directory ${officePhotosUploadDir} created successfully`);
      });

      // Handle logo file upload
      const logoFile = req.files["logo"] ? req.files["logo"][0] : null;
      let logoUrl: string | null = null;

      if (logoFile) {
        const logoFileName = `${employerId}-logo-${Date.now()}${path.extname(logoFile.originalname)}`;
        const logoPath = path.join(logoUploadDir, logoFileName);
        await fs.rename(logoFile.path, logoPath);
        logoUrl = `/uploads/branding/logo/${logoFileName}`;
      }

      // Handle office photos upload
      const officePhotosFiles = req.files["officePhotos"] ? req.files["officePhotos"] : [];
      const officePhotos: string[] = [];

      for (const file of officePhotosFiles) {
        const photoFileName = `${employerId}-office-${Date.now()}${path.extname(file.originalname)}`;
        const photoPath = path.join(officePhotosUploadDir, photoFileName);
        await fs.rename(file.path, photoPath);
        officePhotos.push(`/uploads/branding/officephoto/${photoFileName}`);
      }

      // Update the user's branding data in the database
      const updatedUser = await db.update(schema.users)
        .set({
          companyName,
          industry,
          website,
          companyDescription: about,
          culture,
          benefits,
          logoUrl,
          officePhotos,
          companySize,
          location,
          founded,
        })
        .where(eq(schema.users.id, employerId))
        .returning();

      res.json(updatedUser[0]);
    } catch (error) {
      console.error("Error updating branding data:", error);

      // Clean up uploaded files if an error occurs
      if (req.files) {
        for (const file of req.files["logo"] || []) {
          await fs.unlink(file.path).catch((err) => {
            console.error("Error cleaning up logo file:", err);
          });
        }
        for (const file of req.files["officePhotos"] || []) {
          await fs.unlink(file.path).catch((err) => {
            console.error("Error cleaning up office photo file:", err);
          });
        }
      }

      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);
// ***********************************************
// Settings
// ***********************************************

app.patch(
    "/api/settings/notifications",async (req, res) => {
      const { newApplications, emailDigest } = req.body;
      console.log("Notifications update request:", { newApplications, emailDigest, userId: req.user!.id });
      try {
        const updates: Partial<schema.User> = {};
        if (newApplications !== undefined) updates.newApplicationsNotification = newApplications;
        if (emailDigest !== undefined) updates.emailDigestNotification = emailDigest;

        const updatedUser = await db
          .update(schema.users)
          .set(updates)
          .where(eq(schema.users.id, req.user!.id))
          .returning();
        console.log("Updated user notifications:", updatedUser[0]);
        res.json(updatedUser[0]);
      } catch (error) {
        console.error("Error updating notifications:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.patch(
      "/api/settings/profile",isAuthenticated,
      restrictTo("employer"),async (req, res) => {
        const { companyName, email, phoneNumber } = req.body;
        console.log("Profile update request:", { companyName, email, phoneNumber, userId: req.user!.id });
        try {
          const updatedUser = await db
            .update(schema.users)
            .set({ companyName, email, phone: phoneNumber }) // Changed phoneNumber to phone to match schema
            .where(eq(schema.users.id, req.user!.id))
            .returning();
          console.log("Updated user:", updatedUser[0]);
          res.json(updatedUser[0]);
        } catch (error) {
          console.error("Error updating profile:", error);
          res.status(500).json({ message: "Internal Server Error" });
        }
      });

      app.patch(
        "/api/settings/security/password",isAuthenticated,
        restrictTo("employer"),async (req,res) => {
          const { newPassword } = req.body;
          console.log("Password change request for user:", req.user!.id);
          try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const updatedUser = await db
              .update(schema.users)
              .set({ password: hashedPassword })
              .where(eq(schema.users.id, req.user!.id))
              .returning();
            console.log("Password updated for user:", updatedUser[0].id);
            res.json({ message: "Password updated successfully" });
          } catch (error) {
            console.error("Error changing password:", error);
            res.status(500).json({ message: "Internal Server Error" });
          }
        });
    
      app.post(
        "/api/settings/billing/verify",isAuthenticated,
        restrictTo("employer"),
        upload.single("screenshot"),async (req,res) => {
          const { plan } = req.body as { plan: keyof typeof plans };
          const file = (req as any).file;
    
          console.log("Billing verify request:", { plan, file: file?.originalname, userId: req.user!.id });
          if (!file || !plan) {
            console.log("Missing screenshot or plan");
            return res.status(400).json({ message: "Screenshot and plan are required" });
          }
    
          if (!(plan in plans)) {
            console.log("Invalid plan:", plan);
            return res.status(400).json({ message: "Invalid plan" });
          }
    
          try {
            const paymentDir = path.join(__dirname, "../uploads/payments");
            await fs.access(paymentDir).catch(() => fs.mkdir(paymentDir, { recursive: true }));
    
            const fileName = `${req.user!.id}-${Date.now()}${path.extname(file.originalname)}`;
            const filePath = path.join(paymentDir, fileName);
            await fs.rename(file.path, filePath);
    
            const screenshotUrl = `/uploads/payments/${fileName}`;
            console.log("Saving subscription with screenshot:", screenshotUrl);
    
            await db.insert(schema.subscriptions).values({
              userId: req.user!.id,
              plan,
              price: plans[plan] * 100,
              screenshotUrl,
              status: "pending",
              username: req.user!.username,
              email: req.user!.email,
            });
    
            res.json({ message: "Payment screenshot submitted for verification" });
          } catch (error) {
            console.error("Error submitting payment:", error);
            res.status(500).json({ message: "Internal Server Error" });
          }
        });
    
        app.patch("/api/admin/subscriptions/:id/verify", isAuthenticated, restrictTo("admin"), async (req, res) => {
          const subscriptionId = Number(req.params.id);
          const { status } = req.body as { status: "active" | "rejected" };
        
          const subscription = await db
            .update(schema.subscriptions)
            .set({ status, updatedAt: new Date() })
            .where(eq(schema.subscriptions.id, subscriptionId))
            .returning()
            .then((res) => res[0]);
        
          if (!subscription) {
            return res.status(404).json({ message: "Subscription not found" });
          }
        
          if (status === "active") {
            await db
              .update(schema.users)
              .set({ currentPlan: subscription.plan, planPrice: subscription.price / 100 })
              .where(eq(schema.users.id, subscription.userId));
          }
        
          res.json(subscription);
        });
        app.get(
          "/api/settings",async (req, res) => {
            const user = await storage.getUser(req.user!.id);
            if (!user) {
              console.log("User not found for ID:", req.user!.id);
              return res.status(404).json({ message: "User not found" });
            }
            console.log("Fetched user:", user);
      
            const subscription = await db
              .select()
              .from(schema.subscriptions)
              .where(eq(schema.subscriptions.userId, req.user!.id))
              .limit(1)
              .then((res) => res[0]);
            console.log("Fetched subscription:", subscription);
      
            res.json({
              companyName: user.companyName,
              email: user.email,
              phoneNumber: user.phone, // Fixed to match schema (phone, not phoneNumber)
              notifications: {
                newApplications: user.newApplicationsNotification || false,
                emailDigest: user.emailDigestNotification || false,
              },
              currentPlan: user.currentPlan || "free",
              price: user.planPrice || 0,
              paymentStatus: subscription?.status || "inactive",
            });
          });

          app.get("/api/admin/subscriptions", isAuthenticated, restrictTo("admin"), async (req, res) => {
            try {
              const subscriptions = await db.select().from(schema.subscriptions);
              console.log("Sending subscriptions:", subscriptions);
              res.json(subscriptions);
            } catch (error) {
              console.error("Error fetching subscriptions:", error);
              res.status(500).json({ message: "Internal Server Error" });
            }
          });

          // Add this endpoint inside registerRoutes
          app.post(
            "/api/profile/update",
            isAuthenticated,
            profileImageUpload.fields([
              { name: "resume", maxCount: 1 },
              { name: "profileImage", maxCount: 1 },
            ]), // Handle both resume and profile image
            async (req: any, res) => {
              const userId = req.user!.id;
              const { skills, bio, location, education, experience, phone, email } = req.body;
              const files = req.files as { resume?: Express.Multer.File[]; profileImage?: Express.Multer.File[] };
          
              try {
                // Handle resume upload
                let resumeUrl: string | undefined;
                if (files?.resume?.[0]) {
                  const uploadDir = path.join(__dirname, "../uploads/resumes");
                  await fs.access(uploadDir).catch(() => fs.mkdir(uploadDir, { recursive: true }));
                  const resumeFileName = `${userId}-resume-${Date.now()}${path.extname(files.resume[0].originalname)}`;
                  const resumePath = path.join(uploadDir, resumeFileName);
                  await fs.rename(files.resume[0].path, resumePath);
                  resumeUrl = `/uploads/resumes/${resumeFileName}`;
                }
          
                // Handle profile image upload
                let profileImageUrl: string | undefined;
                if (files?.profileImage?.[0]) {
                  const uploadDir = path.join(__dirname, "../uploads/profilepic");
                  await fs.access(uploadDir).catch(() => fs.mkdir(uploadDir, { recursive: true }));
                  const imageFileName = `${userId}-profile-${Date.now()}${path.extname(files.profileImage[0].originalname)}`;
                  const imagePath = path.join(uploadDir, imageFileName);
                  await fs.rename(files.profileImage[0].path, imagePath);
                  profileImageUrl = `/uploads/profilepic/${imageFileName}`;
                }
          
                // Parse skills, education, and experience
                const parsedSkills = skills
                  ? typeof skills === "string"
                    ? skills.split(",").map((s: string) => s.trim())
                    : Array.isArray(skills)
                    ? skills
                    : undefined
                  : undefined;
          
                const parsedEducation = education
                  ? typeof education === "string"
                    ? JSON.parse(education)
                    : education
                  : undefined;
          
                const parsedExperience = experience
                  ? typeof experience === "string"
                    ? JSON.parse(experience)
                    : experience
                  : undefined;
          
                // Prepare updates
                const updates: Partial<typeof users.$inferSelect> = {};
                if (resumeUrl) updates.resumeUrl = resumeUrl;
                if (profileImageUrl) updates.profileImageUrl = profileImageUrl;
                if (parsedSkills) updates.skills = parsedSkills;
                if (bio) updates.bio = bio;
                if (location) updates.location = location;
                if (parsedEducation) updates.education = parsedEducation;
                if (parsedExperience) updates.experience = parsedExperience;
                if (phone) updates.phone = phone;
                if (email) updates.email = email;
          
                if (Object.keys(updates).length === 0) {
                  return res.status(400).json({ message: "No updates provided" });
                }
          
                const updatedUser = await db
                  .update(users)
                  .set(updates)
                  .where(eq(users.id, userId))
                  .returning();
          
                if (!updatedUser[0]) {
                  return res.status(404).json({ message: "User not found" });
                }
          
                res.json({
                  message: "Profile updated successfully",
                  user: {
                    resumeUrl: updatedUser[0].resumeUrl,
                    profileImageUrl: updatedUser[0].profileImageUrl,
                    skills: updatedUser[0].skills,
                    bio: updatedUser[0].bio,
                    location: updatedUser[0].location,
                    education: updatedUser[0].education,
                    experience: updatedUser[0].experience,
                    phone: updatedUser[0].phone,
                    email: updatedUser[0].email,
                  },
                });
              } catch (error) {
                console.error("Error updating profile:", error);
                if (files?.resume?.[0]) await fs.unlink(files.resume[0].path).catch(() => {});
                if (files?.profileImage?.[0]) await fs.unlink(files.profileImage[0].path).catch(() => {});
                res.status(500).json({ message: "Internal Server Error" });
              }
            }
          );

          app.get("/api/profile/resume", isAuthenticated,restrictTo('seeker'), async (req, res) => {
            const userId = req.user!.id;
          
            try {
              // Check users table first
              const user = await storage.getUser(userId);
              if (user?.resumeUrl) {
                return res.json({ resumeUrl: user.resumeUrl, source: "profile" });
              }
          
              // If no resume in users table, check applications table
              const latestApplication = await db
                .select({ resumeUrl: schema.applications.resumeUrl })
                .from(schema.applications)
                .where(eq(schema.applications.seekerId, userId))
                .orderBy(sql`${schema.applications.appliedAt} DESC`)
                .limit(1);
          
              if (latestApplication.length > 0 && latestApplication[0].resumeUrl) {
                return res.json({ resumeUrl: latestApplication[0].resumeUrl, source: "application" });
              }
          
              res.json({ resumeUrl: null, source: "none" });
            } catch (error) {
              console.error("Error fetching resume:", error);
              res.status(500).json({ message: "Internal Server Error" });
            }
          });
          // Add this endpoint inside registerRoutes
   app.get("/api/profile/me",isAuthenticated,restrictTo('seeker'),  async (req, res) => {

  try {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return seeker-specific profile data
    const profileData = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      bio: user.bio,
      location: user.location,
      resumeUrl: user.resumeUrl,
      profileImageUrl: user.profileImageUrl,
      skills: user.skills,
      education: user.education,
      experience: user.experience,
      phone: user.phone,
    };

    res.json(profileData);
  } catch (error) {
    console.error("Error fetching seeker profile data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Fetch all job alerts for the authenticated user
app.get("/api/job-alerts", isAuthenticated, restrictTo("seeker"), async (req, res) => {
  try {
    const alerts = await db
      .select()
      .from(schema.jobAlerts)
      .where(eq(schema.jobAlerts.userId, req.user!.id));
    res.json(alerts);
  } catch (error) {
    console.error("Error fetching job alerts:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Create a new job alert
app.post("/api/job-alerts", isAuthenticated, restrictTo("seeker"), async (req, res) => {
  const parsed = insertJobAlertSchema.safeParse({
    ...req.body,
    userId: req.user!.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  try {
    const [newAlert] = await db
      .insert(schema.jobAlerts)
      .values(parsed.data)
      .returning();
    res.status(201).json(newAlert);
  } catch (error) {
    console.error("Error creating job alert:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// Add this endpoint in your registerRoutes function
app.patch("/api/job-alerts/:id", isAuthenticated, restrictTo("seeker"), async (req, res) => {
  const alertId = Number(req.params.id);
  if (isNaN(alertId)) {
    return res.status(400).json({ message: "Invalid alert ID" });
  }

  const parsed = insertJobAlertSchema.partial().safeParse({
    ...req.body,
    userId: req.user!.id,
    updatedAt: new Date(),
  });

  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  try {
    const [updatedAlert] = await db
      .update(schema.jobAlerts)
      .set(parsed.data)
      .where(and(eq(schema.jobAlerts.id, alertId), eq(schema.jobAlerts.userId, req.user!.id)))
      .returning();
    
    if (!updatedAlert) {
      return res.status(404).json({ message: "Job alert not found or not authorized" });
    }

    res.json(updatedAlert);
  } catch (error) {
    console.error("Error updating job alert:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }

});
app.delete("/api/job-alerts/:id", isAuthenticated, restrictTo("seeker"), async (req, res) => {
  const alertId = Number(req.params.id);
  if (isNaN(alertId)) {
    return res.status(400).json({ message: "Invalid alert ID" });
  }

  try {
    const [deletedAlert] = await db
      .delete(schema.jobAlerts)
      .where(and(eq(schema.jobAlerts.id, alertId), eq(schema.jobAlerts.userId, req.user!.id)))
      .returning();

    if (!deletedAlert) {
      return res.status(404).json({ message: "Job alert not found or not authorized" });
    }

    res.json({ message: "Job alert deleted successfully" });
  } catch (error) {
    console.error("Error deleting job alert:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Add this inside registerRoutes function, after other endpoints
app.get("/api/companies", async (req, res) => {
  try {
    // Get search query if provided
    const searchQuery = req.query.search?.toString().toLowerCase();

    // Base query to get employers and their aggregated review data
    const companiesQuery = db
      .select({
        id: schema.users.id,
        companyName: schema.users.companyName,
        industry: schema.users.industry,
        companySize: schema.users.companySize,
        logoUrl: schema.users.logoUrl,
        avgRating: sql<number>`AVG(${schema.companyReviews.rating})`,
        reviewCount: sql<number>`COUNT(${schema.companyReviews.id})`,
        recentReview: sql<string>`MAX(${schema.companyReviews.review})`,
        recentPosition: sql<string>`MAX(${schema.companyReviews.position})`,
      })
      .from(schema.users)
      .leftJoin(schema.companyReviews, eq(schema.users.id, schema.companyReviews.companyId))
      .where(eq(schema.users.role, "employer"))
      .groupBy(
        schema.users.id,
        schema.users.companyName,
        schema.users.industry,
        schema.users.companySize,
        schema.users.logoUrl
      );

    // Apply search filter if provided
    let companies = await (searchQuery
      ? companiesQuery.where(sql`LOWER(${schema.users.companyName}) LIKE ${`%${searchQuery}%`}`)
      : companiesQuery);

    // Fetch salary range data from jobs for each company
    const companiesWithDetails = await Promise.all(
      companies.map(async (company: { id: number | SQLWrapper; companyName: any; industry: any; companySize: any; logoUrl: any; avgRating: number; reviewCount: any; recentReview: any; recentPosition: any; }) => {
        const jobs = await db
          .select({
            salary: schema.jobs.salary,
          })
          .from(schema.jobs)
          .where(eq(schema.jobs.employerId, company.id));

        const salaries = jobs
          .map((job) => {
            const match = job.salary.match(/(\d+\.?\d*)/g);
            return match ? match.map(Number) : [];
          })
          .flat()
          .filter((n) => !isNaN(n));

        const minSalary = salaries.length > 0 ? Math.min(...salaries) : null;
        const maxSalary = salaries.length > 0 ? Math.max(...salaries) : null;

        return {
          id: company.id,
          companyName: company.companyName || "Unknown",
          industry: company.industry || "Not specified",
          companySize: company.companySize || "Not specified",
          logoUrl: company.logoUrl,
          avgRating: company.avgRating ? Number(company.avgRating.toFixed(1)) : 0,
          reviewCount: company.reviewCount || 0,
          recentReview: company.recentReview || "No reviews yet",
          recentPosition: company.recentPosition || "Unknown",
          salaryRange: minSalary && maxSalary ? `${minSalary}k - ${maxSalary}k` : "Not available",
        };
      })
    );

    res.json(companiesWithDetails);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Add endpoint for individual company profile
app.get("/api/companies/:id", async (req, res) => {
  const companyId = Number(req.params.id);
  if (isNaN(companyId)) {
    return res.status(400).json({ message: "Invalid company ID" });
  }

  try {
    const company = await db
      .select({
        id: schema.users.id,
        companyName: schema.users.companyName,
        industry: schema.users.industry,
        companySize: schema.users.companySize,
        logoUrl: schema.users.logoUrl,
        website: schema.users.website,
        companyDescription: schema.users.companyDescription,
        benefits: schema.users.benefits,
        culture: schema.users.culture,
        location: schema.users.location,
      })
      .from(schema.users)
      .where(and(eq(schema.users.id, companyId), eq(schema.users.role, "employer")))
      .limit(1)
      .then((res) => res[0]);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const reviews = await db
      .select({
        rating: schema.companyReviews.rating,
        review: schema.companyReviews.review,
        position: schema.companyReviews.position,
        createdAt: schema.companyReviews.createdAt,
      })
      .from(schema.companyReviews)
      .where(eq(schema.companyReviews.companyId, companyId))
      .orderBy(sql`${schema.companyReviews.createdAt} DESC`);

    const jobs = await db
      .select({
        id: schema.jobs.id,
        title: schema.jobs.title,
        salary: schema.jobs.salary,
        type: schema.jobs.type,
      })
      .from(schema.jobs)
      .where(eq(schema.jobs.employerId, companyId));

    res.json({
      ...company,
      reviews,
      jobs,
    });
  } catch (error) {
    console.error("Error fetching company details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
  const httpServer = createServer(app);
  return httpServer;
}


