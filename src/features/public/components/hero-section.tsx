import Link from "next/link";
import {
  TrendingUp,
  Users,
  BarChart3,
  Target,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { FadeIn } from "@/components/ui/motion";
import { ROUTES } from "@/constants/routes";
import { fundService } from "@/services/fund.service";
import { RecentTransactionsTicker } from "@/features/public/components/recent-transactions-ticker";
import { formatCurrency, formatPercentage, formatCompactNumber } from "@/lib/utils";

export async function HeroSection() {
  const stats = await fundService.getStats();

  return (
    <section className="relative overflow-hidden pb-16 pt-8 md:pb-24 md:pt-12">
      {/* Hero background image */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-cover.png')" }}
        />
        <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px]" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-royal-100/30 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-gold-100/20 blur-3xl" />
      </div>

      <div className="page-container">
        <FadeIn className="mx-auto max-w-3xl text-center">
          <span className="mb-6 inline-block rounded-full border border-royal-200 bg-royal-50/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-royal-700 backdrop-blur-sm">
            Transparent Pool Trading Fund
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-navy-950 md:text-5xl lg:text-6xl">
            Invest with confidence.{" "}
            <span className="text-gradient">Verify everything.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-500 md:text-xl">
            Ryvonx is a professionally managed trading pool where every
            visitor can verify performance, review trades, and track fund
            activity before deciding to invest.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="xl">
              <Link href={ROUTES.register}>
                Join Pool
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href={ROUTES.performance}>View Performance</Link>
            </Button>
          </div>
        </FadeIn>

        <div className="mt-12 flex justify-center md:mt-14">
          <RecentTransactionsTicker />
        </div>

        <div className="mt-16 md:mt-20">
          <StatGrid columns={6}>
            <StatCard
              label="Total Pool Value"
              value={formatCurrency(stats.totalPoolValue)}
              icon={TrendingUp}
            />
            <StatCard
              label="Active Investors"
              value={String(stats.totalActiveInvestors)}
              icon={Users}
            />
            <StatCard
              label="Today's ROI"
              value={formatPercentage(stats.dailyRoi)}
              changeType={stats.dailyRoi >= 0 ? "positive" : "negative"}
              icon={BarChart3}
            />
            <StatCard
              label="Monthly ROI"
              value={formatPercentage(stats.monthlyRoi)}
              changeType={stats.monthlyRoi >= 0 ? "positive" : "negative"}
              icon={Activity}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate}%`}
              icon={Target}
            />
            <StatCard
              label="Closed Trades"
              value={formatCompactNumber(stats.totalClosedTrades)}
              icon={BarChart3}
            />
          </StatGrid>
        </div>
      </div>
    </section>
  );
}
