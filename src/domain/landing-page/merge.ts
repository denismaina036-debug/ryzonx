import type { LandingPageContent, LandingStatItem } from "@/domain/landing-page/types";
import { DEFAULT_LANDING_PAGE_CONTENT } from "@/domain/landing-page/defaults";
import { withResolvedBrokerLogos } from "@/domain/landing-page/broker-logos";
import { inferFormatFromAutomaticKey } from "@/domain/landing-page/stat-format";

function normalizeStatItem(stat: LandingStatItem): LandingStatItem {
  return {
    ...stat,
    valueFormat:
      stat.valueFormat ??
      (stat.automaticKey ? inferFormatFromAutomaticKey(stat.automaticKey) : "number"),
  };
}

function normalizeCtaHref(value: unknown, fallback: string): string {
  const href = typeof value === "string" ? value.trim() : "";
  if (href.startsWith("/") && href[1] !== "/" && href[1] !== "\\") return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function normalizeLandingContent(content: LandingPageContent): LandingPageContent {
  return {
    ...content,
    brokers: withResolvedBrokerLogos(content.brokers),
    heroStats: content.heroStats.map(normalizeStatItem),
    statistics: content.statistics.map(normalizeStatItem),
    copyTradingEducation: {
      ...content.copyTradingEducation,
      intro: {
        ...content.copyTradingEducation.intro,
        ctaHref: normalizeCtaHref(
          content.copyTradingEducation.intro.ctaHref,
          DEFAULT_LANDING_PAGE_CONTENT.copyTradingEducation.intro.ctaHref
        ),
      },
      sections: content.copyTradingEducation.sections.map((section) => {
        const fallback =
          DEFAULT_LANDING_PAGE_CONTENT.copyTradingEducation.sections.find(
            (item) => item.id === section.id
          )?.ctaHref ?? "/marketplace";
        return {
          ...section,
          order: Number.isFinite(section.order) ? section.order : 0,
          displayNumber:
            typeof section.displayNumber === "string" && section.displayNumber.trim()
              ? section.displayNumber.trim()
              : String(section.order || 1).padStart(2, "0"),
          ctaHref: normalizeCtaHref(section.ctaHref, fallback),
        };
      }),
      faqs: content.copyTradingEducation.faqs.map((faq) => ({
        ...faq,
        order: Number.isFinite(faq.order) ? faq.order : 0,
      })),
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function deepMerge<T>(defaults: T, stored: unknown): T {
  if (stored == null) return defaults;
  if (Array.isArray(defaults)) {
    return (Array.isArray(stored) && stored.length > 0 ? stored : defaults) as T;
  }
  if (!isPlainObject(defaults) || !isPlainObject(stored)) {
    return (stored as T) ?? defaults;
  }
  const result = { ...defaults } as Record<string, unknown>;
  for (const key of Object.keys(defaults)) {
    result[key] = deepMerge(
      (defaults as Record<string, unknown>)[key],
      stored[key]
    );
  }
  for (const key of Object.keys(stored)) {
    if (!(key in defaults)) {
      result[key] = stored[key];
    }
  }
  return result as T;
}

export function mergeLandingPageContent(stored: unknown): LandingPageContent {
  return normalizeLandingContent(deepMerge(DEFAULT_LANDING_PAGE_CONTENT, stored));
}

export function parseLandingPageContent(raw: unknown): LandingPageContent {
  if (typeof raw === "string") {
    try {
      return mergeLandingPageContent(JSON.parse(raw));
    } catch {
      return DEFAULT_LANDING_PAGE_CONTENT;
    }
  }
  return mergeLandingPageContent(raw);
}
