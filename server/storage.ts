import { User, Job, Application, InsertUser, ApplicationWithDetails } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Jobs
  createJob(job: Omit<Job, "id">): Promise<Job>;
  getJobs(): Promise<Job[]>;
  getJobById(id: number): Promise<Job | undefined>;
  getJobsByEmployer(employerId: number): Promise<Job[]>;

  // Applications
  createApplication(application: Omit<Application, "id" | "status">): Promise<Application>;
  getApplicationsByJob(jobId: number): Promise<Application[]>;
  getApplicationsBySeeker(seekerId: number): Promise<Application[]>;
  getApplicationsByEmployer(employerId: number): Promise<Application[]>;  
  updateApplicationStatus(id: number, status: Application["status"]): Promise<Application>;
  updateApplicationInterviewDate(id: number, interviewDate: string): Promise<Application>;
  getApplicationById(id: number): Promise<Application | undefined>;
  getApplicationWithDetails(id: number): Promise<ApplicationWithDetails>,
  getApplicationTrends(employerId: number, days: number): Promise<{date: string;applications: number;}[]> 
  getEmployerAnalytics(employerId: number): Promise<{
    totalViews: number;
    totalApplications: number;
    avgTimeToHire: number;
    conversionRate: number;
  }>
  incrementJobViews(jobId: number): Promise<void> ,
  sessionStore: session.Store;
}

export class PostgresStorage implements IStorage {
  [x: string]: any;
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values(insertUser).returning();
    return result[0];
  }

  async createJob(job: Omit<Job, "id">): Promise<Job> {
    const result = await db.insert(schema.jobs).values(job).returning();
    return result[0];
  }
  

  async getJobs(): Promise<Job[]> {
    return await db.select().from(schema.jobs);
  }

  async getJobById(id: number): Promise<Job | undefined> {
    const result = await db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).limit(1);
    return result[0];
  }

  async getJobsByEmployer(employerId: number): Promise<Job[]> {
    return await db.select().from(schema.jobs).where(eq(schema.jobs.employerId, employerId));
  }

  async createApplication(application: Omit<Application, "id" | "status">): Promise<Application> {
    const result = await db.insert(schema.applications).values({
      ...application,
      status: "pending", // Default status
      coverLetter: application.coverLetter || null, // Ensure coverLetter is not undefined
    }).returning();
    return result[0];
  }

  async getApplicationsByJob(jobId: number): Promise<Application[]> {
    return await db.select().from(schema.applications).where(eq(schema.applications.jobId, jobId));
  }
  async getApplicationsByEmployer(employerId: number): Promise<ApplicationWithDetails[]> {
    const jobs = await this.getJobsByEmployer(employerId);
    const applications = await Promise.all(
      jobs.map((job) => this.getApplicationsByJob(job.id)),
    );
  
    const detailedApplications = await Promise.all(
      applications.flat().map(async (app) => {
        const seeker = await this.getUser(app.seekerId);
        const job = await this.getJobById(app.jobId);
        return {
          ...app,
          seekerName: seeker?.username || "Unknown",
          jobTitle: job?.title || "Unknown",
          appliedAt: app.appliedAt, // Add applied date
          phoneNum: seeker?.phone || "Unknown",
          
        };
      })
    );
  
    return detailedApplications;
  }
  async getApplicationById(id: number): Promise<Application | undefined> {
    const result = await db.select().from(schema.applications).where(eq(schema.applications.id, id)).limit(1);
    return result[0];
  }
  async getApplicationsBySeeker(seekerId: number): Promise<Application[]> {
    return await db.select().from(schema.applications).where(eq(schema.applications.seekerId, seekerId));
  }

  async updateApplicationStatus(id: number, status: Application["status"]): Promise<Application> {
    const result = await db.update(schema.applications)
      .set({ 
        status,
        updatedAt: new Date(),}) // Update the status
      .where(eq(schema.applications.id, id))
      .returning();
    return result[0];
  }
  async updateApplicationInterviewDate(id: number, interviewDate: string): Promise<Application> {
    const result = await db.update(schema.applications)
      .set({ 
        interviewDate: new Date(interviewDate),
        status: "interview", // Update the status to "interview"
        updatedAt: new Date(),
      })
      .where(eq(schema.applications.id, id))
      .returning();
    return result[0];
  }
  async getApplicationWithDetails(id: number): Promise<ApplicationWithDetails> {
    const application = await this.getApplicationById(id);
    if (!application) {
      throw new Error("Application not found");
    }
  
    const seeker = await this.getUser(application.seekerId);
    const job = await this.getJobById(application.jobId);
  
    return {
      ...application,
      seekerName: seeker?.username || "Unknown",
      jobTitle: job?.title || "Unknown",
    };
  }
  async getEmployerAnalytics(employerId: number): Promise<{
    totalViews: number;
    totalApplications: number;
    avgTimeToHire: number;
    conversionRate: number;
  }> {
    const applications = await this.getApplicationsByEmployer(employerId);
    const jobs = await this.getJobsByEmployer(employerId);
  
    // Calculate total views (assuming views column exists or use a placeholder)
    const totalViews = jobs.reduce((sum, job) => sum + (job.views || 0), 0);
  
    // Calculate average time to hire
    const hiredApps = applications.filter(app => app.status === "hired");
    const timeToHire = hiredApps.map(app => {
      const applied = app.appliedAt ? new Date(app.appliedAt) : new Date();
      // Use updatedAt if available, otherwise use current date
      const hired = app.updatedAt ? new Date(app.updatedAt) : new Date();
      return (hired.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24); // Convert to days
    });
    const avgTimeToHire = timeToHire.length > 0 
      ? timeToHire.reduce((sum, days) => sum + days, 0) / timeToHire.length 
      : 0;
  
    // Calculate conversion rate
    const conversionRate = applications.length > 0 
      ? (hiredApps.length / applications.length) * 100 
      : 0;
  
    return {
      totalViews,
      totalApplications: applications.length,
      avgTimeToHire: Math.round(avgTimeToHire),
      conversionRate: Number(conversionRate.toFixed(1))
    };
  }
  
  async getApplicationTrends(employerId: number, days: number): Promise<{
    date: string;
    applications: number;
  }[]> {
    const applications = await this.getApplicationsByEmployer(employerId);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
  
    const filteredApps = applications.filter(app => 
      app.appliedAt && new Date(app.appliedAt) >= cutoffDate
    );
  
    const trendData = new Map<string, number>();
    filteredApps.forEach(app => {
      if (app.appliedAt) {
        const date = new Date(app.appliedAt).toISOString().split('T')[0];
        trendData.set(date, (trendData.get(date) || 0) + 1);
      }
    });
  
    const result = [];
    const currentDate = new Date(cutoffDate);
    while (currentDate <= new Date()) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        applications: trendData.get(dateStr) || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    return result;
  }
  // In storage.ts
  async incrementJobViews(jobId: number): Promise<void> {
    await db.update(schema.jobs)
      .set({ views: sql`views + 1` })
      .where(eq(schema.jobs.id, jobId));
  }
}

export const storage = new PostgresStorage();