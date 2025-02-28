"use client";

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
import { Download, TrendingUp, Users, Clock, UserCheck } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Analytics() {
  const [timePeriod, setTimePeriod] = useState("30");
  const [overview, setOverview] = useState({
    totalViews: 0,
    totalApplications: 0,
    avgTimeToHire: 0,
    conversionRate: 0,
  });
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch overview
        const overviewRes = await fetch("/api/analytics/overview", {
          credentials: "include", // Include cookies for authentication
        });
        if (!overviewRes.ok)
          throw new Error(`Overview fetch failed: ${overviewRes.status}`);
        const overviewData = await overviewRes.json();
        console.log("Overview data:", overviewData);
        setOverview(overviewData);

        // Fetch trends
        const trendsRes = await fetch(
          `/api/analytics/trends?days=${timePeriod}`,
          {
            credentials: "include",
          }
        );
        if (!trendsRes.ok)
          throw new Error(`Trends fetch failed: ${trendsRes.status}`);
        const trendsData = await trendsRes.json();
        console.log("Trends data:", trendsData);
        setTrends(trendsData);
      } catch (err) {
        console.error("Fetch error:", err);
        // setError(err.message || "Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timePeriod]);

  const handleExport = async () => {
    window.location.href = "/api/applications/export";
  };

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="min-h-screen bg-background bg-gray-50">
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
              <Button variant="outline" onClick={handleExport}>
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
                    <TrendingUp className="h-4 w-4" />
                    Total Views
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.totalViews.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Job posting views
                </p>
              </CardContent>
            </Card>
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
                  {overview.totalApplications}
                </div>
                <p className="text-xs text-muted-foreground">
                  Received applications
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time to Hire
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.avgTimeToHire} days
                </div>
                <p className="text-xs text-muted-foreground">
                  Average hiring time
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
                  {overview.conversionRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Applications to hires
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
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="applications"
                        stroke="#8884d8"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Source Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Source distribution tracking requires additional
                    implementation
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
