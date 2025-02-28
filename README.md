# Job Search Platform Database Documentation

## Overview
This document outlines the database structure for a comprehensive job search platform. The database is designed to support job listings, user profiles (both job seekers and employers), applications, company reviews, and an email alert system.

## Database Schema

### 1. Users Table
Stores both job seekers and employer profiles.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('seeker', 'employer')),
    company_name TEXT,
    bio TEXT,
    location TEXT,
    resume_url TEXT,
    education JSONB,
    experience JSONB,
    skills TEXT[],
    company_size TEXT,
    industry TEXT,
    founded TEXT,
    website TEXT,
    company_description TEXT,
    benefits TEXT,
    culture TEXT
);
```

Fields:
- `education`: JSON array of education history (school, degree, field, dates)
- `experience`: JSON array of work history (title, company, location, dates, description)
- `skills`: Array of skill strings
- Company-specific fields (null for job seekers): company_name, company_size, industry, etc.

### 2. Jobs Table
Stores job listings posted by employers.

```sql
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    employer_id INTEGER NOT NULL,
    salary INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('full-time', 'part-time', 'contract')),
    requirements TEXT[],
    benefits TEXT[],
    application_deadline TEXT,
    experience_level TEXT,
    remote BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Applications Table
Tracks job applications submitted by seekers.

```sql
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    seeker_id INTEGER NOT NULL,
    resume_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    cover_letter TEXT,
    applied_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Company Reviews Table
Stores company reviews and ratings from users.

```sql
CREATE TABLE company_reviews (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    pros TEXT,
    cons TEXT,
    review TEXT NOT NULL,
    position TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Job Alerts Table
Stores user preferences for job alert notifications.

```sql
CREATE TABLE job_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    keywords TEXT[],
    location TEXT,
    job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'contract')),
    min_salary INTEGER,
    max_salary INTEGER,
    experience_level TEXT,
    remote BOOLEAN,
    industries TEXT[],
    notify_email BOOLEAN DEFAULT TRUE,
    notify_sms BOOLEAN DEFAULT FALSE,
    frequency TEXT CHECK (frequency IN ('daily', 'weekly')) DEFAULT 'daily',
    is_active BOOLEAN DEFAULT TRUE,
    last_notified TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6. Email Notifications Table
Tracks email notifications sent for job alerts.

```sql
CREATE TABLE email_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    alert_id INTEGER NOT NULL,
    job_ids INTEGER[],
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Table Relationships

1. Users (Employers) -> Jobs
   - One employer can post many jobs
   - Foreign key: jobs.employer_id -> users.id

2. Users (Seekers) -> Applications -> Jobs
   - One seeker can submit many applications
   - One job can receive many applications
   - Foreign keys: 
     - applications.seeker_id -> users.id
     - applications.job_id -> jobs.id

3. Users -> Company Reviews
   - One user can write many reviews
   - One company can receive many reviews
   - Foreign keys:
     - company_reviews.user_id -> users.id
     - company_reviews.company_id -> users.id (where users.role = 'employer')

4. Users -> Job Alerts
   - One user can have many job alerts
   - Foreign key: job_alerts.user_id -> users.id

5. Job Alerts -> Email Notifications
   - One job alert can trigger many email notifications
   - Foreign keys:
     - email_notifications.user_id -> users.id
     - email_notifications.alert_id -> job_alerts.id

## Usage Notes

1. The database uses PostgreSQL-specific features:
   - JSONB for structured data (education, experience)
   - Array types for storing lists (skills, requirements, benefits)
   - Enum-like constraints using CHECK

2. Timestamps:
   - Most tables include created_at timestamps
   - job_alerts includes updated_at for tracking changes
   - email_notifications includes sent_at for delivery tracking

3. Status tracking:
   - Applications: pending/accepted/rejected
   - Email notifications: pending/sent/failed

4. Security considerations:
   - Passwords should be hashed before storage
   - Email addresses and usernames have UNIQUE constraints
   - Role-based access control through users.role

## Implementation Notes

To create these tables in PostgreSQL, you can:

1. Run each CREATE TABLE statement in sequence
2. Ensure proper database user permissions
3. Create appropriate indexes for frequently queried columns
4. Set up foreign key constraints for referential integrity

Optional indexes for performance:
```sql
CREATE INDEX idx_jobs_employer ON jobs(employer_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_seeker ON applications(seeker_id);
CREATE INDEX idx_reviews_company ON company_reviews(company_id);
CREATE INDEX idx_alerts_user ON job_alerts(user_id);
CREATE INDEX idx_notifications_alert ON email_notifications(alert_id);