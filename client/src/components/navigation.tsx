import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  BriefcaseIcon,
  Users,
  BarChart,
  Settings,
  Building2,
  Bell,
  UserCircle,
  MessageSquare,
  Menu,
  LogOut,
  CreditCard, // Added for subscriptions
} from "lucide-react";
import { ResponsiveContainer } from "./ResponsiveContainer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  if (!user) return null;

  // Define nav items for seekers and employers
  const standardNavItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4 mr-2" />,
    },
    {
      href: user.role === "employer" ? "/employer/post-job" : "/seeker/jobs",
      label: user.role === "employer" ? "Post Job" : "Find Jobs",
      icon: <BriefcaseIcon className="w-4 h-4 mr-2" />,
    },
    {
      href:
        user.role === "employer" ? "/employer/candidates" : "/seeker/profile",
      label: user.role === "employer" ? "Candidates" : "My Profile",
      icon: <Users className="w-4 h-4 mr-2" />,
    },
    {
      href: user.role === "employer" ? "/employer/analytics" : "/seeker/alerts",
      label: user.role === "employer" ? "Analytics" : "Job Alerts",
      icon: <BarChart className="w-4 h-4 mr-2" />,
    },
    {
      href:
        user.role === "employer" ? "/employer/messages" : "/seeker/companies",
      label: user.role === "employer" ? "Messages" : "Companies",
      icon: <MessageSquare className="w-4 h-4 mr-2" />,
    },
    {
      href: user.role === "employer" ? "/employer/branding" : "",
      label: user.role === "employer" ? "Branding" : "",
      icon:
        user.role === "employer" ? <Building2 className="w-4 h-4 mr-2" /> : "",
    },
    {
      href:
        user.role === "employer" ? "/employer/settings" : "/seeker/settings",
      label: user.role === "employer" ? "Settings" : "",
      icon:
        user.role === "employer" ? <Settings className="w-4 h-4 mr-2" /> : "",
    },
  ];

  // Define nav items for admins
  const adminNavItems = [
    {
      href: "/admin/subscriptions",
      label: "Subscriptions",
      icon: <CreditCard className="w-4 h-4 mr-2" />,
    },
  ];

  const renderNavItems = (items: typeof standardNavItems) => {
    return items.map((item, index) => (
      <NavigationMenuItem key={index}>
        <Link href={item.href}>
          <NavigationMenuLink
            className={`${navigationMenuTriggerStyle()} ${
              location === item.href ? "bg-accent" : ""
            }`}
          >
            <div className="flex items-center">
              {item.icon}
              {item.label}
            </div>
          </NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
    ));
  };

  const renderMobileNavItems = (items: typeof standardNavItems) => {
    return items.map((item, index) => (
      <Link key={index} href={item.href}>
        <Button
          variant="ghost"
          className="w-full justify-start text-left mb-1 font-normal"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex items-center">
            {item.icon}
            <span className="ml-2">{item.label}</span>
          </div>
        </Button>
      </Link>
    ));
  };

  // Determine which navbar to render based on role
  const isAdmin = user.role === "admin";
  const navItems = isAdmin ? adminNavItems : standardNavItems;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <ResponsiveContainer>
        <div className="flex h-16 items-center justify-between">
          {/* Logo and company name */}
          <div className="flex items-center">
            <Link href={isAdmin ? "/admin/subscriptions" : "/"}>
              <div className="flex items-center space-x-2">
                <Building2 className="w-6 h-6" />
                <span className="font-bold text-xl">DreamJobs</span>
              </div>
            </Link>
          </div>

          {/* Desktop navigation */}
          {!isMobile && (
            <div className="flex-1 flex justify-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {renderNavItems(navItems)}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          )}

          {/* Right side - theme toggle, user info, logout */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />

            {/* Display logged-in user's name */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <UserCircle className="w-5 h-5" />
                  <span className="hidden md:inline">{user.username}</span>{" "}
                  {/* Display username */}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile and tablet menu */}
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Toggle menu">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[85%] max-w-sm sm:max-w-md"
                >
                  <div className="py-4">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-6 h-6" />
                        <span className="font-bold text-xl">DreamJobs</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {renderMobileNavItems(navItems)}
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left mt-4"
                        onClick={() => {
                          logoutMutation.mutate();
                          setMobileMenuOpen(false);
                        }}
                        disabled={logoutMutation.isPending}
                      >
                        <div className="flex items-center">
                          <LogOut className="w-4 h-4 mr-2" />
                          <span className="ml-2">Logout</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </ResponsiveContainer>
    </header>
  );
}
