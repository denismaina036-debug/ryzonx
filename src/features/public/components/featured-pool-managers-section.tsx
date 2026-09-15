import { copyTradingText } from "@/lib/copy-trading-presentation";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { landingPageService } from "@/services/landing-page.service";
import { landingFeaturedManagersService } from "@/services/landing-featured-managers.service";
import { FeaturedPoolManagerCarousel } from "@/features/public/components/featured-pool-manager-carousel";
import { withTimeout } from "@/lib/async/with-timeout";

export async function FeaturedPoolManagersSection() {
  const [content, managers] = await Promise.all([
    landingPageService.getPublicContent(),
    withTimeout(
      landingFeaturedManagersService.getTopManagers(5),
      1_500,
      "Featured traders timed out"
    ).catch((error: unknown) => {
      console.warn(
        "[landing] featured managers unavailable — hiding optional section.",
        error instanceof Error ? error.message : "Unknown error"
      );
      return [];
    }),
  ]);

  if (managers.length === 0) return null;

  return (
    <SectionContainer landingMobile>
      <SectionHeader
        badge={copyTradingText(content.copy.featuredPoolManagers.badge)}
        title={copyTradingText(content.copy.featuredPoolManagers.title)}
        description={copyTradingText(content.copy.featuredPoolManagers.description)}
        align="center"
        compactMobile
      />
      <FeaturedPoolManagerCarousel
        managers={managers}
        autoRotate={
          content.settings.enableSectionAnimations &&
          content.settings.featuredManagersAutoRotate
        }
      />
    </SectionContainer>
  );
}
