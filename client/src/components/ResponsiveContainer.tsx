
import React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function ResponsiveContainer({ 
  children, 
  className,
  fullWidth = false
}: ResponsiveContainerProps) {
  return (
    <div className={cn(
      "w-full px-4 mx-auto",
      fullWidth ? "max-w-full" : "max-w-7xl",
      "sm:px-6 md:px-8",
      className
    )}>
      {children}
    </div>
  );
}

export function ResponsiveGrid({ 
  children, 
  className 
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "grid grid-cols-1 gap-4",
      "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}
