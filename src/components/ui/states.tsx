import * as React from "react";
import { AlertCircle, FolderOpen, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "./button";

export function LoadingState({
  title = "Loading data...",
  description = "Please wait while we verify your session and retrieve the latest records.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
      <Loader2 className="h-9 w-9 animate-spin text-indigo-400 mb-4" />
      <h4 className="text-base font-medium text-white">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export function EmptyState({
  title = "No records found",
  description = "There are no active items available in this section.",
  actionLabel,
  onAction,
  action,
  children,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20">
      <div className="h-12 w-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
        <FolderOpen className="h-6 w-6" />
      </div>
      <h4 className="text-base font-medium text-white">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {action && action}
      {children}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "An error occurred while processing this request. Please try again later.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-red-900/40 bg-red-950/20 text-red-300">
      <div className="h-10 w-10 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 mb-3">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-semibold text-red-200">{title}</h4>
      <p className="text-xs text-red-300/80 max-w-md mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-red-800 text-red-200 hover:bg-red-900/40">
          Try Again
        </Button>
      )}
    </div>
  );
}

export function UnauthorizedState({
  title = "Access Restricted",
  description = "You do not have the verified role or permissions required to access this resource.",
  backUrl = "/",
}: {
  title?: string;
  description?: string;
  backUrl?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-white mb-2">{title}</h2>
      <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex items-center gap-3">
        <a href={backUrl}>
          <Button variant="primary">Return to Ecosystems</Button>
        </a>
        <a href="/settings">
          <Button variant="outline">View Verification Status</Button>
        </a>
      </div>
    </div>
  );
}

export function NotFoundState({
  title = "Resource Not Found",
  description = "The requested item or workspace could not be located.",
  backUrl = "/",
}: {
  title?: string;
  description?: string;
  backUrl?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/5">
        <FolderOpen className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-white mb-2">{title}</h2>
      <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex items-center gap-3">
        <a href={backUrl}>
          <Button variant="outline">Return to Previous Page</Button>
        </a>
      </div>
    </div>
  );
}

