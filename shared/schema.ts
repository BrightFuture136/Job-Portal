import { pgTable, text, serial, integer, boolean, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["seeker", "employer"] }).notNull(),
  companyName: text("company_name"),
  bio: text("bio"),
  location: text("location"),
  resumeUrl: text("resume_url"),
  education: jsonb("education").$type<{
    school: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
  }[]>(),
  experience: jsonb("experience").$type<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
  }[]>(),
  skills: text("skills").array(),
  companySize: text("company_size"),
  industry: text("industry"),
  founded: text("founded"),
  website: text("website"),
  companyDescription: text("company_description"),
  benefits: text("benefits"),
  culture: text("culture"),
  phone: text("phone"),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  employerId: integer("employer_id"),
  salary: text("salary").notNull(),
  type: text("type", { enum: ["full-time", "part-time", "contract"] }).notNull(),
  requirements: text("requirements").array(),
  benefits: text("benefits").array(),
  applicationDeadline: text("application_deadline"),
  experienceLevel: text("experience_level"),
  remote: boolean("remote"),
  skills: text("skills").array(), // Add this line
  createdAt: timestamp("created_at").defaultNow().notNull(),
  });


export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  seekerId: integer("seeker_id").notNull(),
  resumeUrl: text("resume_url").notNull(),
  status: text("status", { enum: ["pending", "accepted", "rejected", "interview", "hired"] }).notNull(),
  coverLetter: text("cover_letter"),
  interviewDate: timestamp("interview_date") || null, // Add this line
  appliedAt: timestamp("applied_at").defaultNow(),
  
});

export const jobViews = pgTable("job_views", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  viewedAt: timestamp("viewed_at").defaultNow(),
}, (table) => ({
  uniqueJobUser: unique().on(table.jobId, table.userId), // Ensure one view per user per job
}));

export const companyReviews = pgTable("company_reviews", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  userId: integer("user_id").notNull(),
  rating: integer("rating").notNull(),
  pros: text("pros"),
  cons: text("cons"),
  review: text("review").notNull(),
  position: text("position"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobAlerts = pgTable("job_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  keywords: text("keywords").array(),
  location: text("location"),
  jobType: text("job_type", { enum: ["full-time", "part-time", "contract"] }),
  minSalary: integer("min_salary"),
  maxSalary: integer("max_salary"),
  experienceLevel: text("experience_level"),
  remote: boolean("remote"),
  industries: text("industries").array(),
  notifyEmail: boolean("notify_email").default(true),
  notifySMS: boolean("notify_sms").default(false),
  frequency: text("frequency", { enum: ["daily", "weekly"] }).default("daily"),
  isActive: boolean("is_active").default(true),
  lastNotified: timestamp("last_notified"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailNotifications = pgTable("email_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  alertId: integer("alert_id").notNull(),
  jobIds: integer("job_ids").array(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  status: text("status", { enum: ["pending", "sent", "failed"] }).notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  education: z.array(z.object({
    school: z.string(),
    degree: z.string(),
    fieldOfStudy: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  })).optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    description: z.string(),
  })).optional(),
});
export type ApplicationWithDetails = Application & {
  seekerName?: string;
  jobTitle?: string;
  phoneNum?:string;
};


export const insertJobSchema = createInsertSchema(jobs);
export const insertApplicationSchema = createInsertSchema(applications);
export const insertCompanyReviewSchema = createInsertSchema(companyReviews);
export const insertJobAlertSchema = createInsertSchema(jobAlerts);
export const insertEmailNotificationSchema = createInsertSchema(emailNotifications);
export const insertJobViewSchema = createInsertSchema(jobViews);

export type JobView = typeof jobViews.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Job = typeof jobs.$inferSelect & {
  views?: number; // Add this if it's not part of the schema
  applicantsCount?: number; // Add this as a computed property
};
export type Application = typeof applications.$inferSelect;
export type CompanyReview = typeof companyReviews.$inferSelect;
export type JobAlert = typeof jobAlerts.$inferSelect;
export type EmailNotification = typeof emailNotifications.$inferSelect;