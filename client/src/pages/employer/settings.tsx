import { useState, useEffect } from "react";
import axios from "axios";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, CreditCard, KeyRound } from "lucide-react";
import { toast } from "react-hot-toast";

export default function Settings() {
  const [profile, setProfile] = useState({
    companyName: "",
    email: "",
    phoneNumber: "",
  });
  const [notifications, setNotifications] = useState({
    newApplications: false,
    emailDigest: false,
  });
  const [security, setSecurity] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [billing, setBilling] = useState({
    currentPlan: "Free",
    price: 0,
    paymentStatus: "inactive",
  });
  const [loading, setLoading] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get("/api/settings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      console.log("Fetched settings:", response.data); // Log response
      const data = response.data;
      setProfile({
        companyName: data.companyName || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber || "", // Changed from phone to phoneNumber
      });
      setNotifications({
        newApplications: data.notifications?.newApplications || false,
        emailDigest: data.notifications?.emailDigest || false,
      });
      setBilling({
        currentPlan: data.currentPlan || "Free",
        price: data.price || 0,
        paymentStatus: data.paymentStatus || "inactive",
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    }
  };
  
  const saveProfile = async () => {
    setLoading(true);
    try {
      console.log("Saving profile:", profile); // Log payload
      const response = await axios.patch("/api/settings/profile", profile, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      console.log("Profile update response:", response.data); // Log response
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };
  
  const handleNotificationToggle = async (key: keyof typeof notifications) => {
    const updatedNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(updatedNotifications);
    try {
      console.log("Updating notifications:", { [key]: updatedNotifications[key] }); // Log payload
      const response = await axios.patch(
        "/api/settings/notifications",
        { [key]: updatedNotifications[key] },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      console.log("Notifications update response:", response.data); // Log response
      toast.success("Notification settings updated");
    } catch (error) {
      console.error("Error updating notifications:", error);
      toast.error("Failed to update notifications");
    }
  };
  
  const submitPaymentScreenshot = async (plan: string) => {
    if (!paymentScreenshot) {
      toast.error("Please upload a payment screenshot");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("screenshot", paymentScreenshot);
    formData.append("plan", plan);
  
    try {
      console.log("Submitting payment for plan:", plan); // Log plan
      const response = await axios.post("/api/settings/billing/verify", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("Payment submission response:", response.data); // Log response
      toast.success("Payment screenshot submitted for verification");
      setPaymentScreenshot(null);
      fetchSettings(); // Refresh billing status
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error("Failed to submit payment");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSecurity({ ...security, [e.target.name]: e.target.value });
  };

  const changePassword = async () => {
    if (security.newPassword !== security.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await axios.patch(
        "/api/settings/security/password",
        { newPassword: security.newPassword },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success("Password changed successfully");
      setSecurity({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPaymentScreenshot(e.target.files[0]);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  name="companyName"
                  value={profile.companyName}
                  onChange={handleProfileChange}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  placeholder="Enter email"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  name="phoneNumber"
                  type="tel"
                  value={profile.phoneNumber}
                  onChange={handleProfileChange}
                  placeholder="Enter phone number"
                />
              </div>
              <Button onClick={saveProfile} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <Label>New Applications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when candidates apply
                  </p>
                </div>
                <Switch
                  checked={notifications.newApplications}
                  onCheckedChange={() =>
                    handleNotificationToggle("newApplications")
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <Label>Email Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive daily digest emails
                  </p>
                </div>
                <Switch
                  checked={notifications.emailDigest}
                  onCheckedChange={() =>
                    handleNotificationToggle("emailDigest")
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  name="newPassword"
                  type="password"
                  value={security.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                />
                <Label>Confirm Password</Label>
                <Input
                  name="confirmPassword"
                  type="password"
                  value={security.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                />
                <Button onClick={changePassword} disabled={loading}>
                  {loading ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Current Plan</h4>
                <p className="font-medium">{billing.currentPlan}</p>
                <p className="text-sm text-muted-foreground">
                  ${billing.price}/month - Status: {billing.paymentStatus}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Available Plans</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Professional Plan - $49/month</span>
                    {billing.currentPlan !== "Professional" && (
                      <Button
                        variant="outline"
                        onClick={() => submitPaymentScreenshot("professional")}
                        disabled={
                          loading || billing.paymentStatus === "pending"
                        }
                      >
                        {loading ? "Submitting..." : "Upgrade"}
                      </Button>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Enterprise Plan - $99/month</span>
                    {billing.currentPlan !== "Enterprise" && (
                      <Button
                        variant="outline"
                        onClick={() => submitPaymentScreenshot("enterprise")}
                        disabled={
                          loading || billing.paymentStatus === "pending"
                        }
                      >
                        {loading ? "Submitting..." : "Upgrade"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {billing.paymentStatus !== "active" && (
                <div className="space-y-2">
                  <Label>Upload Payment Screenshot</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    Transfer to: Commercial Bank of Ethiopia, Account:
                    1234-5678-9012, then upload the receipt.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
