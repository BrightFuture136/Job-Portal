import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import PostJob from "@/pages/employer/post-job";
import Applications from "@/pages/employer/applications";
import Candidates from "@/pages/employer/candidates";
import Analytics from "@/pages/employer/analytics";
import Branding from "@/pages/employer/branding";
import Messages from "@/pages/employer/messages";
import Settings from "@/pages/employer/settings";
import Jobs from "@/pages/seeker/jobs";
import Profile from "@/pages/seeker/profile";
import Alerts from "@/pages/seeker/alerts";
import Companies from "@/pages/seeker/companies";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      {/* Employer Routes */}
      <ProtectedRoute path="/employer/post-job" component={PostJob} />
      <ProtectedRoute path="/employer/applications" component={Applications} />
      <ProtectedRoute path="/employer/candidates" component={Candidates} />
      <ProtectedRoute path="/employer/analytics" component={Analytics} />
      <ProtectedRoute path="/employer/branding" component={Branding} />
      <ProtectedRoute path="/employer/messages" component={Messages} />
      <ProtectedRoute path="/employer/settings" component={Settings} />
      {/* Job Seeker Routes */}
      <ProtectedRoute path="/seeker/jobs" component={Jobs} />
      <ProtectedRoute path="/seeker/profile" component={Profile} />
      <ProtectedRoute path="/seeker/alerts" component={Alerts} />
      <ProtectedRoute path="/seeker/companies" component={Companies} />
      <ProtectedRoute path="/company/:companyId" component={Companies} />
      {/* Admin Routes */}
      <ProtectedRoute
        path="/admin/subscriptions"
        component={AdminSubscriptions}
        allowedRoles={["admin"]}
      />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster richColors position="top-right" closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
