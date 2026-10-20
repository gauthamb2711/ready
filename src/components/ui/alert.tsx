import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "border-slate-800 bg-slate-900/80 text-slate-200",
        destructive:
          "border-red-900/50 bg-red-950/40 text-red-300 [&>svg]:text-red-400",
        warning:
          "border-amber-900/50 bg-amber-950/40 text-amber-300 [&>svg]:text-amber-400",
        info:
          "border-blue-900/50 bg-blue-950/40 text-blue-300 [&>svg]:text-blue-400",
        success:
          "border-emerald-900/50 bg-emerald-950/40 text-emerald-300 [&>svg]:text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("mb-1 font-semibold leading-none tracking-tight text-white", className)}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn("text-xs leading-relaxed text-slate-300/90", className)}
      {...props}
    />
  );
}
