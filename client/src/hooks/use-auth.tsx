import { createContext, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutateFunction,
} from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner"; // Import sonner

interface User {
  id: number;
  email: string;
  role: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginMutation: {
    mutate: UseMutateFunction<
      User,
      AxiosError<{ message: string }>,
      { email: string; password: string },
      unknown
    >;
    isPending: boolean;
    isError: boolean;
    error: AxiosError<{ message: string }> | null;
  };
  registerMutation: {
    mutate: UseMutateFunction<
      User,
      AxiosError<{ message: string }>,
      {
        email: string;
        password: string;
        role: string;
        username: string;
        phone?: string;
        companyName?: string;
      },
      unknown
    >;
    isPending: boolean;
    isError: boolean;
    error: AxiosError<{ message: string }> | null;
  };
  logoutMutation: {
    mutate: UseMutateFunction<
      void,
      AxiosError<{ message: string }>,
      void,
      unknown
    >;
    isPending: boolean;
    isError: boolean;
    error: AxiosError<{ message: string }> | null;
  };
}
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good Morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  } else if (hour >= 17 && hour < 22) {
    return "Good Evening";
  } else {
    return "Hello"; // Neutral greeting for late night/early morning
  }
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<{ csrfToken: string }>("/api/csrf-token")
      .then((res) => {
        setCsrfToken(res.data.csrfToken);
      })
      .catch((error) => {
        console.error("Failed to fetch CSRF token:", error);
      });
  }, []);

  const { data: user, isLoading }: UseQueryResult<User | null, AxiosError> =
    useQuery({
      queryKey: ["user"],
      queryFn: async () => {
        const res = await axios.get<User>("/api/user");
        return res.data;
      },
      retry: false,
    });

  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      if (!csrfToken) throw new Error("CSRF token not available");
      const res = await axios.post<User>(
        "/api/login",
        { email, password },
        { headers: { "X-CSRF-Token": csrfToken } }
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user"], data);
      toast.success("Login successful!", {
        description: `${getTimeBasedGreeting()}, ${data.username}`,
      });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error("Login failed", {
        description:
          error.response?.data?.message || "Please check your credentials.",
      });
      throw new Error(error.response?.data?.message || "Login failed");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      role: string;
      username: string;
      phone?: string;
      companyName?: string;
    }) => {
      if (!csrfToken) throw new Error("CSRF token not available");
      const res = await axios.post<User>("/api/register", data, {
        headers: { "X-CSRF-Token": csrfToken },
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user"], data);
      toast.success("Registration successful!", {
        description: `Account created for ${data.email}. Please log in.`,
      });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error("Registration failed", {
        description: error.response?.data?.message || "Something went wrong.",
      });
      throw new Error(error.response?.data?.message || "Registration failed");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!csrfToken) throw new Error("CSRF token not available");
      await axios.post(
        "/api/logout",
        {},
        { headers: { "X-CSRF-Token": csrfToken } }
      );
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["user"] });
      toast.success("Logged out successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error("Logout failed", {
        description: error.response?.data?.message || "Something went wrong.",
      });
      throw new Error(error.response?.data?.message || "Logout failed");
    },
  });

  const value: AuthContextType = {
    user: user || null,
    isLoading,
    loginMutation,
    registerMutation,
    logoutMutation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
