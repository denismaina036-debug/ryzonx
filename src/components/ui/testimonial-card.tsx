import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@/types";

interface TestimonialCardProps {
  testimonial: Testimonial;
  className?: string;
}

export function TestimonialCard({
  testimonial,
  className,
}: TestimonialCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm",
        className
      )}
    >
      <div className="mb-4 flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < testimonial.rating
                ? "fill-gold-400 text-gold-400"
                : "text-navy-200"
            )}
          />
        ))}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-navy-600">
        &ldquo;{testimonial.content}&rdquo;
      </p>
      <div className="mt-6 border-t border-border pt-4">
        <p className="text-sm font-semibold text-navy-950">
          {testimonial.name}
        </p>
        <p className="text-xs text-navy-500">{testimonial.role}</p>
      </div>
    </div>
  );
}

interface TestimonialGridProps {
  testimonials: Testimonial[];
  className?: string;
}

export function TestimonialGrid({
  testimonials,
  className,
}: TestimonialGridProps) {
  return (
    <div
      className={cn(
        "grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {testimonials.map((t) => (
        <TestimonialCard key={t.id} testimonial={t} />
      ))}
    </div>
  );
}
