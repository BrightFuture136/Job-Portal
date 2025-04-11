import { useState, useEffect } from "react";
import axios from "axios";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

type Subscription = {
  id: number;
  userId: number;
  plan: "free" | "professional" | "enterprise";
  price: number;
  screenshotUrl: string;
  status: "pending" | "active" | "rejected";
  createdAt: string;
  updatedAt: string;
  username: string;
  email: string;
};

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/admin/subscriptions", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      console.log("API response:", response.data);
      setSubscriptions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      setSubscriptions([]);
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const verifySubscription = async (
    id: number,
    status: "active" | "rejected"
  ) => {
    setLoading(true);
    try {
      await axios.patch(
        `/api/admin/subscriptions/${id}/verify`,
        { status },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success(
        `Subscription ${status === "active" ? "approved" : "rejected"}`
      );
      fetchSubscriptions();
    } catch (error) {
      console.error("Error verifying subscription:", error);
      toast.error("Failed to verify subscription");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">
          Admin - Subscription Verification
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Pending Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptions.filter((sub) => sub.status === "pending").length ===
            0 ? (
              <p>No pending subscriptions</p>
            ) : (
              subscriptions
                .filter((sub) => sub.status === "pending")
                .map((sub) => (
                  <div key={sub.id} className="border-b py-4 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">User ID: {sub.userId}</p>
                        <p >User Email: {sub.email}</p>
                        <p >User Name: {sub.username}</p>
                        <p>Plan: {sub.plan}</p>
                        <p>Price: ${(sub.price / 100).toFixed(2)}</p>
                        <p>
                          Submitted: {new Date(sub.createdAt).toLocaleString()}
                        </p>
                        <a
                          href={sub.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Screenshot
                        </a>
                      </div>
                      <div className="space-x-2">
                        <Button
                          onClick={() => verifySubscription(sub.id, "active")}
                          disabled={loading}
                          variant="outline"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => verifySubscription(sub.id, "rejected")}
                          disabled={loading}
                          variant="destructive"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
