import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertJobSchema, insertApplicationSchema } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
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
import fuzzy from "fuzzy";
const client = twilio("AC8d161734a4954ca405a103aa3f540a15", "4197f3e95b9f077e01333855b9197ce1"); // Replace with your Twilio credentials

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Rate limiting to prevent abuse
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per window
//   message: "Too many requests from this IP, please try again later.",
// });

// Configure multer for file uploads

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});
const skillsDictionary: { [key: string]: string } = {
  "js": "javascript",
  "javascript": "javascript",
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
  // Add more mappings as needed
};

const normalizeSkill = (skill: string) => skillsDictionary[skill.toLowerCase()] || skill.toLowerCase();

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
    const dateMatch = line.match(/(\d{4})\s*-\s*(\d{4}|present)/i);
    let years = 0;
    if (dateMatch) {
      const startYear = parseInt(dateMatch[1], 10);
      const endYear = dateMatch[2] === "present" ? new Date().getFullYear() : parseInt(dateMatch[2], 10);
      years = endYear - startYear;
    }
    return { title, years: Math.max(years, 0) };
  });

  return { skills: skills || [], experience };
}

// Enhanced ATS Scoring Function
async function calculateATSScore(job: schema.Job, application: Partial<schema.Application> & { seekerId: number; resumeUrl: string }): Promise<number>{
  try {
    if (application.atsScore !== undefined && application.atsScore !== null) return application.atsScore;

    const resumeData = await extractResumeData(application.resumeUrl);
    const seeker = await db.select().from(schema.users).where(eq(schema.users.id, application.seekerId)).limit(1).then(res => res[0]);

    const jobSkills = (job.skills || []).map(normalizeSkill); // Already safe with || []
    const jobRequirements = (job.requirements || []).map(r => r.toLowerCase());
    const jobExperienceLevel = job.experienceLevel?.toLowerCase();
    const jobContext = job.description.toLowerCase().match(/(software|marketing|finance|engineering)/)?.[0] || "";
    const isTechnical = job.title.toLowerCase().includes("engineer") || (job.skills?.length ?? 0) > 5; // Fixed line

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

    const skillMatches = jobSkills.filter(jobSkill => 
      allSeekerSkills.some(seekerSkill => fuzzy.test(jobSkill, seekerSkill))
    ).length;
    const skillScore = jobSkills.length > 0 ? (skillMatches / jobSkills.length) * 50 : 0;
    score += skillScore * (weights.skills / 50);

    const totalExperienceYears = resumeExperience.reduce((sum, exp) => sum + exp.years, 0) +
      seekerExperience.reduce((sum, exp) => {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
      }, 0);
    const targetYears = jobExperienceLevel === "senior" ? 5 : jobExperienceLevel === "mid" ? 2 : 0;
    const experienceMatch = Math.max(30 - Math.abs(totalExperienceYears - targetYears) * 5, 10);
    score += experienceMatch * (weights.experience / 30);

    const requirementMatches = jobRequirements.filter(req => {
      const resumeMatch = resumeExperience.some(exp => exp.title.toLowerCase().includes(req));
      const seekerMatch = seekerExperience.some(exp => exp.title.toLowerCase().includes(req));
      return resumeMatch || seekerMatch;
    }).length;
    const requirementScore = jobRequirements.length > 0 ? (requirementMatches / jobRequirements.length) * 20 : 0;
    score += requirementScore * (weights.requirements / 20);

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
// Skills normalization dictionary

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.use(cors()); // Enable CORS
  // app.use(limiter); // Apply rate limiting

  setupAuth(app);

  // Serve uploaded files statically
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // Jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    if (!req.isAuthenticated() || !req.user || req.user.role !== "employer") {
      console.log("Unauthorized request.");
      return res.sendStatus(403);
    }

    const parsed = insertJobSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("Validation Error:", parsed.error); // Log the error
      return res.status(400).json(parsed.error);
    }

    try {
      const job = await storage.createJob({
        ...parsed.data,
        employerId: req.user.id,
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
  });

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
    upload.single("resume"),
    async (req: MulterRequest, res) => {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "seeker") {
        return res.sendStatus(403);
      }

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

      const resumeFileName = `${req.user.id}-${Date.now()}${path.extname(req.file.originalname)}`;
      const resumePath = path.join(uploadDir, resumeFileName);

      try {
        await fs.rename(req.file.path, resumePath);
        const resumeUrl = `/uploads/resumes/${resumeFileName}`;

        const parsed = insertApplicationSchema.safeParse({
          jobId,
          seekerId: req.user.id,
          resumeUrl,
          coverLetter: coverLetter || null,
          status: "pending",
        });

        if (!parsed.success) {
          await fs.unlink(resumePath);
          return res.status(400).json(parsed.error);
        }

        const atsScore = await calculateATSScore(job, { ...parsed.data, seekerId: req.user.id });
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

  app.get("/api/applications/employer", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "employer") {
      return res.sendStatus(403);
    }

    const { jobId } = req.query;

    try {
      let applications = await storage.getApplicationsByEmployer(req.user.id);

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
  app.get("/api/applications/seeker", async (req, res) => {
    if (!req.isAuthenticated() || !req.user || req.user.role !== "seeker") {
      return res.sendStatus(403);
    }

    try {
      const applications = await storage.getApplicationsBySeeker(req.user.id);
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
  const httpServer = createServer(app);
  return httpServer;
}


