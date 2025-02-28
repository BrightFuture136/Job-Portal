import type { Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertJobSchema, insertApplicationSchema } from "@shared/schema";

// // Rate limiting to prevent abuse
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per window
//   message: "Too many requests from this IP, please try again later.",
// });

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cors()); // Enable CORS
  // app.use(limiter); // Apply rate limiting

  setupAuth(app);

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
  app.post("/api/jobs/:id/apply", async (req, res) => {
    if (!req.isAuthenticated() || !req.user || req.user.role !== "seeker") {
      return res.sendStatus(403);
    }

    const jobId = Number(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    // Check if the job exists
    const job = await storage.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const parsed = insertApplicationSchema.safeParse({
      ...req.body,
      jobId,
      seekerId: req.user.id,
      status: "pending",
    });

    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      const application = await storage.createApplication({
        ...parsed.data,
        appliedAt: new Date(),
        coverLetter: parsed.data.coverLetter ?? null,
        interviewDate: new Date(),
      });

      res.status(201).json(application);
    } catch (error) {
      console.error("Error submitting application:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/applications/employer", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "employer") {
      return res.sendStatus(403);
    }
  
    const { jobId } = req.query; // Get the jobId from query params
  
    try {
      let applications = await storage.getApplicationsByEmployer(req.user.id);
  
      // Filter applications by jobId if provided
      if (jobId) {
        applications = applications.filter((app) => app.jobId === Number(jobId));
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

  // New Endpoint: Get Application Statistics
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
  // New Endpoint: Get Applications with Filters
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
  const httpServer = createServer(app);
  return httpServer;
}