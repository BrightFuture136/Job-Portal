import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, Building2, MapPin, User, Mail, Phone } from "lucide-react";
import { useState } from "react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  // Schema definitions
  const emailSchema = z.string().email({ message: "Invalid email address" });
  const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, {
    message: "Invalid phone number format",
  });

  const passwordSchema = z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, {
      message: "Password must contain at least one special character",
    });

  // Modified schema to make phone optional and only required for seekers
  const registerSchema = insertUserSchema
    .extend({
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string(),
      phone: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    })
    .refine(
      (data) =>
        data.role === "seeker"
          ? phoneSchema.safeParse(data.phone).success
          : true,
      {
        message: "Phone number is required for job seekers",
        path: ["phone"],
      }
    );

  // Password strength checker
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
  }>({ score: 0, label: "", color: "" });

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    let label = "";
    let color = "";
    switch (score) {
      case 0:
      case 1:
        label = "Easy";
        color = "bg-red-500";
        break;
      case 2:
      case 3:
        label = "Medium";
        color = "bg-yellow-500";
        break;
      case 4:
        label = "Difficult";
        color = "bg-blue-500";
        break;
      case 5:
        label = "Extremely Difficult";
        color = "bg-green-500";
        break;
    }

    setPasswordStrength({ score, label, color });
    return score;
  };

  const loginForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: "seeker",
      companyName: "",
      bio: "",
      location: "",
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 animate-in fade-in duration-500">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="relative">
            <CardTitle className="text-2xl font-bold text-center transition-transform duration-300 hover:scale-105">
              Welcome to DreamJobs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 hover:bg-primary/10"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 hover:bg-primary/10"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="login"
                className="animate-in slide-in-from-left-5 duration-300"
              >
                <form
                  onSubmit={loginForm.handleSubmit((data) =>
                    loginMutation.mutate(data)
                  )}
                >
                  <div className="space-y-4">
                    <div className="space-y-2 group">
                      <Label
                        htmlFor="email"
                        className="transition-colors duration-300 group-hover:text-primary"
                      >
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                        <Input
                          id="email"
                          type="email"
                          className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary"
                          {...loginForm.register("email")}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2 group">
                      <Label
                        htmlFor="password"
                        className="transition-colors duration-300 group-hover:text-primary"
                      >
                        Password
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                        <Input
                          id="password"
                          type="password"
                          className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary"
                          {...loginForm.register("password")}
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin h-5 w-5 mr-2"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8z"
                            />
                          </svg>
                          Logging in...
                        </span>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent
                value="register"
                className="animate-in slide-in-from-right-5 duration-300"
              >
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit((data) => {
                      if (passwordStrength.score < 2) return;
                      const validatedData = {
                        ...data,
                        role: data.role as "seeker" | "employer",
                      };
                      registerMutation.mutate(validatedData);
                    })}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem className="group">
                          <Label className="transition-colors duration-300 group-hover:text-primary">
                            Role
                          </Label>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="transition-all duration-300 focus:ring-2 focus:ring-primary">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem
                                value="seeker"
                                className="hover:bg-primary/10 transition-colors duration-200"
                              >
                                Job Seeker
                              </SelectItem>
                              <SelectItem
                                value="employer"
                                className="hover:bg-primary/10 transition-colors duration-200"
                              >
                                Employer
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="group">
                          <Label className="transition-colors duration-300 group-hover:text-primary">
                            Email
                          </Label>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                              <Input
                                className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary"
                                type="email"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem className="group">
                          <Label className="transition-colors duration-300 group-hover:text-primary">
                            Username
                          </Label>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                              <Input
                                className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="group">
                          <Label className="transition-colors duration-300 group-hover:text-primary">
                            Password
                          </Label>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                              <Input
                                className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary"
                                type="password"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  checkPasswordStrength(e.target.value);
                                }}
                              />
                            </div>
                          </FormControl>
                          {passwordStrength.label && (
                            <div className="mt-2 animate-in fade-in duration-300">
                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <div
                                    key={i}
                                    className={`h-2 w-full rounded transition-all duration-300 ${
                                      passwordStrength.score >= i
                                        ? passwordStrength.color
                                        : "bg-gray-200"
                                    }`}
                                  />
                                ))}
                              </div>
                              <p
                                className={`text-sm mt-1 ${
                                  passwordStrength.score < 2
                                    ? "text-red-500"
                                    : "text-gray-600"
                                }`}
                              >
                                Strength: {passwordStrength.label}
                                {passwordStrength.score < 2 &&
                                  " - Minimum strength required: Medium"}
                              </p>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem className="group">
                          <Label className="transition-colors duration-300 group-hover:text-primary">
                            Confirm Password
                          </Label>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                              <Input
                                className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary"
                                type="password"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {registerForm.watch("role") === "seeker" && (
                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="group animate-in fade-in duration-300">
                            <Label className="transition-colors duration-300 group-hover:text-primary">
                              Phone Number
                            </Label>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                                <Input
                                  className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary"
                                  placeholder="+1234567890"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {registerForm.watch("role") === "employer" && (
                      <FormField
                        control={registerForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem className="group animate-in fade-in duration-300">
                            <Label className="transition-colors duration-300 group-hover:text-primary">
                              Company Name
                            </Label>
                            <FormControl>
                              <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                                <Input
                                  className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <Button
                      type="submit"
                      className="w-full transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                      disabled={
                        registerMutation.isPending || passwordStrength.score < 2
                      }
                    >
                      {registerMutation.isPending ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin h-5 w-5 mr-2"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8z"
                            />
                          </svg>
                          Creating account...
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:flex flex-col justify-center p-8 bg-gradient-to-br from-primary/10 to-primary/5 animate-in fade-in duration-700">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-4xl font-bold transition-transform duration-300 hover:scale-105">
            Find Your Next Opportunity
          </h1>
          <p className="text-lg text-muted-foreground transition-opacity duration-300 hover:opacity-80">
            Connect with top employers and discover exciting career
            opportunities.
          </p>
          <div className="grid gap-4">
            {[
              { icon: Briefcase, text: "Thousands of job listings" },
              { icon: Building2, text: "Leading companies" },
              { icon: MapPin, text: "Remote and local opportunities" },
              { icon: User, text: "Personal profile builder" },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 group animate-in fade-in duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <item.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                <span className="group-hover:text-primary transition-colors duration-300">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
