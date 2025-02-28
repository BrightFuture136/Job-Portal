import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobSchema } from "@shared/schema";
import { useState } from "react"; // Add this import

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";

export default function PostJob() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [skills, setSkills] = useState<string[]>([]); // State for skills
  const [requirements, setRequirements] = useState<string[]>([]); // State for requirements
  const [benefits, setBenefits] = useState<string[]>([]); // State for benefits
  const { user } = useAuth(); // Assuming you have a hook to get the logged-in user
  const form = useForm({
    resolver: zodResolver(insertJobSchema),
    defaultValues: {
      title: "",
      description: "",
      company: "",
      location: "",
      salary: "",
      type: "full-time",
      applicationDeadline: "",
      skills: [] as string[], // Explicitly typed as string array
      requirements: [] as string[], // Explicitly typed as string array
      benefits: [] as string[], // Explicitly typed as string array
      experienceLevel: "",
      remote: false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/jobs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job Posted",
        description: "Your job listing has been successfully created.",
      });
      setLocation("/employer/applications");
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Post a New Job</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => {
                  if (!user) {
                    toast({
                      title: "Error",
                      description: "You must be logged in to post a job.",
                      variant: "destructive",
                    });
                    return;
                  }
                  const formData = {
                    ...data,
                    employerId: user.id,
                  };
                  mutation.mutate(formData);
                })}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Senior Software Engineer"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the role, responsibilities, and requirements..."
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Remote, New York, NY"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary Range</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. $80,000 - $120,000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employment Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Application Deadline */}
                  <FormField
                    control={form.control}
                    name="applicationDeadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Deadline</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills (Optional)</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {skills.map((skill, index) => (
                              <div
                                key={index}
                                className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                              >
                                {skill}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSkills = skills.filter(
                                      (_, i) => i !== index
                                    );
                                    setSkills(newSkills);
                                    form.setValue("skills", newSkills);
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <Input
                              placeholder="Add a skill (e.g. React, Python)"
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  e.currentTarget.value.trim()
                                ) {
                                  e.preventDefault();
                                  const newSkill = e.currentTarget.value.trim();
                                  const newSkills = [...skills, newSkill];
                                  setSkills(newSkills);
                                  form.setValue("skills", newSkills);
                                  e.currentTarget.value = "";
                                }
                              }}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Requirements */}
                  <FormField
                    control={form.control}
                    name="requirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirements (Optional)</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {requirements.map((requirement, index) => (
                              <div
                                key={index}
                                className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                              >
                                {requirement}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newRequirements = requirements.filter(
                                      (_, i) => i !== index
                                    );
                                    setRequirements(newRequirements);
                                    form.setValue(
                                      "requirements",
                                      newRequirements
                                    );
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <Input
                              placeholder="Add a requirement (e.g. 3+ years of experience)"
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  e.currentTarget.value.trim()
                                ) {
                                  e.preventDefault();
                                  const newRequirement =
                                    e.currentTarget.value.trim();
                                  const newRequirements = [
                                    ...requirements,
                                    newRequirement,
                                  ];
                                  setRequirements(newRequirements);
                                  form.setValue(
                                    "requirements",
                                    newRequirements
                                  );
                                  e.currentTarget.value = "";
                                }
                              }}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Benefits */}
                  <FormField
                    control={form.control}
                    name="benefits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Benefits (Optional)</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {benefits.map((benefit, index) => (
                              <div
                                key={index}
                                className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                              >
                                {benefit}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newBenefits = benefits.filter(
                                      (_, i) => i !== index
                                    );
                                    setBenefits(newBenefits);
                                    form.setValue("benefits", newBenefits);
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <Input
                              placeholder="Add a benefit (e.g. Health insurance)"
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  e.currentTarget.value.trim()
                                ) {
                                  e.preventDefault();
                                  const newBenefit =
                                    e.currentTarget.value.trim();
                                  const newBenefits = [...benefits, newBenefit];
                                  setBenefits(newBenefits);
                                  form.setValue("benefits", newBenefits);
                                  e.currentTarget.value = "";
                                }
                              }}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Experience Level */}
                  <FormField
                    control={form.control}
                    name="experienceLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience Level</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="entry-level">
                              Entry Level
                            </SelectItem>
                            <SelectItem value="mid-level">Mid Level</SelectItem>
                            <SelectItem value="senior-level">
                              Senior Level
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Remote */}
                  <FormField
                    control={form.control}
                    name="remote"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Remote Job</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Posting..." : "Post Job"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
