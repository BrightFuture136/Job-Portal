import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { JobAlert } from "@shared/schema";
import { toast } from "sonner";

// API client
const apiClient = {
  get: async (url: string) => {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
  },
  post: async (url: string, body: any) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("Failed to post");
    return response.json();
  },
  patch: async (url: string, body: any) => {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("Failed to patch");
    return response.json();
  },
  delete: async (url: string) => {
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to delete");
    return response.json();
  },
};

// Local type for form state, including id for updates
type AlertFormState = {
  id?: number; // Optional, only present when editing
  name: string;
  keywords: string;
  location: string;
  jobType: "all" | "full-time" | "part-time" | "contract";
  minSalary: string;
  maxSalary: string;
  experienceLevel: string;
  remote: boolean;
  industries: string;
  notifyEmail: boolean;
  notifySMS: boolean;
  frequency: "daily" | "weekly";
  isActive: boolean;
};

export default function JobAlerts() {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [newAlert, setNewAlert] = useState<AlertFormState>({
    name: "",
    keywords: "",
    location: "",
    jobType: "all",
    minSalary: "",
    maxSalary: "",
    experienceLevel: "",
    remote: false,
    industries: "",
    notifyEmail: false,
    notifySMS: false,
    frequency: "daily",
    isActive: true,
  });
  const [editingAlert, setEditingAlert] = useState<AlertFormState | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data: JobAlert[] = await apiClient.get("/api/job-alerts");
        setAlerts(data);
      } catch (error) {
        toast.error("Failed to load job alerts");
      }
    };
    fetchAlerts();
  }, []);

  const handleInputChange = (
    field: keyof AlertFormState,
    value: string | boolean
  ) => {
    const updateState = editingAlert ? setEditingAlert : setNewAlert;
    updateState((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const currentAlert = editingAlert || newAlert;
      const keywordsArray = currentAlert.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const industriesArray = currentAlert.industries
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      const alertData: Partial<JobAlert> = {
        name: currentAlert.name || "Unnamed Alert",
        keywords: keywordsArray.length > 0 ? keywordsArray : null,
        location: currentAlert.location || null,
        jobType: currentAlert.jobType === "all" ? null : currentAlert.jobType,
        minSalary: currentAlert.minSalary
          ? parseInt(currentAlert.minSalary, 10)
          : null,
        maxSalary: currentAlert.maxSalary
          ? parseInt(currentAlert.maxSalary, 10)
          : null,
        experienceLevel: currentAlert.experienceLevel || null,
        remote: currentAlert.remote,
        industries: industriesArray.length > 0 ? industriesArray : null,
        notifyEmail: currentAlert.notifyEmail,
        notifySMS: currentAlert.notifySMS,
        frequency: currentAlert.frequency,
        isActive: currentAlert.isActive,
      };

      if (editingAlert && editingAlert.id !== undefined) {
        const updatedAlert: JobAlert = await apiClient.patch(
          `/api/job-alerts/${editingAlert.id}`,
          alertData
        );
        setAlerts((prev) =>
          prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
        );
        setEditingAlert(null);
        toast.success("Job alert updated successfully");
      } else if (!editingAlert) {
        const createdAlert: JobAlert = await apiClient.post(
          "/api/job-alerts",
          alertData
        );
        setAlerts((prev) => [...prev, createdAlert]);
        setNewAlert({
          name: "",
          keywords: "",
          location: "",
          jobType: "all",
          minSalary: "",
          maxSalary: "",
          experienceLevel: "",
          remote: false,
          industries: "",
          notifyEmail: false,
          notifySMS: false,
          frequency: "daily",
          isActive: true,
        });
        toast.success("Job alert created successfully");
      } else {
        throw new Error("Invalid state: editingAlert has no id");
      }
    } catch (error) {
      toast.error(`Failed to ${editingAlert ? "update" : "create"} job alert`);
    }
  };

  const handleEdit = (alert: JobAlert) => {
    setEditingAlert({
      id: alert.id, // Preserve the id for updates
      name: alert.name ?? "",
      keywords: Array.isArray(alert.keywords)
        ? alert.keywords.join(", ")
        : alert.keywords ?? "",
      location: alert.location ?? "",
      jobType: alert.jobType ?? "all",
      minSalary: alert.minSalary?.toString() ?? "",
      maxSalary: alert.maxSalary?.toString() ?? "",
      experienceLevel: alert.experienceLevel ?? "",
      remote: alert.remote ?? false,
      industries: Array.isArray(alert.industries)
        ? alert.industries.join(", ")
        : alert.industries ?? "",
      notifyEmail: alert.notifyEmail ?? false,
      notifySMS: alert.notifySMS ?? false,
      frequency: alert.frequency ?? "daily",
      isActive: alert.isActive ?? true,
    });
  };

  const handleDelete = async (alertId: number) => {
    if (!confirm("Are you sure you want to delete this job alert?")) return;
    try {
      await apiClient.delete(`/api/job-alerts/${alertId}`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success("Job alert deleted successfully");
    } catch (error) {
      toast.error("Failed to delete job alert");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Job Alerts</h1>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingAlert ? "Edit Alert" : "Create New Alert"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g. My Job Alert"
                    value={editingAlert ? editingAlert.name : newAlert.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keywords</Label>
                  <Input
                    placeholder="e.g. React Developer, Software Engineer"
                    value={
                      editingAlert ? editingAlert.keywords : newAlert.keywords
                    }
                    onChange={(e) =>
                      handleInputChange("keywords", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g. New York, Remote"
                    value={
                      editingAlert ? editingAlert.location : newAlert.location
                    }
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select
                    value={
                      editingAlert ? editingAlert.jobType : newAlert.jobType
                    }
                    onValueChange={(value) =>
                      handleInputChange(
                        "jobType",
                        value as "all" | "full-time" | "part-time" | "contract"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Minimum Salary</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 50000"
                    value={
                      editingAlert ? editingAlert.minSalary : newAlert.minSalary
                    }
                    onChange={(e) =>
                      handleInputChange("minSalary", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Maximum Salary</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 100000"
                    value={
                      editingAlert ? editingAlert.maxSalary : newAlert.maxSalary
                    }
                    onChange={(e) =>
                      handleInputChange("maxSalary", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <Input
                    placeholder="e.g. Junior, Senior"
                    value={
                      editingAlert
                        ? editingAlert.experienceLevel
                        : newAlert.experienceLevel
                    }
                    onChange={(e) =>
                      handleInputChange("experienceLevel", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Industries</Label>
                  <Input
                    placeholder="e.g. Tech, Finance"
                    value={
                      editingAlert
                        ? editingAlert.industries
                        : newAlert.industries
                    }
                    onChange={(e) =>
                      handleInputChange("industries", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <Label>Preferences</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>Remote</span>
                    </div>
                    <Switch
                      checked={
                        editingAlert ? editingAlert.remote : newAlert.remote
                      }
                      onCheckedChange={(checked) =>
                        handleInputChange("remote", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>Email Notifications</span>
                    </div>
                    <Switch
                      checked={
                        editingAlert
                          ? editingAlert.notifyEmail
                          : newAlert.notifyEmail
                      }
                      onCheckedChange={(checked) =>
                        handleInputChange("notifyEmail", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>SMS Notifications</span>
                    </div>
                    <Switch
                      checked={
                        editingAlert
                          ? editingAlert.notifySMS
                          : newAlert.notifySMS
                      }
                      onCheckedChange={(checked) =>
                        handleInputChange("notifySMS", checked)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={
                        editingAlert
                          ? editingAlert.frequency
                          : newAlert.frequency
                      }
                      onValueChange={(value) =>
                        handleInputChange(
                          "frequency",
                          value as "daily" | "weekly"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button className="w-full mt-4" onClick={handleSubmit}>
                <Bell className="h-4 w-4 mr-2" />
                {editingAlert ? "Update Alert" : "Create Alert"}
              </Button>
              {editingAlert && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setEditingAlert(null)}
                >
                  Cancel
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-muted-foreground">No active alerts yet.</p>
                ) : (
                  alerts.map((alert) => (
                    <Card key={alert.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-medium">{alert.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {alert.location || "Any"} •{" "}
                              {alert.jobType || "All Types"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(alert)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(alert.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
