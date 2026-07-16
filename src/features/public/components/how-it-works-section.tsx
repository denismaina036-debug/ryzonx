import {
  UserPlus,
  ArrowDownToLine,
  Users,
  LineChart,
} from "lucide-react";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";

const STEPS = [
  {
    step: 1,
    icon: UserPlus,
    title: "Create Account",
    description:
      "Sign up in minutes with email verification. No complex onboarding.",
  },
  {
    step: 2,
    icon: ArrowDownToLine,
    title: "Deposit Funds",
    description:
      "Transfer your investment amount. Minimum deposit starts at $100.",
  },
  {
    step: 3,
    icon: Users,
    title: "Join the Pool",
    description:
      "Once approved, you receive proportional ownership in the trading pool.",
  },
  {
    step: 4,
    icon: LineChart,
    title: "Track & Withdraw",
    description:
      "Monitor performance in real-time and request withdrawals anytime.",
  },
] as const;

export function HowItWorksSection({ className }: { className?: string } = {}) {
  return (
    <SectionContainer className={className ?? "bg-surface-1"}>
      <SectionHeader
        badge="How It Works"
        title="Four Simple Steps"
        description="From account creation to profit tracking — a straightforward investment process."
        align="center"
      />
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.step}
              className="group relative rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:border-royal-200 hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-white transition-transform duration-300 group-hover:scale-105">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-royal-600">
                Step {step.step}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-navy-950">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </SectionContainer>
  );
}
