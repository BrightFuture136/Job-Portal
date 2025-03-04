import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // Adjust based on your UI library
import { Search, RefreshCw, ChevronDown } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ApplicationWithDetails, Job } from "@shared/schema";
import toast from "react-hot-toast";
import { useDebounce } from "use-debounce";

export default function Messages() {
  const [acceptedApplicants, setAcceptedApplicants] = useState<
    ApplicationWithDetails[]
  >([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch jobs and applicants
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch("/api/jobs", { credentials: "include" }),
        fetch("/api/applications?status=accepted", { credentials: "include" }),
      ]);
      if (!jobsRes.ok || !appsRes.ok) throw new Error("Failed to fetch data");
      const jobsData = await jobsRes.json();
      const appsData = await appsRes.json();
      setJobs(jobsData);
      setAcceptedApplicants(appsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter applicants by search term and selected job
  const filteredApplicants = useMemo(() => {
    let result = acceptedApplicants;
    if (selectedJobId) {
      result = result.filter((app) => app.jobId === selectedJobId);
    }
    if (debouncedSearch) {
      result = result.filter((app) =>
        app.seekerName?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    return result;
  }, [acceptedApplicants, selectedJobId, debouncedSearch]);

  const smsMessage = (name: string, jobTitle: string) =>
    `Dear ${name}, you have been shortlisted for ${jobTitle}.`;

  const handleSendSMS = async () => {
    setDialogOpen(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/applications/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobId: selectedJobId }), // Send selected jobId
      });
      if (!res.ok) throw new Error("Failed to send SMS");
      const data = await res.json();
      toast.success(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to send SMS");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
          {/* Contact List */}
          <div className="col-span-4 flex flex-col">
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search accepted applicants..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setSearchTerm("")}
                  aria-label="Search accepted applicants"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchData}
                disabled={loading}
                aria-label="Refresh data"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <div className="mb-4">
              <select
                className="w-full p-2 border rounded-md"
                value={selectedJobId || ""}
                onChange={(e) =>
                  setSelectedJobId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                aria-label="Filter by job"
              >
                <option value="">All Jobs</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
            <Card className="flex-1 overflow-auto">
              <CardContent className="p-0">
                {loading && !acceptedApplicants.length ? (
                  <p className="p-4 text-center text-muted-foreground">
                    Loading...
                  </p>
                ) : error && !acceptedApplicants.length ? (
                  <p className="p-4 text-center text-red-500">{error}</p>
                ) : filteredApplicants.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground">
                    No accepted applicants found
                  </p>
                ) : (
                  filteredApplicants.map((app) => (
                    <div
                      key={app.id}
                      className="w-full p-4 flex items-start gap-3 border-b last:border-0 hover:bg-accent"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {app.seekerName?.slice(0, 2).toUpperCase() || "NA"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {app.seekerName || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {app.jobTitle || "Unknown"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* SMS Preview and Send */}
          <div className="col-span-8">
            <Card className="h-full flex flex-col justify-between">
              <div className="p-4 border-b">
                <p className="font-medium">SMS Preview</p>
                {filteredApplicants.length > 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {smsMessage(
                      filteredApplicants[0].seekerName || "Applicant",
                      filteredApplicants[0].jobTitle || "the position"
                    )}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No applicants selected
                  </p>
                )}
              </div>
              <div className="p-4 border-t">
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      disabled={loading || filteredApplicants.length === 0}
                      aria-label="Send SMS to all accepted applicants"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        `Send SMS to Accepted Applicants (${filteredApplicants.length})`
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm SMS Send</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to send an SMS to{" "}
                        {filteredApplicants.length} accepted applicant(s) for{" "}
                        {selectedJobId
                          ? jobs.find((j) => j.id === selectedJobId)?.title ||
                            "this job"
                          : "all jobs"}
                        ?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSendSMS}>Send</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
