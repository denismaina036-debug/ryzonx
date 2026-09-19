import { describe, expect, it } from "vitest";
import { DEFAULT_LANDING_PAGE_CONTENT } from "@/domain/landing-page/defaults";
import { mergeLandingPageContent } from "@/domain/landing-page/merge";

describe("landing page copy-trading education content", () => {
  it("adds the complete default education content to an older stored snapshot", () => {
    const merged = mergeLandingPageContent({
      hero: { heading: "Existing heading" },
    });

    expect(merged.hero.heading).toBe("Existing heading");
    expect(merged.riskWarning.enabled).toBe(true);
    expect(merged.copyTradingEducation.sections).toHaveLength(10);
    expect(merged.copyTradingEducation.sections[0]?.displayNumber).toBe("01");
    expect(merged.copyTradingEducation.faqs).toHaveLength(7);
  });

  it("preserves admin content while rejecting unsafe CTA protocols", () => {
    const education = DEFAULT_LANDING_PAGE_CONTENT.copyTradingEducation;
    const merged = mergeLandingPageContent({
      copyTradingEducation: {
        ...education,
        intro: {
          ...education.intro,
          heading: "Admin edited heading",
          ctaHref: "javascript:alert(1)",
        },
        sections: education.sections.map((section, index) => {
          if (index === 0) return { ...section, ctaHref: "https://example.com/learn" };
          if (index === 1) return { ...section, ctaHref: "//example.com/unsafe" };
          if (index === 2) return { ...section, ctaHref: "/\\example.com/unsafe" };
          return section;
        }),
      },
    });

    expect(merged.copyTradingEducation.intro.heading).toBe("Admin edited heading");
    expect(merged.copyTradingEducation.intro.ctaHref).toBe("/marketplace");
    expect(merged.copyTradingEducation.sections[0]?.ctaHref).toBe(
      "https://example.com/learn"
    );
    expect(merged.copyTradingEducation.sections[1]?.ctaHref).toBe("/marketplace");
    expect(merged.copyTradingEducation.sections[2]?.ctaHref).toBe("/marketplace");
  });

  it("round-trips every admin-managed education field through persisted JSON", () => {
    const defaults = DEFAULT_LANDING_PAGE_CONTENT;
    const edited = {
      ...defaults,
      riskWarning: {
        enabled: false,
        text: "Edited risk warning",
      },
      copyTradingEducation: {
        ...defaults.copyTradingEducation,
        intro: {
          ...defaults.copyTradingEducation.intro,
          heading: "Edited education heading",
          description: "Edited introduction",
        },
        sections: defaults.copyTradingEducation.sections.map((section, index) =>
          index === 0
            ? {
                ...section,
                enabled: false,
                order: 7,
                displayNumber: "A1",
                title: "Edited article title",
                body: "Edited paragraph\n\n• Edited list item",
                ctaEnabled: true,
                ctaLabel: "Edited button",
                ctaHref: "/how-it-works",
              }
            : section
        ),
        faqs: [
          ...defaults.copyTradingEducation.faqs,
          {
            id: "faq-admin-added",
            enabled: true,
            order: 20,
            question: "Admin-added question?",
            answer: "Admin-added answer.",
          },
        ],
      },
    };

    const saved = mergeLandingPageContent(edited);
    const reloaded = mergeLandingPageContent(JSON.parse(JSON.stringify(saved)));
    const article = reloaded.copyTradingEducation.sections.find(
      (section) => section.id === "what-is-copy-trading"
    );
    const faq = reloaded.copyTradingEducation.faqs.find(
      (item) => item.id === "faq-admin-added"
    );

    expect(reloaded.riskWarning).toEqual(edited.riskWarning);
    expect(reloaded.copyTradingEducation.intro.heading).toBe("Edited education heading");
    expect(reloaded.copyTradingEducation.intro.description).toBe("Edited introduction");
    expect(article).toMatchObject({
      enabled: false,
      order: 7,
      displayNumber: "A1",
      title: "Edited article title",
      body: "Edited paragraph\n\n• Edited list item",
      ctaEnabled: true,
      ctaLabel: "Edited button",
      ctaHref: "/how-it-works",
    });
    expect(faq).toMatchObject({
      question: "Admin-added question?",
      answer: "Admin-added answer.",
    });
  });
});
