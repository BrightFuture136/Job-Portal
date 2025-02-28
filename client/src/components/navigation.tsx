import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  BriefcaseIcon, 
  Users, 
  BarChart, 
  Settings, 
  Building2, 
  Bell, 
  UserCircle, 
  MessageSquare 
} from "lucide-react";

export function Navigation() {
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  return (
    <nav className="border-b ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="flex justify-between h-16 ">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/">
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              {user.role === "employer" ? (
                <>
                  <NavigationMenuItem>
                    <Link href="/employer/post-job">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <BriefcaseIcon className="w-4 h-4 mr-2 " />
                        Post Jobs
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link href="/employer/candidates">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <Users className="w-4 h-4 mr-2" />
                        Candidates
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link href="/employer/analytics">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <BarChart className="w-4 h-4 mr-2" />
                        Analytics
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link href="/employer/branding">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <Building2 className="w-4 h-4 mr-2" />
                        Branding
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link href="/employer/messages">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Messages
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link href="/employer/settings">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                </>
              ) : (
                <>
                  <NavigationMenuItem>
                    <Link href="/seeker/jobs">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <BriefcaseIcon className="w-4 h-4 mr-2" />
                        Browse Jobs
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link href="/seeker/companies">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <Building2 className="w-4 h-4 mr-2" />
                        Companies
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link href="/seeker/alerts">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <Bell className="w-4 h-4 mr-2" />
                        Job Alerts
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link href="/seeker/profile">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <UserCircle className="w-4 h-4 mr-2" />
                        Profile
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                </>
              )}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center ">
            <Button
              variant="ghost"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}