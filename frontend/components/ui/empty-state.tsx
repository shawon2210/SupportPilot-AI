"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn(
          "flex flex-col items-center justify-center text-center py-12 px-6 rounded-lg border border-dashed border-border",
          className
        )}
      >
        {icon && (
          <div className="mb-4 text-muted-foreground" aria-hidden="true">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {description}
          </p>
        )}
        {action &&
          (action.href ? (
            <a
              href={action.href}
              className={cn(
                "inline-flex items-center justify-center px-4 py-2 rounded-md",
                "bg-primary text-primary-foreground text-sm font-medium",
                "hover:bg-primary/90 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              {action.label}
            </a>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          ))}
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
