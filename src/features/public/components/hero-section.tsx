import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";
import { ROUTES } from "@/constants/routes";
import { InvestmentActivityTicker } from "@/features/public/components/investment-activity-ticker";
import { landingPageActivityService } from "@/services/landing-page-activity.service";
import { landingPageService } from "@/services/landing-page.service";
import { landingPageStatsService } from "@/services/landing-page-stats.service";

function formatInvestorCount(value: number | null): string {
  if (!value) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M9.9 15.6 9.7 19c.4 0 .6-.2.8-.4l2-1.9 4.1 3c.8.4 1.3.2 1.5-.7l2.7-12.7c.3-1.2-.4-1.7-1.2-1.3L3.6 9.8c-1.2.5-1.2 1.1-.2 1.4l4.9 1.5L18.5 7c.5-.3 1-.1.6.2" />
    </svg>
  );
}

export async function HeroSection() {
  const [content, investorCount, tickerItems] = await Promise.all([
    landingPageService.getPublicContent(),
    landingPageStatsService.resolveAutomaticNumericValue("total_investors"),
    landingPageActivityService.listTicker(5),
  ]);
  const telegramUrl = content.social.telegram?.trim();
  return (
    <section className="ryvonx-hero relative isolate w-full overflow-hidden bg-[#020812] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[.08]"
          style={{
            backgroundImage: content.hero.backgroundImageUrl
              ? `url('${content.hero.backgroundImageUrl}')`
              : undefined,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,6,14,.99)_0%,rgba(2,10,23,.96)_42%,rgba(3,18,42,.82)_100%)]" />
        <div className="hero-copy-illumination absolute inset-y-0 left-0 w-[68%]" />
        <div className="absolute right-[-12%] top-[-24%] h-[48rem] w-[48rem] rounded-full bg-blue-600/[.14] blur-[130px]" />
        <div className="hero-light-beams absolute inset-y-0 right-0 hidden w-[48%] lg:block" />
        <div className="hero-floor-light absolute bottom-[7.5rem] right-0 hidden h-40 w-[66%] lg:block" />
      </div>

      <div className="ryvonx-hero-shell mx-auto flex w-full max-w-[96rem] flex-col px-5 pb-10 sm:px-7 sm:pb-12 lg:px-10 lg:pb-0 xl:px-12">
        <div className="ryvonx-hero-stage relative grid flex-1 items-center gap-8 py-12 lg:grid-cols-[minmax(0,.86fr)_minmax(0,1.14fr)] lg:gap-12 lg:py-10 xl:gap-16">
          <FadeIn className="relative z-10 mx-auto min-w-0 w-full max-w-full text-center lg:mx-0 lg:max-w-[38rem] lg:text-left">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-400/[.055] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-blue-300 sm:text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Transparent Pool Trading Fund
            </span>

            <h1 className="text-balance text-[clamp(2rem,9.2vw,3.1rem)] font-semibold leading-[1.055] tracking-[-0.048em] text-white sm:text-[3.25rem] lg:text-[clamp(2.65rem,4.25vw,4.5rem)]">
              <span className="block">Trade Smart.</span>
              <span className="mt-1 block whitespace-nowrap">
                Invest{" "}
                <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
                  Transparent.
                </span>
              </span>
            </h1>

            <div className="mx-auto mt-6 h-0.5 w-24 bg-gradient-to-r from-blue-500 via-indigo-400 to-transparent lg:mx-0" />

            <p className="mx-auto mt-5 max-w-[33rem] text-[.98rem] leading-7 text-slate-300 sm:text-[1.05rem] lg:mx-0">
              RyvonX connects smart investors with verified traders in professionally managed
              investment pools.
            </p>

            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
              <Button
                asChild
                size="xl"
                className="min-w-44 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-[0_16px_38px_rgba(37,99,235,.3)] hover:from-blue-500 hover:to-indigo-400 hover:shadow-[0_18px_44px_rgba(37,99,235,.4)]"
              >
                <Link href={ROUTES.marketplace}>
                  Invest in a Pool
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="xl"
                className="min-w-44 rounded-xl border-blue-300/35 bg-[#07101e]/45 text-white backdrop-blur-sm hover:border-blue-300/60 hover:bg-blue-400/10 hover:text-white"
              >
                <Link href={content.hero.secondaryButtonLink}>
                  Become a Pool Manager
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto mt-3.5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-400/25 bg-sky-400/[.045] px-3.5 py-2 text-sm font-medium text-sky-200 transition-all hover:border-sky-300/45 hover:bg-sky-400/[.09] hover:text-white hover:shadow-[0_8px_28px_rgba(14,165,233,.14)] lg:mx-0"
              >
                <TelegramIcon className="h-4 w-4 text-sky-400" />
                Join RyvonX Community
              </a>
            ) : null}

          </FadeIn>

          <FadeIn
            delay={0.1}
            className="relative flex min-h-[19rem] min-w-0 items-center justify-center sm:min-h-[23rem] lg:min-h-[31rem] lg:justify-end"
            aria-hidden="true"
          >
            <div className="absolute bottom-[10%] right-[2%] h-[38%] w-[82%] rounded-[50%] bg-blue-500/[.12] blur-3xl" />
            <Image
              src="/images/hero-rx-3d-premium.png"
              alt=""
              width={1536}
              height={1024}
              priority
              className="rx-hero-float relative h-auto w-full max-w-[32rem] object-contain drop-shadow-[0_26px_48px_rgba(17,91,225,.34)] sm:max-w-[42rem] lg:right-[-2.5rem] lg:w-[47rem] lg:max-w-none xl:right-[-3.25rem] xl:w-[53rem]"
            />
          </FadeIn>

          {tickerItems.length > 0 ? (
            <div className="relative z-20 col-span-full flex min-w-0 w-full max-w-full justify-center lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-[4.8rem]">
              <InvestmentActivityTicker
                items={tickerItems}
                className="pointer-events-auto w-full max-w-full lg:max-w-[38rem]"
              />
            </div>
          ) : null}
        </div>

        <div className="hero-trust-grid relative z-10 grid overflow-hidden rounded-2xl border border-blue-300/[.14] bg-[#071326]/80 shadow-[0_24px_70px_rgba(0,0,0,.32)] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <TrustMetric
            icon={Users}
            title="Total Investors"
            value={formatInvestorCount(investorCount)}
            description="Smart investors growing together"
            featured
          />
          <TrustMetric
            icon={ShieldCheck}
            title="Verified Traders"
            description="Thoroughly vetted for your security"
          />
          <TrustMetric
            icon={LockKeyhole}
            title="Transparent Pools"
            description="Real-time performance and clear strategies"
          />
          <TrustMetric
            icon={BarChart3}
            title="Performance Focused"
            description="Data-driven approach to consistent growth"
          />
        </div>
      </div>
    </section>
  );
}

function TrustMetric({
  icon: Icon,
  title,
  value,
  description,
  featured = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value?: string;
  description: string;
  featured?: boolean;
}) {
  return (
    <div className="hero-trust-metric flex min-h-[8rem] items-center gap-4 px-5 py-5 sm:px-6 lg:px-7">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-400/[.09] text-indigo-400 ring-1 ring-blue-300/10">
        <Icon className={featured ? "h-6 w-6" : "h-7 w-7"} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        {value ? (
          <p className="mt-1 text-3xl font-semibold tracking-tight text-white">{value}</p>
        ) : null}
        <p
          className={
            value
              ? "mt-1 text-xs leading-5 text-slate-400"
              : "mt-2 text-xs leading-5 text-slate-400"
          }
        >
          {description}
        </p>
      </div>
    </div>
  );
}
