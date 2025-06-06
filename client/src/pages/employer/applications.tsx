import { useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  Check,
  UserCheck,
  X,
  Calendar as CalendarIcon,
  FileText,
  Bookmark,
  Briefcase,
  Phone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Job } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Slider } from "@/components/ui/slider"; // Import Slider component

interface Application {
  job: Job;
  id: number;
  jobId: number;
  seekerId: number;
  resumeUrl: string;
  status: string;
  coverLetter?: string;
  appliedAt: string;
  seekerName: string;
  jobTitle: string;
  interviewDate?: string;
  phoneNum?: string;
  atsScore: number;
}

export default function Applications() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<number[]>(
    []
  );
  const [searchParams] = useSearchParams();
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [schedulingAppId, setSchedulingAppId] = useState<number | null>(null);
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(
    undefined
  );
  const [atsThreshold, setAtsThreshold] = useState(75); // Dynamic ATS threshold

  const queryClient = useQueryClient();

  const jobId = searchParams.get("jobId");
  const applicationsPerPage = 6;

  const {
    data: applications,
    isLoading,
    error,
  } = useQuery<Application[]>({
    queryKey: ["/api/applications/employer", jobId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/applications/employer${jobId ? `?jobId=${jobId}` : ""}`
      );
      return res.json();
    },
    enabled: !!jobId,
  });

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/jobs");
      return res.json();
    },
    enabled: true,
  });

  const jobTitle =
    jobs?.find((job) => job.id === Number(jobId))?.title || "Job Applications";
  const getJobTitle = (jobId: number) =>
    jobs?.find((job) => job.id === jobId)?.title || "Unknown Job";

  // Filter applications based on dynamic ATS threshold
  const filteredApplications = applications?.filter((application) => {
    const matchesSearch = application.seekerName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || application.status === statusFilter;
    const meetsAtsThreshold = application.atsScore >= atsThreshold; // Dynamic threshold
    return matchesSearch && matchesStatus && meetsAtsThreshold;
  });

  const paginatedApplications = filteredApplications?.slice(
    (currentPage - 1) * applicationsPerPage,
    currentPage * applicationsPerPage
  );

  const totalPages = Math.ceil(
    (filteredApplications?.length || 0) / applicationsPerPage
  );

  const handleStatusChange = async (
    applicationId: number,
    newStatus: string
  ) => {
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!response.ok) throw new Error("Failed to update status");

      await queryClient.invalidateQueries({
        queryKey: ["/api/applications/employer", jobId],
      });

      toast({
        title: "Status Updated",
        description: "The application status has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    }
  };

  const handleScheduleInterview = async () => {
    if (!schedulingAppId || !interviewDate) {
      toast({
        title: "Error",
        description: "Please select an interview date.",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await fetch(
        `/api/applications/${schedulingAppId}/schedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewDate: interviewDate.toISOString() }),
        }
      );
      if (!response.ok) throw new Error("Failed to schedule interview");

      await queryClient.invalidateQueries({
        queryKey: ["/api/applications/employer", jobId],
      });

      toast({
        title: "Interview Scheduled",
        description: "The interview has been scheduled successfully.",
      });
      setIsScheduleDialogOpen(false);
      setInterviewDate(undefined);
      setSchedulingAppId(null);
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast({
        title: "Error",
        description: "Failed to schedule interview.",
        variant: "destructive",
      });
    }
  };

  const handleOpenScheduleDialog = (appId: number) => {
    setSchedulingAppId(appId);
    const app = applications?.find((a) => a.id === appId);
    setInterviewDate(
      app?.interviewDate ? new Date(app.interviewDate) : undefined
    );
    setIsScheduleDialogOpen(true);
  };

  const toggleApplicationSelection = (id: number) => {
    setSelectedApplications((prev) =>
      prev.includes(id) ? prev.filter((appId) => appId !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (status: "accepted" | "rejected") => {
    try {
      await Promise.all(
        selectedApplications.map((id) => handleStatusChange(id, status))
      );
      setSelectedApplications([]);
      toast({
        title: "Bulk Action Completed",
        description: `Selected applications have been ${status}.`,
      });
    } catch (error) {
      console.error("Error in bulk action:", error);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>Loading applications...</div>
        </main>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-red-500">
            Error loading applications: {(error as Error).message}
          </div>
        </main>
      </div>
    );

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Job Applications for{" "}
            <span className="text-indigo-600">{jobTitle}</span>
          </h1>
          <p className="mt-2">
            Showing applicants with ATS score ≥ {atsThreshold}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Input
            placeholder="Search by applicant name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 border-gray-300 hover:border-indigo-500 transition-all duration-200">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-col gap-2 w-full sm:w-64">
            <label className="text-sm font-medium text-gray-700">
              ATS Score Threshold: {atsThreshold}
            </label>
            <Slider
              value={[atsThreshold]}
              onValueChange={(value) => setAtsThreshold(value[0])}
              min={0}
              max={100}
              step={10}
              className="w-full"
            />
          </div>
        </div>

        {selectedApplications.length > 0 && (
          <div className="flex gap-3 mb-6">
            <Button
              onClick={() => handleBulkAction("accepted")}
              className="bg-indigo-600 hover:bg-indigo-700 transition-all duration-200"
            >
              Accept Selected
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleBulkAction("rejected")}
              className="bg-red-600 hover:bg-red-700 transition-all duration-200"
            >
              Reject Selected
            </Button>
          </div>
        )}

        {!filteredApplications || filteredApplications.length === 0 ? (
          <Card className="shadow-lg border-none">
            <CardContent className="py-12 text-center">
              No applications meet the ATS threshold of {atsThreshold}.
              <p className="">
                Adjust the threshold or go to the candidates page to see all
                applicants without ATS filtering.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {paginatedApplications?.map((app) => (
              <Card
                key={app.id}
                className="shadow-md hover:shadow-lg transition-all duration-300 border-none"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold text-gray-800 transition-all duration-200">
                      <span
                        onClick={() => setSelectedApplication(app)}
                        className="cursor-pointer inline-block px-2 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-800 hover:scale-105"
                      >
                        {app.jobTitle}
                        <span className="ml-2 text-xs font-normal">
                          Click to view
                        </span>
                      </span>
                    </CardTitle>
                    <input
                      type="checkbox"
                      checked={selectedApplications.includes(app.id)}
                      onChange={() => toggleApplicationSelection(app.id)}
                      className="h-5 w-5 text-indigo-600 accent-indigo-600"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        app.status === "accepted"
                          ? "default"
                          : app.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className={cn("text-sm px-3 py-1", {
                        "bg-indigo-100 text-indigo-800":
                          app.status === "accepted",
                        "bg-red-100 text-red-800": app.status === "rejected",
                        "bg-gray-100 text-gray-800": app.status === "secondary",
                      })}
                    >
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </Badge>
                    <a
                      href={app.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200"
                    >
                      View Resume
                    </a>
                  </div>

                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Applicant:</strong> {app.seekerName}
                    </p>
                    <p>
                      <strong>Applied:</strong>{" "}
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </p>
                    {app.interviewDate &&
                      (app.status === "interview" ||
                        app.status === "accepted") && (
                        <p>
                          <strong>Interview:</strong>{" "}
                          {new Date(app.interviewDate).toLocaleDateString()}
                        </p>
                      )}
                    <p>
                      <strong>ATS Score:</strong> {app.atsScore}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {app.status === "pending" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="group hover:bg-indigo-50 border-gray-300 hover:border-indigo-500 transition-all duration-200"
                          >
                            Change Status
                            <span className="ml-2 h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-gray-500 group-hover:border-t-indigo-500 transition-colors duration-200" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="shadow-lg border rounded-md p-1">
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(app.id, "accepted")
                            }
                            className="px-3 py-2 hover:bg-indigo-50 rounded cursor-pointer"
                          >
                            Accept
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(app.id, "rejected")
                            }
                            className="px-3 py-2 hover:bg-red-50 rounded cursor-pointer"
                          >
                            Reject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {/* ... (rest of status buttons unchanged) */}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-all duration-200"
                >
                  Previous
                </Button>
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => (
                <PaginationItem key={i + 1}>
                  <Button
                    variant={currentPage === i + 1 ? "default" : "ghost"}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "transition-all duration-200",
                      currentPage === i + 1
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "hover:bg-indigo-50 text-gray-700 hover:text-indigo-600"
                    )}
                  >
                    {i + 1}
                  </Button>
                </PaginationItem>
              ))}
              <PaginationItem>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-all duration-200"
                >
                  Next
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        {/* Application Details Modal */}
        <Dialog
          open={!!selectedApplication}
          onOpenChange={(open: any) => !open && setSelectedApplication(null)}
        >
          <DialogContent className="sm:max-w-[50rem] w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <DialogHeader className="bg-gray-700 p-4 text-white dark:bg-gray-900">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Application Details
              </DialogTitle>
              <p className="text-xs text-gray-300 dark:text-gray-400 mt-1">
                Applicant Information Overview
              </p>
            </DialogHeader>

            {selectedApplication && (
              <div className="space-y-4 p-4 max-h-[70vh] overflow-y-auto">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Job Title
                    </span>
                    <p className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-200">
                      {getJobTitle(selectedApplication.jobId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Applicant
                    </span>
                    <p className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-200">
                      {selectedApplication.seekerName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <Bookmark className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Status
                    </span>
                    <Badge
                      className="mt-1 ml-2 px-2.5 py-0.5 text-xs font-medium capitalize"
                      variant={
                        selectedApplication.status === "accepted"
                          ? "outline"
                          : selectedApplication.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      style={
                        selectedApplication.status === "accepted"
                          ? { backgroundColor: "#E9F5EC", color: "#2E7D32" }
                          : selectedApplication.status === "rejected"
                          ? { backgroundColor: "#FFEBEE", color: "#C62828" }
                          : { backgroundColor: "#F5F5F5", color: "#616161" }
                      }
                    >
                      {selectedApplication.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Phone Number
                    </span>
                    <p className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-200">
                      {selectedApplication.phoneNum || (
                        <span className="text-gray-400 dark:text-gray-500 italic">
                          Not provided
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div className="w-full">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Cover Letter
                    </span>
                    <div className="mt-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-h-48.1 overflow-y-auto">
                      {selectedApplication.coverLetter ? (
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          <div className="mb-2">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                              {selectedApplication.seekerName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(
                                selectedApplication.appliedAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="mb-4 whitespace-pre-wrap">
                            {selectedApplication.coverLetter}
                          </p>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">
                            {selectedApplication.seekerName}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">
                          Not provided
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      ATS Score
                    </span>
                    <p className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-200">
                      {selectedApplication.atsScore}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  className="w-full bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 text-white py-2 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <a
                    href={selectedApplication.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="h-4 w-4" />
                    View Resume
                  </a>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Schedule Interview Dialog */}
        <Dialog
          open={isScheduleDialogOpen}
          onOpenChange={(open: any) => {
            if (!open) {
              setIsScheduleDialogOpen(false);
              setInterviewDate(undefined);
              setSchedulingAppId(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md shadow-xl rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">
                {schedulingAppId &&
                applications?.find((app) => app.id === schedulingAppId)
                  ?.interviewDate
                  ? "Reschedule Interview"
                  : "Schedule Interview"}
              </DialogTitle>
              <DialogDescription>
                Select a date for the interview with{" "}
                {schedulingAppId &&
                  applications?.find((app) => app.id === schedulingAppId)
                    ?.seekerName}
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              <Calendar
                mode="single"
                selected={interviewDate}
                onSelect={setInterviewDate}
                className="rounded-md border border-gray-200"
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                initialFocus
              />
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsScheduleDialogOpen(false)}
                className="hover:bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-700 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleInterview}
                disabled={!interviewDate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {schedulingAppId &&
                applications?.find((app) => app.id === schedulingAppId)
                  ?.interviewDate
                  ? "Reschedule"
                  : "Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
