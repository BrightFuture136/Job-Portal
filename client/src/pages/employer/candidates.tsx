import { ReactNode, useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Calendar as CalendarIcon,
  User,
  Check,
  X,
  UserCheck,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ApplicationStats {
  totalApplications: number;
  shortlisted: number;
  interviewsScheduled: number;
  hired: number;
}

interface Application {
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
}

export default function Candidates() {
  const { toast } = useToast();
  const [stats, setStats] = useState<ApplicationStats>({
    totalApplications: 0,
    shortlisted: 0,
    interviewsScheduled: 0,
    hired: 0,
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    number | null
  >(null);
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(
    undefined
  );

  // Fetch application statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/applications/stats");
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, []);

  // Fetch applications with filters
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await fetch(
          `/api/applications?status=${statusFilter}`
        );
        if (!response.ok) throw new Error("Failed to fetch applications");
        const data = await response.json();
        setApplications(data);
      } catch (error) {
        console.error("Error fetching applications:", error);
      }
    };
    fetchApplications();
  }, [statusFilter]);

  const filteredApplications = applications.filter((app) =>
    app.seekerName.toLowerCase().includes(searchQuery.toLowerCase())
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
      const updatedApplication = await response.json();
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? updatedApplication : app))
      );
      const statsResponse = await fetch("/api/applications/stats");
      const statsData = await statsResponse.json();
      setStats(statsData);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleScheduleInterview = async () => {
    if (!selectedApplicationId || !interviewDate) {
      toast({
        title: "Error",
        description: "Please select an interview date.",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await fetch(
        `/api/applications/${selectedApplicationId}/schedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewDate: interviewDate.toISOString() }),
        }
      );
      const updatedApplication = await response.json();
      setApplications((prev) =>
        prev.map((app) =>
          app.id === selectedApplicationId ? updatedApplication : app
        )
      );
      const statsResponse = await fetch("/api/applications/stats");
      const statsData = await statsResponse.json();
      setStats(statsData);
      setIsScheduleDialogOpen(false);
      setInterviewDate(undefined);
      setSelectedApplicationId(null);
      toast({
        title: "Interview Scheduled",
        description: "The interview has been scheduled successfully.",
      });
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
    setSelectedApplicationId(appId);
    const app = applications.find((a) => a.id === appId);
    setInterviewDate(
      app?.interviewDate ? new Date(app.interviewDate) : undefined
    );
    setIsScheduleDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/applications/export");
      if (!response.ok) throw new Error("Failed to export applications");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "applications.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting applications:", error);
    }
  };

  return (
    <div className="min-h-screen ">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 space-y-4">
          <h1 className="text-4xl font-bold  tracking-tight">
            Candidate Management
          </h1>
          <p className="">Review and manage your applicants</p>

          <div className="grid gap-6 md:grid-cols-4">
            {/* Stats Cards remain the same */}
            <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-none ">
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium ">
                  Total Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold ">
                  {stats.totalApplications}
                </div>
                <p className="text-xs ">+15% from last month</p>
              </CardContent>
            </Card>
            {/* ... (other stats cards remain the same) */}
            <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-none ">
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium ">
                  Shortlisted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold ">
                  {stats.shortlisted}
                </div>
                <p className="text-xs ">20 this week</p>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-none ">
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium ">
                  Interviews Scheduled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold ">
                  {stats.interviewsScheduled}
                </div>
                <p className="text-xs ">Next: Tomorrow</p>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-none ">
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium ">
                  Hired
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold ">
                  {stats.hired}
                </div>
                <p className="text-xs ">This quarter</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and filter section remains the same */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search candidates..."
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 border-gray-300 hover:border-indigo-500 transition-all duration-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={handleExport}
              className="w-full sm:w-auto border-gray-300 hover:border-indigo-500 transition-all duration-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {filteredApplications.map((app) => (
            <Card
              key={app.id}
              className="shadow-md hover:shadow-lg transition-all duration-300 border-none "
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold  hover:text-indigo-600 transition-colors duration-200">
                      {app.seekerName || "Unknown Candidate"}
                    </h3>
                    <p className="text-sm ">
                      {app.jobTitle || "Unknown Job"}
                    </p>
                    <div className="flex items-center gap-2 text-sm ">
                      <CalendarIcon className="h-4 w-4" />
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </div>
                    {app.interviewDate &&
                      (app.status === "interview" ||
                        app.status === "accepted") && (
                        <div className="flex items-center gap-2 text-sm ">
                          <CalendarIcon className="h-4 w-4" />
                          Interview:{" "}
                          {new Date(app.interviewDate).toLocaleDateString()}
                        </div>
                      )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(app.resumeUrl, "_blank")}
                      className=" hover:bg-indigo-50 border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-200"
                    >
                      <User className="h-4 w-4 mr-1" />
                      View Profile
                    </Button>

                    {/* Pending Status */}
                    {app.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(app.id, "accepted")}
                          className=" hover:bg-indigo-50 border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-200"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleStatusChange(app.id, "rejected")}
                          className="bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Interview Status */}
                    {app.status === "interview" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenScheduleDialog(app.id)}
                          className=" hover:bg-indigo-50 border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-200"
                        >
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          Reschedule
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="group  hover:bg-indigo-50 border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-200"
                            >
                              Interviewing
                              <span className="ml-2 h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-gray-500 group-hover:border-t-indigo-500 transition-colors duration-200" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className=" shadow-lg border rounded-md p-1">
                            {/* <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(app.id, "accepted")
                              }
                              className="px-3 py-2 hover:bg-indigo-50 rounded cursor-pointer"
                            >
                              Accept
                            </DropdownMenuItem> */}
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
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStatusChange(app.id, "hired")}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Hire
                        </Button>
                      </>
                    )}

                    {/* Accepted Status */}
                    {app.status === "accepted" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenScheduleDialog(app.id)}
                          className=" hover:bg-indigo-50 border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-200"
                        >
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {app.interviewDate ? "Reschedule" : "Schedule"}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="group  hover:bg-indigo-50 border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-200"
                            >
                              Accepted
                              <span className="ml-2 h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-gray-500 group-hover:border-t-indigo-500 transition-colors duration-200" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className=" shadow-lg border rounded-md p-1">
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
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStatusChange(app.id, "hired")}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Hire
                        </Button>
                      </>
                    )}

                    {/* Rejected Status */}
                    {app.status === "rejected" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="group hover:bg-indigo-50 border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-200"
                          >
                            Rejected
                            <span className="ml-2 h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-gray-500 group-hover:border-t-indigo-500 transition-colors duration-200" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className=" shadow-lg border rounded-md p-1">
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(app.id, "accepted")
                            }
                            className="px-3 py-2 hover:bg-indigo-50 rounded cursor-pointer"
                          >
                            Accept
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Hired Status */}
                    {app.status === "hired" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="bg-gray-100  cursor-not-allowed"
                      >
                        Hired
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Schedule Interview Dialog */}
        <Dialog
          open={isScheduleDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsScheduleDialogOpen(false);
              setInterviewDate(undefined);
              setSelectedApplicationId(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md  shadow-xl rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold ">
                {selectedApplicationId &&
                applications?.find((app) => app.id === selectedApplicationId)
                  ?.interviewDate
                  ? "Reschedule Interview"
                  : "Schedule Interview"}
              </DialogTitle>
              <DialogDescription className="">
                Select a date for the interview with{" "}
                {selectedApplicationId &&
                  applications?.find((app) => app.id === selectedApplicationId)
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
                } // Disable past dates
                initialFocus
              />
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsScheduleDialogOpen(false)}
                className=" hover:bg-gray-100 border-gray-300 hover:border-gray-400 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleInterview}
                disabled={!interviewDate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {selectedApplicationId &&
                applications?.find((app) => app.id === selectedApplicationId)
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
