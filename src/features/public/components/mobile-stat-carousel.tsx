"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileStatCarouselProps {
  children: ReactNode[];
  className?: string;
}

export function MobileStatCarousel({ children, className }: MobileStatCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideCount = children.length;

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth <= 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.min(Math.max(index, 0), slideCount - 1));
  }, [slideCount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateActiveIndex, { passive: true });
    updateActiveIndex();
    return () => el.removeEventListener("scroll", updateActiveIndex);
  }, [updateActiveIndex]);

  function goToSlide(index: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  if (slideCount === 0) return null;

  return (
    <div className={className}>
      <div
        ref={scrollRef}
        className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {children.map((slide, index) => (
          <div
            key={index}
            className="w-full shrink-0 snap-center snap-always"
            aria-roledescription="slide"
            aria-label={`Statistics page ${index + 1} of ${slideCount}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {slideCount > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist">
          {children.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Show statistics page ${index + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === activeIndex ? "w-5 bg-royal-600" : "w-1.5 bg-navy-200"
              )}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function chunkStatSlides<T>(items: T[], size = 4): T[][] {
  const slides: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    slides.push(items.slice(i, i + size));
  }
  return slides;
}
