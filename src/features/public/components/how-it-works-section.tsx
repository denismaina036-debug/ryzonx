import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { landingPageService } from "@/services/landing-page.service";
import { resolveLandingIcon } from "@/domain/landing-page/icons";

export async function HowItWorksSection({ className }: { className?: string } = {}) {
  const content = await landingPageService.getPublicContent();

  return (
    <SectionContainer className={className ?? "bg-surface-1"} landingMobile>
      <SectionHeader
        badge={content.copy.howItWorks.badge}
        title={content.copy.howItWorks.title}
        description={content.copy.howItWorks.description}
        align="center"
      />
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {content.howItWorksSteps.map((step) => {
          const Icon = resolveLandingIcon(step.icon);
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
              <h3 className="mt-2 text-lg font-semibold text-navy-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{step.description}</p>
            </div>
          );
        })}
      </div>
    </SectionContainer>
  );
}
