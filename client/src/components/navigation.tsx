
import { useState, useEffect } from "react";
import { Link } from "wouter";
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
  X
} from "lucide-react";
import { ResponsiveContainer } from "./ResponsiveContainer";
import { cn } from "@/lib/utils";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on window resize (if switching to desktop)
  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  if (!user) return null;

  const navItems = [
    { href: "/", icon: <LayoutDashboard className="w-4 h-4 mr-2" />, label: "Dashboard" },
    { href: "/projects", icon: <BriefcaseIcon className="w-4 h-4 mr-2" />, label: "Projects" },
    { href: "/team", icon: <Users className="w-4 h-4 mr-2" />, label: "Team" },
    { href: "/analytics", icon: <BarChart className="w-4 h-4 mr-2" />, label: "Analytics" },
    { href: "/settings", icon: <Settings className="w-4 h-4 mr-2" />, label: "Settings" },
  ];

  const renderNavItems = () => (
    <>
      {navItems.map((item, index) => (
        <NavigationMenuItem key={index}>
          <Link href={item.href}>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              {item.icon}
              {item.label}
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      ))}
    </>
  );

  return (
    <nav className="border-b dark:border-gray-800">
      <ResponsiveContainer>
        <div className="flex items-center justify-between h-16">
          {/* Logo/brand */}
          <div className="flex items-center">
            <Building2 className="w-6 h-6 mr-2" />
            <span className="font-semibold">WorkSpace</span>
          </div>

          {/* Desktop navigation */}
          {!isMobile && (
            <div className="flex-1 flex justify-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {renderNavItems()}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          )}

          {/* Right side - theme toggle, notifications, profile, logout */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {!isMobile && (
              <>
                <Button variant="ghost" size="icon">
                  <Bell className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <UserCircle className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  Logout
                </Button>
              </>
            )}

            {/* Mobile menu toggle */}
            {isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {isMobile && (
          <div className={cn(
            "fixed inset-0 z-50 bg-background transform transition-transform duration-300 ease-in-out pt-16",
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          )}>
            <div className="flex flex-col p-4 space-y-4">
              {navItems.map((item, index) => (
                <Link key={index} href={item.href}>
                  <Button
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              ))}
              <div className="border-t dark:border-gray-800 pt-4 mt-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </ResponsiveContainer>
    </nav>
  );
}
