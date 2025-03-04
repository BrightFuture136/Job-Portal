import { Job } from "@shared/schema";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  MapPin,
  Building2,
  DollarSign,
  Eye,
  X,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { motion, AnimatePresence } from "framer-motion";

interface JobCardProps {
  job: Job & { applicantsCount: number; views: number };
}

export function JobCard({ job }: JobCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  // Add/remove body class when dialog opens/closes
  useEffect(() => {
    if (open) {
      document.body.classList.add("dialog-open");
    } else {
      document.body.classList.remove("dialog-open");
    }
    // Cleanup on unmount
    return () => document.body.classList.remove("dialog-open");
  }, [open]);

  // Reset or invalidate queries when the user changes
  useEffect(() => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/seeker"] });
    } else {
      queryClient.removeQueries({ queryKey: ["/api/applications/seeker"] });
    }
  }, [user]);

  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/applications/seeker"],
    queryFn: async () => {
      if (!user || user.role !== "seeker") return [];
      const res = await apiRequest("GET", "/api/applications/seeker");
      return res.json();
    },
    enabled: !!user && user.role === "seeker",
  });

  const viewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/jobs/${job.id}/view`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["/api/jobs", job.id],
        (old: (Job & { applicantsCount: number; views: number }) | undefined) =>
          old ? { ...old, views: data.views } : old
      );
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record view.",
        variant: "destructive",
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!user || user.role !== "seeker") {
        throw new Error("You must be logged in as a job seeker to apply.");
      }
      const resumeUrl = "https://example.com/resume.pdf"; // Replace with actual resume URL
      const res = await apiRequest("POST", `/api/jobs/${job.id}/apply`, {
        resumeUrl,
        seekerId: user.id,
        status: "pending",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/seeker"] });
      toast({
        title: "Application Submitted",
        description: "Your application has been sent to the employer.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = () => {
    if (user) {
      viewMutation.mutate();
    }
    setOpen(true);
  };

  const hasApplied = applications?.some((app: any) => app.jobId === job.id);

  const typeVariant = {
    "full-time": "default",
    "part-time": "secondary",
    contract: "outline",
  } as const;

  const isEmployerOwner =
    user?.role === "employer" && user.id === job.employerId;

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex-grow space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg line-clamp-2 ">{job.title}</h3>
          <Badge variant={typeVariant[job.type]}>
            {job.type.replace("-", " ")}
          </Badge>
        </div>
        <div className="space-y-2 text-sm ">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span>{job.company}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-500" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-yellow-500" />
            <span>{job.salary}</span>
          </div>
          {isEmployerOwner && (
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              <span>{job.views} views</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-500" />
            <span>{job.applicantsCount} applicants</span>
          </div>
        </div>
      </CardHeader>

      {/* <CardContent>
        <p className="text-sm line-clamp-3">{job.description}</p>
      </CardContent> */}

      <CardFooter className="border-t pt-4 flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleViewDetails}
        >
          <Eye className="h-4 w-4" />
          View Details
        </Button>
        {user?.role === "seeker" ? (
          <Button
            className="w-full gap-2 hover:bg-blue-700 text-white"
            onClick={() => applyMutation.mutate()}
            disabled={
              applyMutation.isPending || hasApplied || applicationsLoading
            }
          >
            <Briefcase className="h-4 w-4" />
            {applicationsLoading
              ? "Loading..."
              : hasApplied
              ? "Applied"
              : applyMutation.isPending
              ? "Applying..."
              : "Apply Now"}
          </Button>
        ) : isEmployerOwner ? (
          <Button
            className="w-full"
            onClick={() =>
              setLocation(`/employer/applications?jobId=${job.id}`)
            }
          >
            View Applications
          </Button>
        ) : null}
      </CardFooter>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <AnimatePresence>
            {open && (
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="fixed inset-4 rounded-xl shadow-2xl max-w-3xl mx-auto h-[92vh] overflow-y-auto p-8 flex flex-col bg-background text-foreground"
                >
                  <VisuallyHidden asChild>
                    <Dialog.Title>{job.title} Details</Dialog.Title>
                  </VisuallyHidden>
                  <Dialog.Close asChild>
                    <button
                      className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-300"
                      aria-label="Close"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </Dialog.Close>

                  <div className="space-y-8 flex-grow">
                    <div className="text-center">
                      <h2 className="text-3xl font-bold tracking-tight">
                        {job.title}
                      </h2>
                      <Badge
                        variant={typeVariant[job.type]}
                        className="mt-3 text-sm px-3 py-1"
                      >
                        {job.type.replace("-", " ")}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="flex items-center gap-3 p-3 rounded-lg shadow-sm">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        <span className="font-medium">{job.company}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg shadow-sm">
                        <MapPin className="h-6 w-6 text-green-600" />
                        <span className="font-medium">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg shadow-sm">
                        <DollarSign className="h-6 w-6 text-yellow-600" />
                        <span className="font-medium">{job.salary}</span>
                      </div>
                      {isEmployerOwner && (
                        <div className="flex items-center gap-3 p-3 rounded-lg shadow-sm">
                          <Eye className="h-6 w-6 text-purple-600" />
                          <span className="font-medium">{job.views} views</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3 rounded-lg shadow-sm col-span-2">
                        <Users className="h-6 w-6 text-teal-600" />
                        <span className="font-medium">
                          {job.applicantsCount} applicants
                        </span>
                      </div>
                    </div>
                    <div className="space-y-6 p-6 rounded-lg shadow-inner">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          Description
                        </h3>
                        <p className="leading-relaxed">{job.description}</p>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          Additional Details
                        </h3>
                        <div className="space-y-2">
                          <p>
                            <strong>Application Deadline:</strong>{" "}
                            {job.applicationDeadline || "Not specified"}
                          </p>
                          <p>
                            <strong>Experience Level:</strong>{" "}
                            {job.experienceLevel || "Not specified"}
                          </p>
                          <p>
                            <strong>Remote:</strong> {job.remote ? "Yes" : "No"}
                          </p>
                          <p>
                            <strong>Posted:</strong>{" "}
                            {new Date(job.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-center">
                    <Dialog.Close asChild>
                      <Button
                        variant="outline"
                        className="w-1/3 hover:bg-gray-300 font-semibold py-2 rounded-full"
                      >
                        Close
                      </Button>
                    </Dialog.Close>
                  </div>
                </motion.div>
              </Dialog.Content>
            )}
          </AnimatePresence>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}
