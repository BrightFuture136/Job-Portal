import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Application } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { User, MapPin, Building2, BookOpen, Briefcase, GraduationCap, Plus, X } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: applications } = useQuery<Application[]>({
    queryKey: ["/api/applications/seeker"],
  });

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: user?.username,
      bio: user?.bio || "",
      location: user?.location || "",
      resumeUrl: user?.resumeUrl || "", // Added resumeUrl to defaultValues
      education: user?.education || [],
      experience: user?.experience || [],
      skills: user?.skills || [],
    },
  });

  const { fields: educationFields, append: appendEducation, remove: removeEducation } =
    useFieldArray({
      control: form.control,
      name: "education",
    });

  const { fields: experienceFields, append: appendExperience, remove: removeExperience } =
    useFieldArray({
      control: form.control,
      name: "experience",
    });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");

      const { url } = await response.json();
      form.setValue("resumeUrl", url);
      toast({
        title: "Resume Uploaded",
        description: "Your resume has been successfully uploaded.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{user?.username}</span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <FormControl>
                              <Input {...field} placeholder="Add your location" />
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
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Tell employers about yourself"
                                className="min-h-[100px]"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Resume</Label>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileUpload}
                        />
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skills</FormLabel>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <FormControl>
                              <Input
                                placeholder="Add skills (comma separated)"
                                value={field.value?.join(", ") || ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value.split(",").map((s) => s.trim()))
                                }
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
                          Add Education
                        </Button>
                      </div>

                      {educationFields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="pt-6">
                            <div className="flex justify-between mb-4">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEducation(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-4">
                              <Input
                                placeholder="School"
                                {...form.register(`education.${index}.school`)}
                              />
                              <Input
                                placeholder="Degree"
                                {...form.register(`education.${index}.degree`)}
                              />
                              <Input
                                placeholder="Field of Study"
                                {...form.register(`education.${index}.fieldOfStudy`)}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <Input
                                  type="date"
                                  placeholder="Start Date"
                                  {...form.register(`education.${index}.startDate`)}
                                />
                                <Input
                                  type="date"
                                  placeholder="End Date"
                                  {...form.register(`education.${index}.endDate`)}
                                />
                              </div>
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
                          Add Experience
                        </Button>
                      </div>

                      {experienceFields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="pt-6">
                            <div className="flex justify-between mb-4">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExperience(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-4">
                              <Input
                                placeholder="Job Title"
                                {...form.register(`experience.${index}.title`)}
                              />
                              <Input
                                placeholder="Company"
                                {...form.register(`experience.${index}.company`)}
                              />
                              <Input
                                placeholder="Location"
                                {...form.register(`experience.${index}.location`)}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <Input
                                  type="date"
                                  placeholder="Start Date"
                                  {...form.register(`experience.${index}.startDate`)}
                                />
                                <Input
                                  type="date"
                                  placeholder="End Date"
                                  {...form.register(`experience.${index}.endDate`)}
                                />
                              </div>
                              <Textarea
                                placeholder="Description"
                                {...form.register(`experience.${index}.description`)}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </Form>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold">My Applications</h2>
            {applications && applications.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  You haven't applied to any jobs yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {applications?.map((application) => (
                  <Card key={application.id}>
                    <CardContent className="py-6 flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="font-medium">Job #{application.jobId}</div>
                        <div className="text-sm text-muted-foreground">
                          Applied on {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : "Just now"} {/* Updated date formatting */}
                        </div>
                        {application.coverLetter && (
                          <div className="text-sm text-muted-foreground">
                            Included cover letter
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={
                          application.status === "accepted"
                            ? "default"
                            : application.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
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