"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { LandingCopyTradingEducation } from "@/domain/landing-page/types";
import { cn } from "@/lib/utils";

export function CopyTradingEducationSection({
  content,
}: {
  content: LandingCopyTradingEducation;
}) {
  const accordionId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const sections = useMemo(
    () =>
      content.sections
        .filter((section) => section.enabled)
        .sort((a, b) => a.order - b.order),
    [content.sections]
  );
  const faqs = useMemo(
    () => content.faqs.filter((faq) => faq.enabled).sort((a, b) => a.order - b.order),
    [content.faqs]
  );

  if (!content.enabled || sections.length === 0) return null;

  return (
    <section
      id="copy-trading-education"
      aria-labelledby={content.intro.enabled ? "copy-trading-education-title" : undefined}
      aria-label={content.intro.enabled ? undefined : "Copy trading education"}
      className="scroll-mt-20 border-y border-slate-200 bg-[#fbfcfe] px-5 py-16 text-slate-950 sm:px-7 sm:py-20 lg:px-10 lg:py-24"
    >
      <div className="mx-auto w-full max-w-5xl">
        {content.intro.enabled ? (
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
              {content.intro.eyebrow}
            </p>
            <h2
              id="copy-trading-education-title"
              className="mt-4 max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl"
            >
              {content.intro.heading}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {content.intro.description}
            </p>
            {content.intro.ctaEnabled && content.intro.ctaLabel.trim() ? (
              <Link
                href={content.intro.ctaHref}
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:w-auto"
              >
                {content.intro.ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ) : null}

        <article className={cn("border-t border-slate-300 pt-8 text-left sm:pt-10", content.intro.enabled ? "mt-14 sm:mt-16" : "mt-0")}>
          <h3 className="text-sm font-semibold text-slate-950">In this article</h3>
          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {sections.map((section, index) => {
              const isOpen = openId === section.id;
              const triggerId = `${accordionId}-${section.id}-trigger`;
              const panelId = `${accordionId}-${section.id}-panel`;
              const displayNumber =
                section.displayNumber?.trim() || String(index + 1).padStart(2, "0");

              return (
                <section key={section.id} className="scroll-mt-20">
                  <h3>
                    <button
                      id={triggerId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenId(isOpen ? null : section.id)}
                      className="group flex w-full items-start gap-4 rounded-sm py-5 text-left outline-none transition hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 sm:items-center sm:gap-6 sm:py-6"
                    >
                      <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold tracking-[0.12em] text-blue-600 sm:mt-0">
                        {displayNumber}
                      </span>
                      <span className="min-w-0 flex-1 text-base font-semibold leading-6 text-slate-900 group-hover:text-blue-700 sm:text-lg">
                        {section.title}
                      </span>
                      <ChevronDown
                        className={cn(
                          "mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 sm:mt-0",
                          isOpen && "rotate-180 text-blue-600"
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    aria-hidden={!isOpen}
                    inert={!isOpen ? true : undefined}
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-7 pl-0 sm:pl-12">
                        <div className="max-w-3xl space-y-4 text-[15px] leading-7 text-slate-600 sm:text-base">
                          {section.body
                            .split(/\n\s*\n/)
                            .filter(Boolean)
                            .map((paragraph, paragraphIndex) => (
                              <p key={paragraphIndex} className="whitespace-pre-line">
                                {paragraph}
                              </p>
                            ))}
                        </div>

                        {section.id === "frequently-asked-questions" && faqs.length > 0 ? (
                          <dl className="mt-6 max-w-3xl divide-y divide-slate-200 border-y border-slate-200">
                            {faqs.map((faq) => (
                              <div key={faq.id} className="py-4">
                                <dt className="font-semibold text-slate-900">{faq.question}</dt>
                                <dd className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                                  {faq.answer}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}

                        {section.ctaEnabled && section.ctaLabel.trim() ? (
                          <Link
                            href={section.ctaHref}
                            className="mt-6 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-blue-700 outline-none transition hover:text-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4"
                          >
                            {section.ctaLabel}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
