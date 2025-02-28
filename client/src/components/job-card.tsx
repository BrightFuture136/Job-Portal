import { Job } from "@shared/schema";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Building2, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch the user's applications
  const { data: applications } = useQuery({
    queryKey: ["/api/applications/seeker"],
    queryFn: async () => {
      if (!user || user.role !== "seeker") return [];
      const res = await apiRequest("GET", "/api/applications/seeker");
      return res.json();
    },
  });

  // Check if the user has already applied for this job
  const hasApplied = applications?.some((app: any) => app.jobId === job.id);

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!user || user.role !== "seeker") {
        throw new Error("You must be logged in as a job seeker to apply.");
      }

      // In a real app, you'd handle file upload here
      // For demo purposes, using a mock resume URL
      const resumeUrl = "https://example.com/resume.pdf";

      const res = await apiRequest("POST", `/api/jobs/${job.id}/apply`, {
        resumeUrl,
        seekerId: user.id, // Include the seeker's ID
        status: "pending", // Explicitly set the status
      });

      return res.json();
    },
    onSuccess: () => {
      // Invalidate the applications query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["/api/applications/seeker"] });
      toast({
        title: "Application Submitted",
        description: "Your application has been sent to the employer.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const typeVariant = {
    "full-time": "default",
    "part-time": "secondary",
    contract: "outline",
  } as const;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-grow space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg line-clamp-2">{job.title}</h3>
          <Badge variant={typeVariant[job.type]}>
            {job.type.replace("-", " ")}
          </Badge>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>{job.company}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>{job.salary}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {job.description}
        </p>
      </CardContent>

      <CardFooter className="border-t pt-4">
        {user?.role === "seeker" ? (
          <Button
            className="w-full gap-2"
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending || hasApplied} // Disable if already applied
          >
            <Briefcase className="h-4 w-4" />
            {hasApplied
              ? "Applied"
              : applyMutation.isPending
              ? "Applying..."
              : "Apply Now"}
          </Button>
        ) : user?.role === "employer" && user.id === job.employerId ? (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() =>
              setLocation(`/employer/applications?jobId=${job.id}`)
            }
          >
            View Applications
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
