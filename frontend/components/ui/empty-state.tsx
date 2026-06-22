"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

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
          "flex flex-col items-center justify-center text-center py-10 sm:py-14 px-6 rounded-xl border border-dashed border-border/60 bg-muted/10",
          className
        )}
      >
        {icon && (
          <div className="mb-4 h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground" aria-hidden="true">
            {icon}
          </div>
        )}
        <h3 className="text-base sm:text-lg font-semibold mb-1.5">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-5 max-w-xs leading-relaxed">
            {description}
          </p>
        )}
        {action && (
          action.href ? (
            <Button asChild size="sm" className="h-9">
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button onClick={action.onClick} size="sm" className="h-9">
              {action.label}
            </Button>
          )
        )}
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";

interface ErrorStateProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ title, message, onRetry, className }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        className={cn(
          "flex flex-col items-center justify-center text-center py-10 sm:py-14 px-6 rounded-xl border border-destructive/20 bg-destructive/5",
          className
        )}
      >
        <div className="mb-4 h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center" aria-hidden="true">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold mb-1.5">{title}</h3>
        {message && (
          <p className="text-sm text-muted-foreground mb-5 max-w-xs leading-relaxed">
            {message}
          </p>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="h-9">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    );
  }
);
ErrorState.displayName = "ErrorState";

export { EmptyState, ErrorState };
