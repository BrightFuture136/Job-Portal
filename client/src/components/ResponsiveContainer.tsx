
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
  className,
  cols = 4
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 6;
}) {
  const getGridCols = () => {
    switch (cols) {
      case 1: return "grid-cols-1";
      case 2: return "grid-cols-1 sm:grid-cols-2";
      case 3: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
      case 4: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      case 6: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6";
      default: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    }
  };

  return (
    <div className={cn(
      "grid gap-4",
      getGridCols(),
      className
    )}>
      {children}
    </div>
  );
}

export function ResponsiveSection({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(
      "py-8 md:py-12",
      className
    )}>
      {children}
    </section>
  );
}

export function ResponsiveCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "bg-card text-card-foreground rounded-lg border shadow-sm p-4 md:p-6",
      className
    )}>
      {children}
    </div>
  );
}
