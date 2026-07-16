import {
  BookOpen,
  Shield,
  BarChart3,
  Users,
  Lock,
  CheckCircle,
  Zap,
} from "lucide-react";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";

const FEATURES = [
  { icon: BookOpen, title: "Transparent Trading Journal", description: "Every closed trade published with full details." },
  { icon: Shield, title: "Professional Fund Management", description: "Experienced team managing the pool strategy." },
  { icon: BarChart3, title: "Visible Performance History", description: "Complete historical data available to all visitors." },
  { icon: Users, title: "Community Investment Pool", description: "Join a collective of verified investors." },
  { icon: Lock, title: "Secure Investor Portal", description: "Bank-grade encryption and Row Level Security." },
  { icon: CheckCircle, title: "Manual Trade Verification", description: "All trades reviewed before publication." },
  { icon: Zap, title: "Real-Time Performance Updates", description: "Live pool value and ROI metrics." },
] as const;

export function WhyRyvonxSection() {
  return (
    <SectionContainer>
      <SectionHeader
        badge="Why Ryvonx"
        title="Built on Trust & Transparency"
        description="Everything we do reinforces our core values: transparency, trust, professionalism, and long-term growth."
        align="center"
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex gap-4 rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-royal-200 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-950">{feature.title}</h3>
                <p className="mt-1 text-sm text-navy-500">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </SectionContainer>
  );
}
