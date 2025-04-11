import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertApplicationSchema } from "@shared/schema";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast, Toaster } from "sonner";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";

export default function ApplyJob() {
  const [, setLocation] = useLocation();
  const { user } = useAuth(); // Get the logged-in user
  const { jobId } = useParams(); // Get the job ID from the URL

  const form = useForm({
    resolver: zodResolver(insertApplicationSchema),
    defaultValues: {
      jobId: Number(jobId), // Pre-fill the job ID
      seekerId: user?.id, // Pre-fill the seeker ID
      resumeUrl: "", // Required field
      coverLetter: "", // Optional field
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Mutation called with data:", data); // Debug
      const res = await apiRequest("POST", `/api/jobs/${jobId}/apply`, data); // Fix URL
      return res.json();
    },
    onSuccess: () => {
      console.log("Mutation succeeded"); // Debug
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast.success("Application Submitted ", {
        description: "Your application has been successfully submitted.",
      });
      setTimeout(() => setLocation("/seeker/jobs"), 1500); // Delay redirect
    },
    onError: (error) => {
      console.error("Mutation Error:", error); // Already present
      toast.error("Error", {
        description: "Failed to submit the application. Please try again.",
      });
    },
  });

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Apply for Job</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => {
                  if (!user) {
                    toast.error("Error", {
                      description: "You must be logged in to apply for a job.",
                    });
                    return;
                  }

                  const formData = {
                    ...data,
                    coverLetter: data.coverLetter || null, // Convert undefined to null
                  };

                  console.log("Form Data:", formData); // Debugging
                  mutation.mutate(formData);
                })}
                className="space-y-6"
              >
                {/* Resume URL */}
                <FormField
                  control={form.control}
                  name="resumeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resume URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Paste your resume URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cover Letter */}
                <FormField
                  control={form.control}
                  name="coverLetter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Letter (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write your cover letter..."
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
