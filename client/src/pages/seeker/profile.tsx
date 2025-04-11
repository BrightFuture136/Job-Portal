import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Application } from "@shared/schema";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  MapPin,
  Building2,
  BookOpen,
  Briefcase,
  GraduationCap,
  Plus,
  X,
  Camera,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { queryClient } from "@/lib/queryClient";
import { toast, Toaster } from "sonner";
import axios from "axios";
import { useEffect } from "react";

// Define the form data type explicitly
type ProfileFormData = {
  bio: string;
  location: string;
  resumeUrl: string;
  profileImageUrl: string;
  skills: string[];
  education: {
    school: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string | undefined;
  }[];
  experience: {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string | undefined;
    description: string | undefined;
  }[];
  phone: string;
  email: string;
};

// Define the Zod schema
const profileSchema = z.object({
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  location: z
    .string()
    .max(100, "Location must be 100 characters or less")
    .optional(),
  resumeUrl: z.string().optional(),
  profileImageUrl: z.string().optional(),
  skills: z.array(z.string()).optional(),
  education: z
    .array(
      z.object({
        school: z.string().min(1, "School is required"),
        degree: z.string().min(1, "Degree is required"),
        fieldOfStudy: z.string().min(1, "Field of study is required"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().optional(),
      })
    )
    .optional(),
  experience: z
    .array(
      z.object({
        title: z.string().min(1, "Job title is required"),
        company: z.string().min(1, "Company is required"),
        location: z.string().min(1, "Location is required"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
  phone: z.string().max(20, "Phone must be 20 characters or less").optional(),
  email: z.string().email("Invalid email address").optional(),
});

export default function Profile() {
  const { user } = useAuth();

  // Fetch resume data
  const { data: resumeData, isLoading: resumeLoading } = useQuery({
    queryKey: ["resume", user?.id],
    queryFn: async () => {
      const response = await axios.get("/api/profile/resume", {
        withCredentials: true,
      });
      // console.log("Fetched resume data:", response.data); // Debug log
      return response.data;
    },
    enabled: !!user,
  });

  // Fetch applications for the seeker
  const { data: applications, isLoading: applicationsLoading } = useQuery<
    Application[]
  >({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      const response = await axios.get("/api/applications/seeker", {
        withCredentials: true,
      });
      console.log("Fetched applications:", response.data); // Debug log
      return response.data;
    },
    enabled: !!user && user.role === "seeker",
  });

  // Fetch seeker profile data
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const response = await axios.get("/api/profile/me", {
        withCredentials: true,
      });
      console.log("Fetched profile data:", response.data); // Debug log
      return response.data;
    },
    enabled: !!user,
    // Remove initialData to avoid overriding with stale user data
  });

  // Form setup with explicit type
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      location: "",
      resumeUrl: "",
      profileImageUrl: "",
      skills: [],
      education: [],
      experience: [],
      phone: "",
      email: "",
    },
  });

  // Update form defaults when profileData or resumeData changes
  useEffect(() => {
    if (profileData || resumeData) {
      console.log("Updating form with profileData:", profileData); // Debug log
      console.log("Updating form with resumeData:", resumeData); // Debug log
      form.reset({
        bio: profileData?.bio || "",
        location: profileData?.location || "",
        resumeUrl: resumeData?.resumeUrl || profileData?.resumeUrl || "",
        profileImageUrl: profileData?.profileImageUrl || "",
        skills: profileData?.skills || [],
        education: profileData?.education || [],
        experience: profileData?.experience || [],
        phone: profileData?.phone || "",
        email: profileData?.email || "",
      });
    }
  }, [profileData, resumeData, form]);

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({
    control: form.control,
    name: "education",
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({
    control: form.control,
    name: "experience",
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const formData = new FormData();
      if (data.skills?.length)
        formData.append("skills", data.skills.join(", "));
      if (data.bio) formData.append("bio", data.bio);
      if (data.location) formData.append("location", data.location);
      if (data.education?.length)
        formData.append("education", JSON.stringify(data.education));
      if (data.experience?.length)
        formData.append("experience", JSON.stringify(data.experience));
      if (data.phone) formData.append("phone", data.phone);
      if (data.email) formData.append("email", data.email);

      const response = await axios.post("/api/profile/update", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Update response:", response.data); // Debug log
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["resume", user?.id] });
      toast.success("Profile Updated", {
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      console.error("Update error:", error); // Debug log
      toast.error("Update Failed", {
        description:
          error.response?.data?.message || "Failed to update profile.",
      });
    },
  });

  // Handle file uploads
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "resume" | "profileImage"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(field, file);

    try {
      const response = await axios.post("/api/profile/update", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Upload response:", response.data); // Debug log
      const { resumeUrl, profileImageUrl } = response.data.user;
      if (field === "resume") {
        form.setValue("resumeUrl", resumeUrl);
        toast.success(
          resumeData?.resumeUrl ? "Resume Updated" : "Resume Uploaded",
          {
            description: resumeData?.resumeUrl
              ? "Your resume has been successfully updated."
              : "Your resume has been successfully uploaded.",
          }
        );
      } else {
        form.setValue("profileImageUrl", profileImageUrl);
        toast.success(
          profileData?.profileImageUrl
            ? "Profile Image Updated"
            : "Profile Image Uploaded",
          {
            description: profileData?.profileImageUrl
              ? "Your profile image has been successfully updated."
              : "Your profile image has been successfully uploaded.",
          }
        );
      }
      queryClient.invalidateQueries({ queryKey: ["resume", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    } catch (error: any) {
      console.error("Upload error:", error); // Debug log
      toast.error("Upload Failed", {
        description:
          error.response?.data?.message || `Failed to upload ${field}.`,
      });
    }
  };

  if (profileLoading || applicationsLoading || resumeLoading)
    return <div className="p-8 text-center">Loading...</div>;
  if (!user)
    return (
      <div className="p-8 text-center">Please log in to view your profile.</div>
    );

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Profile Form */}
          <div className="space-y-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) =>
                  updateProfileMutation.mutate(data)
                )}
              >
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl font-semibold">
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Profile Image Preview and Upload */}
                    <div className="space-y-2">
                      <Label>Profile Image</Label>
                      <div className="flex items-center gap-4 flex-wrap">
                        {form.watch("profileImageUrl") ? (
                          <img
                            src={form.watch("profileImageUrl")}
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover border border-gray-300"
                            onError={(e) => {
                              console.error("Failed to load profile image");
                              e.currentTarget.src =
                                "https://via.placeholder.com/96";
                            }}
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-12 w-12" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          <Input
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={(e) =>
                              handleFileUpload(e, "profileImage")
                            }
                            className="border-gray-300 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Username</Label>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{profileData?.username}</span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Add your location"
                                className="border-gray-300 focus:border-blue-500"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <div className="flex items-start gap-2">
                            <Building2 className="h-4 w-4 mt-2" />
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Tell employers about yourself"
                                className="min-h-[100px] border-gray-300 focus:border-blue-500"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Add your phone number"
                              className="border-gray-300 focus:border-blue-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="Add your email"
                              className="border-gray-300 focus:border-blue-500"
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Resume</Label>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => handleFileUpload(e, "resume")}
                            className="border-gray-300 focus:border-blue-500"
                          />
                        </div>
                        {resumeLoading ? (
                          <span>Loading...</span>
                        ) : form.watch("resumeUrl") ? (
                          <a
                            href={form.watch("resumeUrl")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline  text-blue-500"
                          >
                            View Current Resume
                          </a>
                        ) : (
                          <span>No resume uploaded yet</span>
                        )}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skills</FormLabel>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Add skills (comma separated)"
                                value={field.value?.join(", ") || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                  )
                                }
                                className="border-gray-300 focus:border-blue-500"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Education</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            appendEducation({
                              school: "",
                              degree: "",
                              fieldOfStudy: "",
                              startDate: "",
                              endDate: "",
                            })
                          }
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                      {educationFields.map((field, index) => (
                        <Card key={field.id} className="shadow-sm">
                          <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between">
                              <GraduationCap className="h-4 w-4" />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEducation(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <FormField
                              control={form.control}
                              name={`education.${index}.school`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="School"
                                      className="border-gray-300 focus:border-blue-500"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`education.${index}.degree`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Degree"
                                      className="border-gray-300 focus:border-blue-500"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`education.${index}.fieldOfStudy`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Field of Study"
                                      className="border-gray-300 focus:border-blue-500"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`education.${index}.startDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="date"
                                        placeholder="Start Date"
                                        className="border-gray-300 focus:border-blue-500"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`education.${index}.endDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="date"
                                        placeholder="End Date"
                                        className="border-gray-300 focus:border-blue-500"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Experience</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            appendExperience({
                              title: "",
                              company: "",
                              location: "",
                              startDate: "",
                              endDate: "",
                              description: "",
                            })
                          }
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                      {experienceFields.map((field, index) => (
                        <Card key={field.id} className="shadow-sm">
                          <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between">
                              <Briefcase className="h-4 w-4" />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExperience(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <FormField
                              control={form.control}
                              name={`experience.${index}.title`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Job Title"
                                      className="border-gray-300 focus:border-blue-500"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`experience.${index}.company`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Company"
                                      className="border-gray-300 focus:border-blue-500"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`experience.${index}.location`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Location"
                                      className="border-gray-300 focus:border-blue-500"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`experience.${index}.startDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="date"
                                        placeholder="Start Date"
                                        className="border-gray-300 focus:border-blue-500"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`experience.${index}.endDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="date"
                                        placeholder="End Date"
                                        className="border-gray-300 focus:border-blue-500"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name={`experience.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      placeholder="Description"
                                      className="border-gray-300 focus:border-blue-500"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending
                        ? "Updating..."
                        : "Update Profile"}
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </Form>
          </div>

          {/* Applications Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">My Applications</h2>
            {applications?.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-8 text-center">
                  You haven’t applied to any jobs yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {applications?.map((application) => (
                  <Card key={application.id} className="shadow-sm">
                    <CardContent className="py-6 flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="font-medium">
                          Job #{application.jobId}
                        </div>
                        <div className="text-sm">
                          Applied on{" "}
                          {application.appliedAt
                            ? new Date(
                                application.appliedAt
                              ).toLocaleDateString()
                            : "Just now"}
                        </div>
                        {application.coverLetter && (
                          <div className="text-sm">Included cover letter</div>
                        )}
                        {application.resumeUrl && (
                          <a
                            href={application.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-sm  text-blue-500"
                          >
                            View Resume
                          </a>
                        )}
                      </div>
                      <Badge
                        variant={
                          application.status === "accepted"
                            ? "default"
                            : application.status === "rejected"
                            ? "destructive"
                            : application.status === "interview"
                            ? "outline"
                            : application.status === "hired"
                            ? "default"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {application.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
