import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must be less than 50 characters")
      .regex(/^[a-zA-Z\s'-]+$/, "First name contains invalid characters"),
    middleName: z
      .string()
      .max(50, "Middle name must be less than 50 characters")
      .regex(/^[a-zA-Z\s'-]*$/, "Middle name contains invalid characters")
      .optional()
      .or(z.literal("")),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must be less than 50 characters")
      .regex(/^[a-zA-Z\s'-]+$/, "Last name contains invalid characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .refine(
        (val) => {
          const digits = val.replace(/\D/g, "");
          return digits.length >= 10 && digits.length <= 15;
        },
        { message: "Enter a valid phone number (10–15 digits)" }
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and a number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and conditions" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => data.firstName.trim().toLowerCase() !== data.lastName.trim().toLowerCase(),
    {
      message: "First and last name must be different",
      path: ["lastName"],
    }
  )
  .refine(
    (data) => {
      const middle = data.middleName?.trim();
      if (!middle) return true;
      return (
        middle.toLowerCase() !== data.firstName.trim().toLowerCase() &&
        middle.toLowerCase() !== data.lastName.trim().toLowerCase()
      );
    },
    {
      message: "Middle name must differ from first and last name",
      path: ["middleName"],
    }
  );

export type RegisterSchema = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and a number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

export const depositRequestSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount is required" })
    .positive("Amount must be greater than zero")
    .min(100, "Minimum deposit is $100"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

export type DepositRequestSchema = z.infer<typeof depositRequestSchema>;

export const withdrawalRequestSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount is required" })
    .positive("Amount must be greater than zero"),
  destinationDetails: z
    .string()
    .min(1, "Destination details are required")
    .max(500, "Details must be less than 500 characters"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

export type WithdrawalRequestSchema = z.infer<typeof withdrawalRequestSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationSchema = z.infer<typeof paginationSchema>;
