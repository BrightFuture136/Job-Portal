import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { JobCard } from "@/components/job-card";
import { Job } from "@shared/schema";
import { Link } from "wouter";
import { Briefcase, Building2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useMemo } from "react";

export default function HomePage() {
  const { user } = useAuth();

  // Function to determine the greeting based on the current time
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon";
    } else if (hour >= 17 && hour < 22) {
      return "Good Evening";
    } else {
      return "Good Evening";
    }
  };

  // Fetch all jobs (for guests and to filter applied jobs for seekers)
  const { data: allJobs, isLoading: jobsLoading } = useQuery<
    (Job & { applicantsCount: number; views: number })[]
  >({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  // Fetch employer-specific jobs
  const { data: employerJobs, isLoading: employerJobsLoading } = useQuery<
    (Job & { applicantsCount: number; views: number })[]
  >({
    queryKey: ["/api/jobs", { employerId: user?.id }],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?employerId=${user!.id}`);
      if (!res.ok) throw new Error("Failed to fetch employer jobs");
      return res.json();
    },
    enabled: user?.role === "employer",
  });

  // Fetch seeker applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<
    {
      id: number;
      jobId: number;
      seekerId: number;
      resumeUrl: string;
      coverLetter: string | null;
      status: string;
      appliedAt: string;
      interviewDate: string | null;
      atsScore: number;
    }[]
  >({
    queryKey: ["/api/applications/seeker", { seekerId: user?.id }],
    queryFn: async () => {
      const res = await fetch("/api/applications/seeker", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`, // Assuming your auth uses a token
        },
      });
      if (!res.ok) throw new Error("Failed to fetch applications");
      return res.json();
    },
    enabled: user?.role === "seeker",
  });

  // Filter jobs the seeker has applied to
  const appliedJobs = useMemo(() => {
    if (!applications || !allJobs) return [];
    const appliedJobIds = applications.map((app) => app.jobId);
    return allJobs.filter((job) => appliedJobIds.includes(job.id));
  }, [applications, allJobs]);

  // Determine which jobs to display based on role
  const displayedJobs =
    user?.role === "employer"
      ? employerJobs
      : user?.role === "seeker"
      ? appliedJobs
      : allJobs;
  const isLoading =
    user?.role === "employer"
      ? employerJobsLoading
      : user?.role === "seeker"
      ? jobsLoading || applicationsLoading
      : jobsLoading;

  return (
    <div className="min-h-screen">
      <Navigation />
      <Toaster />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            {getTimeBasedGreeting()}, {user?.username || "Guest"}!
          </h1>
          {user?.role === "employer" ? (
            <div className="space-y-4">
              <p className="text-xl text-muted-foreground">
                Ready to find your next team member?
              </p>
              <Link href="/employer/post-job">
                <Button size="lg" className="gap-2">
                  <Briefcase className="h-5 w-5" />
                  Post a New Job
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xl text-muted-foreground">
                {user?.role === "seeker"
                  ? "Track your job applications"
                  : "Discover your next opportunity"}
              </p>
              <Link href="/seeker/jobs">
                <Button size="lg" className="gap-2">
                  <Building2 className="h-5 w-5" />
                  Browse Jobs
                </Button>
              </Link>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : displayedJobs && displayedJobs.length > 0 ? (
          <section>
            <h2 className="text-2xl font-semibold mb-6">
              {user?.role === "employer"
                ? "Your Job Postings"
                : user?.role === "seeker"
                ? "Jobs You've Applied For"
                : "Recent Job Postings"}
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayedJobs.slice(0, 6).map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {user?.role === "seeker"
                ? "You haven’t applied to any jobs yet."
                : user?.role === "employer"
                ? "You haven’t posted any jobs yet."
                : "No recent job postings available."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
