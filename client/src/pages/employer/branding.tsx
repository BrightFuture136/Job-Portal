"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Image as ImageIcon,
  Building2,
  Users,
  Globe,
  Calendar,
  Loader2,
} from "lucide-react";
import axios from "axios";

interface CompanyBranding {
  companyName: string;
  industry: string;
  website: string;
  about: string;
  culture: string;
  benefits: string;
  logoUrl?: string;
  officePhotos?: string[];
  companySize?: string;
  location?: string;
  founded?: string;
}

interface User {
  id: number;
  role: "employer" | "seeker";
}

export default function Branding() {
  const [branding, setBranding] = useState<CompanyBranding>({
    companyName: "",
    industry: "",
    website: "",
    about: "",
    culture: "",
    benefits: "",
    logoUrl: "",
    officePhotos: [],
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]); // For new uploads
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]); // For display
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start as true for initial load
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndBranding = async () => {
      try {
        const userResponse = await axios.get("/api/auth/me", {
          withCredentials: true,
        });
        const fetchedUser = userResponse.data;
        if (fetchedUser.role !== "employer") {
          setError("Only employers can access this page.");
          setLoading(false);
          return;
        }
        setUser(fetchedUser);

        const brandingResponse = await axios.get(
          `/api/employer/branding?employerId=${fetchedUser.id}`,
          { withCredentials: true }
        );
        const fetchedBranding = brandingResponse.data;
        setBranding(fetchedBranding);
        setPhotoPreviews(fetchedBranding.officePhotos || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please ensure you're logged in.");
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndBranding();

    // Cleanup function to revoke object URLs
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setBranding((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      const logoUrl = URL.createObjectURL(file);
      setBranding((prev) => ({ ...prev, logoUrl }));
    }
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalPhotos = photoPreviews.length + newFiles.length;

      if (totalPhotos > 10) {
        setError("You can only upload up to 10 office photos.");
        return;
      }

      setPhotoFiles((prev) => [...prev, ...newFiles]);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to save branding.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("companyName", branding.companyName);
      formData.append("industry", branding.industry);
      formData.append("website", branding.website);
      formData.append("about", branding.about);
      formData.append("culture", branding.culture);
      formData.append("benefits", branding.benefits);
      if (logoFile) formData.append("logo", logoFile);
      photoFiles.forEach((photo) => formData.append("officePhotos", photo));

      const response = await axios.post("/api/employer/branding", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      setBranding(response.data);
      setPhotoPreviews(response.data.officePhotos || []);
      setLogoFile(null);
      setPhotoFiles([]);
      alert("Branding saved successfully!");
    } catch (err) {
      console.error("Error saving branding:", err);
      setError("Failed to save branding.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background bg-gray-50 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background bg-gray-50 flex justify-center items-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-4">
          <h1 className="text-3xl font-bold">Company Branding</h1>
          <p className="text-muted-foreground">
            Showcase your company culture and attract top talent.
          </p>
          {error && <p className="text-red-500">{error}</p>}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-24 w-24 rounded-lg border-2 border-dashed flex items-center justify-center">
                        {branding.logoUrl ? (
                          <img
                            src={branding.logoUrl}
                            alt="Company Logo"
                            className="h-full w-full object-cover rounded-lg"
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <label htmlFor="logo-upload">
                        <Button variant="outline" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Logo
                          </span>
                        </Button>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleLogoChange}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      name="companyName"
                      value={branding.companyName}
                      onChange={handleInputChange}
                      placeholder="Enter company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input
                      name="industry"
                      value={branding.industry}
                      onChange={handleInputChange}
                      placeholder="e.g. Technology, Healthcare, Finance"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      name="website"
                      value={branding.website}
                      onChange={handleInputChange}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>About Company</Label>
                    <Textarea
                      name="about"
                      value={branding.about}
                      onChange={handleInputChange}
                      placeholder="Describe your company's mission, values, and culture"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Culture & Benefits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Work Culture</Label>
                    <Textarea
                      name="culture"
                      value={branding.culture}
                      onChange={handleInputChange}
                      placeholder="Describe your work environment and team culture"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Benefits & Perks</Label>
                    <Textarea
                      name="benefits"
                      value={branding.benefits}
                      onChange={handleInputChange}
                      placeholder="List the benefits and perks you offer to employees"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Office Photos ({photoPreviews.length}/10)</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {photoPreviews.length > 0
                        ? photoPreviews.map((photo, index) => (
                            <img
                              key={index}
                              src={photo}
                              alt={`Office Photo ${index + 1}`}
                              className="aspect-video rounded-lg object-cover"
                            />
                          ))
                        : [1, 2, 3].map((n) => (
                            <div
                              key={n}
                              className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center"
                            >
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          ))}
                    </div>
                    <label htmlFor="photos-upload">
                      <Button variant="outline" asChild className="mt-2">
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Add Photos
                        </span>
                      </Button>
                      <input
                        id="photos-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handlePhotosChange}
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {branding.industry || "Technology"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {branding.companySize || "1000+ employees"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {branding.location || "Worldwide"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {branding.founded || "Founded in 2010"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center">
                    {branding.companyName ? (
                      <div className="text-center">
                        <h3 className="font-bold">{branding.companyName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {branding.industry}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Company profile preview
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
