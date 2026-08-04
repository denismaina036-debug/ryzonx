import type { LandingBrokerItem } from "@/domain/landing-page/types";

/** Default official broker logo paths (local assets in /public/images/brokers). */
export const DEFAULT_BROKER_LOGO_PATHS: Record<string, string> = {
  b1: "/images/brokers/pepperstone.svg",
  b2: "/images/brokers/icmarkets.svg",
  b3: "/images/brokers/xm.svg",
  b4: "/images/brokers/exness.svg",
  b5: "/images/brokers/fpmarkets.svg",
  b6: "/images/brokers/oanda.svg",
};

const NAME_FALLBACKS: Record<string, string> = {
  pepperstone: "/images/brokers/pepperstone.svg",
  "ic markets": "/images/brokers/icmarkets.svg",
  xm: "/images/brokers/xm.svg",
  exness: "/images/brokers/exness.svg",
  "fp markets": "/images/brokers/fpmarkets.svg",
  oanda: "/images/brokers/oanda.svg",
};

export function resolveBrokerLogoUrl(broker: LandingBrokerItem): string | null {
  if (broker.logoUrl.trim()) return broker.logoUrl.trim();

  const byId = DEFAULT_BROKER_LOGO_PATHS[broker.id];
  if (byId) return byId;

  const byName = NAME_FALLBACKS[broker.name.trim().toLowerCase()];
  if (byName) return byName;

  return null;
}

export function withResolvedBrokerLogos(brokers: LandingBrokerItem[]): LandingBrokerItem[] {
  return brokers.map((broker) => {
    const logoUrl = resolveBrokerLogoUrl(broker);
    return logoUrl && !broker.logoUrl.trim() ? { ...broker, logoUrl } : broker;
  });
}
