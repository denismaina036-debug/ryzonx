import { ROUTES } from "@/constants/routes";

export default function VerifyEmailPage() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold text-navy-950">Check your email</h1>
      <p className="mt-4 text-sm text-navy-500">
        We sent a verification link to your email address. Please click the link
        to verify your account before signing in.
      </p>
      <a
        href={ROUTES.login}
        className="mt-6 inline-block text-sm font-medium text-royal-600 hover:text-royal-700"
      >
        Back to Sign In
      </a>
    </div>
  );
}
