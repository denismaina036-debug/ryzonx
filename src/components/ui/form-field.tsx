"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps extends ComponentPropsWithoutRef<"div"> {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  description?: string;
  children: ReactNode;
}

const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    { label, htmlFor, required, error, description, children, className, ...props },
    ref
  ) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {description && !error && (
        <p className="text-xs text-navy-500">{description}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
);
FormField.displayName = "FormField";

export { FormField };
