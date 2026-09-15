import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MarketplacePoolCard } from "@/domain/marketplace/types";
import { copyTradingText, displayedTradedCapital } from "@/lib/copy-trading-presentation";
import { formatCurrency } from "@/lib/utils";

vi.mock("next/link", () => ({ default: ({ children, ...props }: Record<string, unknown>) => createElement("a", props, children as import("react").ReactNode) }));
vi.mock("./pool-card-roi-preview", () => ({ PoolCardRoiPreview: () => createElement("span", null, "Projected ROI") }));
import { MarketplacePoolCardView } from "./marketplace-pool-card";

const fixture = {
  id: "strategy-1", slug: "original-pool-slug", name: "Alpha Pool", displayPoolName: "Alpha Pool",
  managerName: "Alex Morgan", managerSlug: "alex-morgan", managerVerified: true, poolVerified: true,
  managerCountryCode: "US", managerPhotoUrl: null, coverImageUrl: null, coverSubtitle: null,
  coverImagePosition: null, cardBackgroundColor: null, tagline: "A disciplined trading strategy",
  canParticipate: true, capacityStatus: "open", activeInvestors: 12, cycleParticipantCount: 12,
  managerRating: 4.8, managerReviewCount: 4, raisedCapital: 12500, targetCapital: 50000,
  minInvestment: 100, expectedDurationLabel: "30 days", poolLevelLabel: "Open",
  tradingScheduleLabel: null, tradingAssetTag: "XAUUSD", strategyTag: "Swing", tradingStyleTag: null,
  riskLevelTag: "Moderate Risk", aggressivenessLevel: "moderate", tradingPair: "XAUUSD",
  categories: ["gold"], marketsTraded: ["XAUUSD"],
  activeCycle: { status: "trading", fundingStartedAt: null, openingDate: null },
} as MarketplacePoolCard;

describe("copy-trading client presentation", () => {
  it("leads with the trader on desktop and mobile and preserves action destinations", () => {
    const html = renderToStaticMarkup(createElement(MarketplacePoolCardView, { pool: fixture }));
    expect(html.match(/<h4[^>]*>Alex Morgan<\/h4>/g)).toHaveLength(2);
    expect(html.match(/>Copy trader<\/a>/g)).toHaveLength(2);
    expect(html).toContain('href="/marketplace/original-pool-slug/join"');
    expect(html).toContain('href="/marketplace/original-pool-slug"');
    expect(html).toContain("Copiers");
    expect(html).toContain("Traded capital");
    expect(html).toContain(formatCurrency(12500));
    expect(html).not.toMatch(/Raised Capital|Target Capital|Payout Duration|Return Duration|Invest in Pool|Alpha Pool/);
    expect(html).not.toContain("50,000");
    expect(html).not.toContain("30 days");
  });

  it.each(["full", "closed"])("keeps the original %s capacity guard", (capacityStatus) => {
    const html = renderToStaticMarkup(createElement(MarketplacePoolCardView, { pool: { ...fixture, capacityStatus } }));
    expect(html).not.toContain('/original-pool-slug/join');
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it("keeps participation disabled and does not fabricate trader verification", () => {
    const html = renderToStaticMarkup(createElement(MarketplacePoolCardView, { pool: { ...fixture, canParticipate: false, managerVerified: false } }));
    expect(html).not.toContain('/original-pool-slug/join');
    expect(html).not.toContain('aria-label="Verified trader"');
  });

  it("does not relabel pending funding as traded capital or mutate the data", () => {
    const funding = { ...fixture, activeCycle: { ...fixture.activeCycle!, status: "funding" as const } };
    expect(displayedTradedCapital(funding)).toBe(0);
    expect(displayedTradedCapital(fixture)).toBe(12500);
    expect(funding.raisedCapital).toBe(12500);
    expect(funding.targetCapital).toBe(50000);
  });

  it("adapts legacy display labels without changing their source", () => {
    const label = "Pool Managers";
    expect(copyTradingText(label)).toBe("Verified traders");
    expect(copyTradingText("Live Pools")).toBe("Copy trading");
    expect(copyTradingText("Most Investors")).toBe("Most copiers");
    expect(copyTradingText("This pool involves risk of loss.")).toBe("This strategy involves risk of loss.");
    expect(label).toBe("Pool Managers");
  });

  it("uses verified-trader journey and copy-ratio wording for saved display content", () => {
    expect(copyTradingText("Become a Pool Manager")).toBe("Become a verified trader");
    expect(copyTradingText("Continue Pool Manager Journey")).toBe("Continue your verified trader journey");
    expect(copyTradingText("Join Pool")).toBe("Copy trader");
    expect(copyTradingText("Multiplier")).toBe("Copy ratio");
    expect(copyTradingText("Projected ROI multiplier: 2.00×")).toBe("copy ratio: 2.00×");
  });
});
