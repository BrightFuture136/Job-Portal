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
  getAcceptedApplicationsByEmployer(employerId: number): Promise<ApplicationWithDetails[]>,
  updateUserProfile(userId: number, updates: Partial<schema.User>): Promise<schema.User>
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
  

  async getJobs(employerId?: number): Promise<Job[]> {
    // Start with a base query
    let query = db.select().from(schema.jobs);
  
    // If an employerId is provided, filter jobs by that employer
    if (employerId !== undefined) {
      query = query.where(eq(schema.jobs.employerId, employerId)) as typeof query;
    }
  
    // Sort jobs by creation date in descending order
    query = query.orderBy(sql`${schema.jobs.createdAt} DESC`) as typeof query;
  
    // Execute the query
    const jobs = await query;
  
    // For each job, calculate the total views and applicants count
    const jobsWithCounts = await Promise.all(jobs.map(async (job) => {
      // Fetch the total number of unique views for this job
      const views = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.jobViews)
        .where(eq(schema.jobViews.jobId, job.id))
        .then((res) => res[0]?.count || 0);
  
      // Fetch the total number of applicants for this job
      const applicantsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.applications)
        .where(eq(schema.applications.jobId, job.id))
        .then((res) => res[0]?.count || 0);
  
      return {
        ...job,
        views, // Add the calculated views
        applicantsCount, // Add the calculated applicants count
      };
    }));
  
    return jobsWithCounts;
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
      coverLetter: application.coverLetter ?? null, // Ensure coverLetter is not undefined
    }).returning();
    return result[0];
  }

  async getApplicationsByJob(jobId: number): Promise<Application[]> {
    return await db.select().from(schema.applications).where(eq(schema.applications.jobId, jobId));
  }
  async getApplicationsByEmployer(employerId: number): Promise<ApplicationWithDetails[]> {
    const jobs = await this.getJobsByEmployer(employerId);
    const applications = await Promise.all(
      jobs.map((job) => this.getApplicationsByJob(job.id))
    );
  
    const detailedApplications = await Promise.all(
      applications.flat().map(async (app) => {
        const seeker = await this.getUser(app.seekerId);
        const job = await this.getJobById(app.jobId);
        return {
          ...app,
          seekerName: seeker?.username || "Unknown",
          jobTitle: job?.title || "Unknown",
          appliedAt: app.appliedAt,
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
      .set({ status }) // Update the status
      .where(eq(schema.applications.id, id))
      .returning();
    return result[0];
  }
  async updateApplicationInterviewDate(id: number, interviewDate: string): Promise<Application> {
    const result = await db.update(schema.applications)
      .set({ 
        interviewDate: new Date(interviewDate),
        status: "interview", // Update the status to "interview"
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
  
  async getAcceptedApplicationsByEmployer(employerId: number): Promise<ApplicationWithDetails[]> {
    const allApps = await this.getApplicationsByEmployer(employerId);
    return allApps.filter(app => app.status === "accepted");
  }

  async updateUserProfile(userId: number, updates: Partial<schema.User>): Promise<schema.User> {
    const result = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, userId))
      .returning();
    if (!result[0]) throw new Error("User not found");
    return result[0];
  }
}

export const storage = new PostgresStorage();