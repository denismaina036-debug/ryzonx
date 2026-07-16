"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div
        className={cn(
          "flex h-10 w-full items-stretch overflow-hidden rounded-xl border bg-background transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
          disabled && "cursor-not-allowed opacity-50",
          error
            ? "border-red-300 focus-within:ring-red-500"
            : "border-input hover:border-navy-300"
        )}
      >
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent px-4 py-2 text-sm text-navy-950 outline-none",
            "placeholder:text-navy-400 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          className="flex shrink-0 items-center px-3 text-navy-400 transition-colors hover:text-navy-700 disabled:pointer-events-none"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
