import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  TrendingUp,
  Users,
  Clock,
  UserCheck,
  LineChart,
} from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsData {
  totalApplications: number;
  views: number; // Replaced shortlisted with views
  interviewsScheduled: number;
  hired: number;
  avgTimeToHire: number;
  conversionRate: number;
  trends: { date: string; applications: number }[];
  jobCount: number;
  statusDistribution: {
    pending: number;
    accepted: number;
    rejected: number;
    interview: number;
    hired: number;
  };
}

export default function Analytics() {
  const [timePeriod, setTimePeriod] = useState("30");
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalApplications: 0,
    views: 0, // Updated
    interviewsScheduled: 0,
    hired: 0,
    avgTimeToHire: 0,
    conversionRate: 0,
    trends: [],
    jobCount: 0,
    statusDistribution: {
      pending: 0,
      accepted: 0,
      rejected: 0,
      interview: 0,
      hired: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics?days=${timePeriod}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch analytics: ${response.status}`);
        }

        const data = await response.json();
        console.log("Analytics Data:", data); // Debug log
        setAnalytics({
          totalApplications: data.totalApplications || 0,
          views: data.views || 0, // Updated
          interviewsScheduled: data.interviewsScheduled || 0,
          hired: data.hired || 0,
          avgTimeToHire: data.avgTimeToHire || 0,
          conversionRate: data.conversionRate || 0,
          trends: Array.isArray(data.trends) ? data.trends : [],
          jobCount: data.jobCount || 0,
          statusDistribution: data.statusDistribution || {
            pending: 0,
            accepted: 0,
            rejected: 0,
            interview: 0,
            hired: 0,
          },
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setAnalytics({
          totalApplications: 0,
          views: 0, // Updated
          interviewsScheduled: 0,
          hired: 0,
          avgTimeToHire: 0,
          conversionRate: 0,
          trends: [],
          jobCount: 0,
          statusDistribution: {
            pending: 0,
            accepted: 0,
            rejected: 0,
            interview: 0,
            hired: 0,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timePeriod]);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/applications/export", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "applications.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  const trendChartData = {
    labels:
      analytics.trends.length > 0
        ? analytics.trends.map((t) => t.date)
        : ["No Data"],
    datasets: [
      {
        label: "Applications",
        data:
          analytics.trends.length > 0
            ? analytics.trends.map((t) => t.applications)
            : [0],
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.1,
      },
    ],
  };

  const statusChartData = {
    labels: ["Pending", "Accepted", "Rejected", "Interview", "Hired"],
    datasets: [
      {
        label: "Applications by Status",
        data: [
          analytics.statusDistribution.pending,
          analytics.statusDistribution.accepted,
          analytics.statusDistribution.rejected,
          analytics.statusDistribution.interview,
          analytics.statusDistribution.hired,
        ],
        backgroundColor: [
          "rgba(255, 99, 132, 0.5)",
          "rgba(54, 162, 235, 0.5)",
          "rgba(255, 206, 86, 0.5)",
          "rgba(75, 192, 192, 0.5)",
          "rgba(153, 102, 255, 0.5)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="min-h-screen bg-background ">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <div className="flex items-center gap-4">
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Applications
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "Loading..." : analytics.totalApplications}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.jobCount > 0
                    ? `${Math.round(
                        analytics.totalApplications / analytics.jobCount
                      )} per job`
                    : "No jobs posted"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Total Views
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "Loading..." : analytics.views}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.jobCount > 0
                    ? `${Math.round(
                        analytics.views / analytics.jobCount
                      )} per job`
                    : "No views yet"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Avg Time to Hire
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "Loading..." : `${analytics.avgTimeToHire} days`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.hired > 0
                    ? `Based on ${analytics.hired} hires`
                    : "No hires yet"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Conversion Rate
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "Loading..." : `${analytics.conversionRate}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.hired > 0
                    ? `${analytics.hired} hired`
                    : "No hires yet"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Application Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <p>Loading chart...</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <Line data={trendChartData} options={chartOptions} />
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Application Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <p>Loading chart...</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <Bar data={statusChartData} options={chartOptions} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
