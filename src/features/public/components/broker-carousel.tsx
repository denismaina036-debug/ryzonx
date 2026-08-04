"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { resolveBrokerLogoUrl } from "@/domain/landing-page/broker-logos";
import type { LandingBrokerItem } from "@/domain/landing-page/types";

interface BrokerCarouselProps {
  brokers: LandingBrokerItem[];
  autoRotate: boolean;
}

function BrokerLogoItem({ broker }: { broker: LandingBrokerItem }) {
  const logoUrl = resolveBrokerLogoUrl(broker);

  return (
    <div className="flex h-14 w-32 shrink-0 items-center justify-center px-3 sm:h-16 sm:w-36">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={broker.name}
          className="max-h-9 max-w-full object-contain transition-transform duration-300 hover:scale-105 sm:max-h-10"
        />
      ) : (
        <span className="truncate text-sm font-semibold tracking-wide text-navy-600">
          {broker.name}
        </span>
      )}
    </div>
  );
}

export function BrokerCarousel({ brokers, autoRotate }: BrokerCarouselProps) {
  const visibleBrokers = useMemo(
    () =>
      [...brokers]
        .filter((broker) => broker.isEnabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [brokers]
  );

  if (visibleBrokers.length === 0) return null;

  const loopItems = [...visibleBrokers, ...visibleBrokers];

  return (
    <div className="relative mt-7 overflow-hidden rounded-2xl border border-border/80 bg-card/80 py-5 shadow-sm backdrop-blur-sm sm:mt-8 sm:py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-card via-card/90 to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-card via-card/90 to-transparent sm:w-16" />

      <div
        className={cn(
          "flex w-max items-center gap-10 px-6 sm:gap-14 sm:px-8",
          autoRotate && visibleBrokers.length > 1 && "animate-broker-marquee"
        )}
      >
        {loopItems.map((broker, index) => (
          <BrokerLogoItem
            key={`${broker.id}-${index}`}
            broker={broker}
          />
        ))}
      </div>
    </div>
  );
}
