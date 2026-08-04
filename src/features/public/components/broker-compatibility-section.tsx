import { BadgeCheck } from "lucide-react";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { resolveBrokerLogoUrl } from "@/domain/landing-page/broker-logos";
import { landingPageService } from "@/services/landing-page.service";
import { BrokerCarousel } from "@/features/public/components/broker-carousel";

export async function BrokerCompatibilitySection() {
  const content = await landingPageService.getPublicContent();
  const { copy, brokers, settings } = content;
  const enabledBrokers = brokers.filter((broker) => broker.isEnabled);
  const primaryBroker =
    enabledBrokers.find((broker) => broker.isPrimary) ??
    enabledBrokers.sort((a, b) => a.sortOrder - b.sortOrder)[0] ??
    null;

  if (enabledBrokers.length === 0) return null;

  const primaryLogoUrl = primaryBroker ? resolveBrokerLogoUrl(primaryBroker) : null;

  return (
    <SectionContainer landingMobile>
      <SectionHeader
        badge={copy.brokerCompatibility.badge}
        title={copy.brokerCompatibility.title}
        description={copy.brokerCompatibility.description}
        align="center"
        compactMobile
      />

      {primaryBroker ? (
        <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-royal-200/80 bg-royal-50/60 px-5 py-4 text-center shadow-sm sm:mt-8 sm:px-6 sm:py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-royal-700">
            {copy.brokerCompatibility.primaryPartnerLabel}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2.5">
            {primaryLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryLogoUrl}
                alt={primaryBroker.name}
                className="max-h-10 max-w-[180px] object-contain sm:max-h-11 sm:max-w-[200px]"
              />
            ) : (
              <p className="text-xl font-semibold text-navy-950 sm:text-2xl">{primaryBroker.name}</p>
            )}
            <BadgeCheck className="h-5 w-5 shrink-0 text-royal-600" aria-label="Verified partner" />
          </div>
        </div>
      ) : null}

      <BrokerCarousel
        brokers={brokers}
        autoRotate={settings.enableSectionAnimations && settings.brokerSliderAutoScroll}
      />
    </SectionContainer>
  );
}
