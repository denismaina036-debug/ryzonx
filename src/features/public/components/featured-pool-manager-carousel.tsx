"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FeaturedLandingPoolManager } from "@/domain/landing-page/types";
import { FeaturedPoolManagerCard } from "@/features/public/components/featured-pool-manager-card";

interface FeaturedPoolManagerCarouselProps {
  managers: FeaturedLandingPoolManager[];
  autoRotate: boolean;
}

export function FeaturedPoolManagerCarousel({
  managers,
  autoRotate,
}: FeaturedPoolManagerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!autoRotate || managers.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % managers.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [autoRotate, managers.length]);

  if (managers.length === 0) return null;

  const desktopManagers =
    managers.length >= 3
      ? [
          activeIndex,
          (activeIndex + 1) % managers.length,
          (activeIndex + 2) % managers.length,
        ]
      : managers.map((_, index) => index);

  return (
    <div className="mt-8 space-y-6">
      <div
        className={`hidden gap-6 lg:grid ${
          desktopManagers.length === 1
            ? "lg:grid-cols-1"
            : desktopManagers.length === 2
              ? "lg:grid-cols-2"
              : "lg:grid-cols-3"
        }`}
      >
        {desktopManagers.map((index, position) => (
          <motion.div
            key={`${managers[index]?.id}-${position}`}
            initial={autoRotate ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <FeaturedPoolManagerCard
              manager={managers[index]!}
              highlighted={position === 0}
            />
          </motion.div>
        ))}
      </div>

      <div className="lg:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={managers[activeIndex]?.id}
            initial={autoRotate ? { opacity: 0, x: 24 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={autoRotate ? { opacity: 0, x: -24 } : undefined}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <FeaturedPoolManagerCard manager={managers[activeIndex]!} highlighted />
          </motion.div>
        </AnimatePresence>
      </div>

      {managers.length > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {managers.map((manager, index) => (
            <button
              key={manager.id}
              type="button"
              aria-label={`Show ${manager.displayName}`}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === activeIndex ? "w-6 bg-royal-600" : "w-2 bg-navy-200"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
