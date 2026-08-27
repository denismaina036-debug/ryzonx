import { describe, expect, it } from "vitest";
import type { CommunicationTemplate } from "@/domain/communication/types";
import { renderTemplateWithPremium } from "./catalog-bridge";

describe("renderTemplateWithPremium", () => {
  it("renders editable rich-text automation templates as safe HTML and plain text", () => {
    const template = {
      id: "pool-automation-template",
      slug: "pool_activity_new_pool",
      name: "New pool",
      category: "announcements",
      description: null,
      subjectTemplate: "New pool — {{pool_name}}",
      bodyTemplate: '<p><strong>Pool:</strong> {{pool_name}}</p><p><a href="{{pool_url}}">View pool</a></p>',
      emailSpec: null,
      inAppTitleTemplate: "New pool",
      inAppBodyTemplate: "{{pool_name}} is available.",
      variablesSchema: [],
      defaultChannels: ["telegram"],
      isActive: true,
      isArchived: false,
      version: 1,
      lastEditedBy: null,
      createdAt: "",
      updatedAt: "",
    } satisfies CommunicationTemplate;

    const result = renderTemplateWithPremium(template, {
      pool_name: "Alpha Pool",
      pool_url: "https://ryvonx.com/marketplace/alpha",
    });

    expect(result.subject).toBe("New pool — Alpha Pool");
    expect(result.html).toContain("<strong>Pool:</strong> Alpha Pool");
    expect(result.html).toContain('href="https://ryvonx.com/marketplace/alpha"');
    expect(result.plainText).toContain("Pool: Alpha Pool");
    expect(result.plainText).not.toContain("<strong>");
  });
});
