import { type VariantProps, cva } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-navy-100 text-navy-700",
        primary: "border-transparent bg-navy-900 text-white",
        secondary: "border-transparent bg-royal-100 text-royal-700",
        success: "border-transparent bg-emerald-100 text-emerald-700",
        warning: "border-transparent bg-gold-100 text-gold-700",
        destructive: "border-transparent bg-red-100 text-red-700",
        outline: "border-border text-navy-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
