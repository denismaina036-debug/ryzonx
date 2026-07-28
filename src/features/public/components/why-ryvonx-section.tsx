import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { landingPageService } from "@/services/landing-page.service";
import { resolveLandingIcon } from "@/domain/landing-page/icons";

export async function WhyRyvonxSection() {
  const content = await landingPageService.getPublicContent();

  return (
    <SectionContainer landingMobile>
      <SectionHeader
        badge={content.copy.whyRyvonx.badge}
        title={content.copy.whyRyvonx.title}
        description={content.copy.whyRyvonx.description}
        align="center"
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {content.whyRyvonxFeatures.map((feature) => {
          const Icon = resolveLandingIcon(feature.icon);
          return (
            <div
              key={feature.id}
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
