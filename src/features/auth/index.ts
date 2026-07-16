/**
 * Auth feature module — public API.
 * Components, hooks, and services for authentication will be added here.
 */
export { useAuthActions } from "@/hooks/use-auth";
export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
export type {
  LoginSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "@/lib/validations/auth";
