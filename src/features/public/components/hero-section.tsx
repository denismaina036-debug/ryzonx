import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { FadeIn } from "@/components/ui/motion";
import { landingPageService } from "@/services/landing-page.service";
import { landingPageActivityService } from "@/services/landing-page-activity.service";
import { resolveLandingIcon } from "@/domain/landing-page/icons";
import { InvestmentActivityTicker } from "@/features/public/components/investment-activity-ticker";

export async function HeroSection() {
  const content = await landingPageService.getPublicContent();
  const { hero, heroStats } = content;
  const tickerItems = hero.showTrustTicker
    ? await landingPageActivityService.listTicker(5)
    : [];

  return (
    <section className="relative overflow-hidden pb-10 pt-5 md:pb-24 md:pt-12">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: hero.backgroundImageUrl
              ? `url('${hero.backgroundImageUrl}')`
              : undefined,
          }}
        />
        <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px]" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-royal-100/30 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-gold-100/20 blur-3xl" />
      </div>

      <div className="page-container px-4 sm:px-6 lg:px-8">
        <FadeIn className="mx-auto max-w-3xl text-center">
          {hero.badge ? (
            <span className="mb-4 inline-block rounded-full border border-royal-200 bg-royal-50/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-royal-700 backdrop-blur-sm md:mb-6">
              {hero.badge}
            </span>
          ) : null}
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-navy-950 md:text-5xl lg:text-6xl">
            {hero.heading}
          </h1>
          {hero.subheading ? (
            <p className="mx-auto mt-4 max-w-2xl text-xl font-medium text-navy-700">
              {hero.subheading}
            </p>
          ) : null}
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-navy-500 md:mt-6 md:text-xl">
            {hero.description}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-10 md:gap-4">
            <Button asChild size="xl">
              <Link href={hero.primaryButtonLink}>
                {hero.primaryButtonText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href={hero.secondaryButtonLink}>{hero.secondaryButtonText}</Link>
            </Button>
          </div>
          {hero.trustBanner ? (
            <p className="mt-6 text-sm font-medium text-navy-600">{hero.trustBanner}</p>
          ) : null}
        </FadeIn>

        {hero.illustrationImageUrl ? (
          <div className="mt-10 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.illustrationImageUrl}
              alt=""
              className="max-h-64 w-auto rounded-2xl object-contain"
            />
          </div>
        ) : null}

        {hero.videoUrl ? (
          <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border shadow-sm">
            <video src={hero.videoUrl} controls className="w-full" />
          </div>
        ) : null}

        {hero.showTrustTicker ? (
          <div className="mt-8 flex justify-center md:mt-14">
            <InvestmentActivityTicker items={tickerItems} />
          </div>
        ) : null}

        {heroStats.length > 0 ? (
          <div className="mt-16 hidden md:block md:mt-20">
            <StatGrid columns={heroStats.length <= 4 ? (heroStats.length <= 3 ? 3 : 4) : 6}>
              {heroStats.map((stat) => (
                <StatCard
                  key={stat.id}
                  label={stat.title}
                  value={stat.resolvedValue}
                  icon={resolveLandingIcon(stat.icon)}
                  changeType={stat.changeType}
                />
              ))}
            </StatGrid>
          </div>
        ) : null}
      </div>
    </section>
  );
}
