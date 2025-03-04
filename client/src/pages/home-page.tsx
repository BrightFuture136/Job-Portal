import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { JobCard } from "@/components/job-card";
import { Job } from "@shared/schema";
import { Link } from "wouter";
import { Briefcase, Building2 } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  // Fetch jobs with a query that adapts based on user role
  const { data: jobs } = useQuery<
    (Job & { applicantsCount: number; views: number })[]
  >({
    queryKey:
      user?.role === "employer"
        ? ["/api/jobs", { employerId: user?.id }]
        : ["/api/jobs"],
    queryFn: async () => {
      if (user?.role === "employer") {
        // Assuming an API endpoint that filters jobs by employerId
        const res = await fetch(`/api/jobs?employerId=${user.id}`);
        return res.json();
      }
      // Default fetch for seekers or unauthenticated users
      const res = await fetch("/api/jobs");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Welcome back, {user?.username || "Guest"}!
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
                Discover your next opportunity
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

        {jobs && jobs.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-6">
              {user?.role === "employer"
                ? "Your Job Postings"
                : "Recent Job Postings"}
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.slice(0, 6).map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
