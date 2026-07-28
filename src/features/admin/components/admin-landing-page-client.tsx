"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminSubNav } from "@/features/admin/components/admin-sub-nav";
import type {
  LandingAutomaticStatKey,
  LandingPageContent,
  LandingStatIcon,
  LandingStatItem,
} from "@/domain/landing-page/types";

const TABS = [
  { label: "Hero", href: "/admin/pages?tab=hero", tab: "hero" },
  { label: "Statistics", href: "/admin/pages?tab=statistics", tab: "statistics" },
  { label: "Sections", href: "/admin/pages?tab=sections", tab: "sections" },
  { label: "Contact", href: "/admin/pages?tab=contact", tab: "contact" },
  { label: "Footer", href: "/admin/pages?tab=footer", tab: "footer" },
  { label: "Social Media", href: "/admin/pages?tab=social", tab: "social" },
  { label: "SEO", href: "/admin/pages?tab=seo", tab: "seo" },
] as const;

const AUTOMATIC_KEYS: LandingAutomaticStatKey[] = [
  "total_investors",
  "verified_pool_managers",
  "active_pools",
  "completed_cycles",
  "total_capital",
  "total_pool_value",
  "active_investors",
  "daily_roi",
  "monthly_roi",
  "win_rate",
  "closed_trades",
  "average_investment",
  "largest_investment",
  "average_roi",
  "total_deposits",
  "total_withdrawals",
];

const ICON_OPTIONS: LandingStatIcon[] = [
  "TrendingUp",
  "Users",
  "BarChart3",
  "Target",
  "Activity",
  "Wallet",
  "Crown",
  "ArrowDownToLine",
  "ArrowUpFromLine",
  "Landmark",
  "LineChart",
  "Shield",
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StatEditor({
  stat,
  onChange,
  onRemove,
}: {
  stat: LandingStatItem;
  onChange: (next: LandingStatItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
      <Field label="Title">
        <Input value={stat.title} onChange={(e) => onChange({ ...stat, title: e.target.value })} />
      </Field>
      <Field label="Icon">
        <Select value={stat.icon} onValueChange={(v) => onChange({ ...stat, icon: v as LandingStatIcon })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ICON_OPTIONS.map((icon) => (
              <SelectItem key={icon} value={icon}>{icon}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Mode">
        <Select
          value={stat.mode}
          onValueChange={(v) => onChange({ ...stat, mode: v as "manual" | "automatic" })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="automatic">Automatic</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {stat.mode === "manual" ? (
        <Field label="Manual Value">
          <Input
            value={stat.manualValue ?? ""}
            onChange={(e) => onChange({ ...stat, manualValue: e.target.value })}
          />
        </Field>
      ) : (
        <Field label="Automatic Source">
          <Select
            value={stat.automaticKey ?? "total_investors"}
            onValueChange={(v) =>
              onChange({ ...stat, automaticKey: v as LandingAutomaticStatKey })
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AUTOMATIC_KEYS.map((key) => (
                <SelectItem key={key} value={key}>{key.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      <div className="sm:col-span-2 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}

export function AdminLandingPageClient({
  initial,
  activeTab,
}: {
  initial: LandingPageContent;
  activeTab: string;
}) {
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);

  const tab = useMemo(
    () => TABS.find((t) => t.tab === activeTab)?.tab ?? "hero",
    [activeTab]
  );

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/landing-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = (await res.json()) as { content?: LandingPageContent; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      if (json.content) setContent(json.content);
      toast.success("Landing page content saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateStatList(
    key: "heroStats" | "statistics",
    index: number,
    next: LandingStatItem
  ) {
    setContent((prev) => ({
      ...prev,
      [key]: prev[key].map((item, i) => (i === index ? next : item)),
    }));
  }

  return (
    <div className="space-y-6">
      <AdminSubNav items={TABS.map(({ label, href }) => ({ label, href }))} />

      {tab === "hero" && (
        <Card>
          <CardHeader><CardTitle>Hero Section</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Badge"><Input value={content.hero.badge} onChange={(e) => setContent({ ...content, hero: { ...content.hero, badge: e.target.value } })} /></Field>
            <Field label="Trust Banner"><Input value={content.hero.trustBanner} onChange={(e) => setContent({ ...content, hero: { ...content.hero, trustBanner: e.target.value } })} /></Field>
            <div className="sm:col-span-2"><Field label="Heading"><Input value={content.hero.heading} onChange={(e) => setContent({ ...content, hero: { ...content.hero, heading: e.target.value } })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Subheading"><Input value={content.hero.subheading} onChange={(e) => setContent({ ...content, hero: { ...content.hero, subheading: e.target.value } })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Description"><Textarea value={content.hero.description} onChange={(e) => setContent({ ...content, hero: { ...content.hero, description: e.target.value } })} rows={3} /></Field></div>
            <Field label="Primary Button Text"><Input value={content.hero.primaryButtonText} onChange={(e) => setContent({ ...content, hero: { ...content.hero, primaryButtonText: e.target.value } })} /></Field>
            <Field label="Primary Button Link"><Input value={content.hero.primaryButtonLink} onChange={(e) => setContent({ ...content, hero: { ...content.hero, primaryButtonLink: e.target.value } })} /></Field>
            <Field label="Secondary Button Text"><Input value={content.hero.secondaryButtonText} onChange={(e) => setContent({ ...content, hero: { ...content.hero, secondaryButtonText: e.target.value } })} /></Field>
            <Field label="Secondary Button Link"><Input value={content.hero.secondaryButtonLink} onChange={(e) => setContent({ ...content, hero: { ...content.hero, secondaryButtonLink: e.target.value } })} /></Field>
            <Field label="Background Image URL"><Input value={content.hero.backgroundImageUrl} onChange={(e) => setContent({ ...content, hero: { ...content.hero, backgroundImageUrl: e.target.value } })} /></Field>
            <Field label="Illustration Image URL"><Input value={content.hero.illustrationImageUrl} onChange={(e) => setContent({ ...content, hero: { ...content.hero, illustrationImageUrl: e.target.value } })} /></Field>
            <Field label="Video URL"><Input value={content.hero.videoUrl} onChange={(e) => setContent({ ...content, hero: { ...content.hero, videoUrl: e.target.value } })} /></Field>
            <Field label="Show Live Activity Ticker">
              <Select
                value={content.hero.showTrustTicker ? "yes" : "no"}
                onValueChange={(v) => setContent({ ...content, hero: { ...content.hero, showTrustTicker: v === "yes" } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Visible</SelectItem>
                  <SelectItem value="no">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>
      )}

      {tab === "statistics" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Hero Floating Statistics</CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  setContent({
                    ...content,
                    heroStats: [
                      ...content.heroStats,
                      {
                        id: `hs-${Date.now()}`,
                        title: "New Stat",
                        mode: "manual",
                        manualValue: "0",
                        icon: "TrendingUp",
                      },
                    ],
                  })
                }
              >
                Add Stat
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.heroStats.map((stat, index) => (
                <StatEditor
                  key={stat.id}
                  stat={stat}
                  onChange={(next) => updateStatList("heroStats", index, next)}
                  onRemove={() =>
                    setContent({
                      ...content,
                      heroStats: content.heroStats.filter((_, i) => i !== index),
                    })
                  }
                />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Statistics Section</CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  setContent({
                    ...content,
                    statistics: [
                      ...content.statistics,
                      {
                        id: `s-${Date.now()}`,
                        title: "New Stat",
                        mode: "manual",
                        manualValue: "0",
                        icon: "Users",
                      },
                    ],
                  })
                }
              >
                Add Stat
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.statistics.map((stat, index) => (
                <StatEditor
                  key={stat.id}
                  stat={stat}
                  onChange={(next) => updateStatList("statistics", index, next)}
                  onRemove={() =>
                    setContent({
                      ...content,
                      statistics: content.statistics.filter((_, i) => i !== index),
                    })
                  }
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "sections" && (
        <Card>
          <CardHeader><CardTitle>Homepage Section Visibility & Copy</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(content.sections).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <span className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                <Select
                  value={enabled ? "on" : "off"}
                  onValueChange={(v) =>
                    setContent({
                      ...content,
                      sections: { ...content.sections, [key]: v === "on" },
                    })
                  }
                >
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on">Visible</SelectItem>
                    <SelectItem value="off">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Performance Title"><Input value={content.copy.performance.title} onChange={(e) => setContent({ ...content, copy: { ...content.copy, performance: { ...content.copy.performance, title: e.target.value } } })} /></Field>
              <Field label="Recent Activity Title"><Input value={content.copy.recentActivity.title} onChange={(e) => setContent({ ...content, copy: { ...content.copy, recentActivity: { ...content.copy.recentActivity, title: e.target.value } } })} /></Field>
              <Field label="How It Works Title"><Input value={content.copy.howItWorks.title} onChange={(e) => setContent({ ...content, copy: { ...content.copy, howItWorks: { ...content.copy.howItWorks, title: e.target.value } } })} /></Field>
              <Field label="Why RyvonX Title"><Input value={content.copy.whyRyvonx.title} onChange={(e) => setContent({ ...content, copy: { ...content.copy, whyRyvonx: { ...content.copy.whyRyvonx, title: e.target.value } } })} /></Field>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-navy-900">How It Works Steps</h3>
              {content.howItWorksSteps.map((step, index) => (
                <div key={step.step} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                  <Field label={`Step ${step.step} Title`}>
                    <Input
                      value={step.title}
                      onChange={(e) => {
                        const next = [...content.howItWorksSteps];
                        next[index] = { ...step, title: e.target.value };
                        setContent({ ...content, howItWorksSteps: next });
                      }}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <Textarea
                        value={step.description}
                        onChange={(e) => {
                          const next = [...content.howItWorksSteps];
                          next[index] = { ...step, description: e.target.value };
                          setContent({ ...content, howItWorksSteps: next });
                        }}
                        rows={2}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-navy-900">Why RyvonX Feature Cards</h3>
              {content.whyRyvonxFeatures.map((feature, index) => (
                <div key={feature.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                  <Field label="Title">
                    <Input
                      value={feature.title}
                      onChange={(e) => {
                        const next = [...content.whyRyvonxFeatures];
                        next[index] = { ...feature, title: e.target.value };
                        setContent({ ...content, whyRyvonxFeatures: next });
                      }}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <Textarea
                        value={feature.description}
                        onChange={(e) => {
                          const next = [...content.whyRyvonxFeatures];
                          next[index] = { ...feature, description: e.target.value };
                          setContent({ ...content, whyRyvonxFeatures: next });
                        }}
                        rows={2}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "contact" && (
        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["companyName", "Company Name"],
                ["supportEmail", "Support Email"],
                ["generalEmail", "General Email"],
                ["phone", "Phone"],
                ["whatsapp", "WhatsApp"],
                ["country", "Country"],
                ["businessHours", "Business Hours"],
                ["googleMapsUrl", "Google Maps Link"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  value={content.contact[key]}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      contact: { ...content.contact, [key]: e.target.value },
                    })
                  }
                />
              </Field>
            ))}
            <div className="sm:col-span-2">
              <Field label="Office Address">
                <Textarea
                  value={content.contact.officeAddress}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      contact: { ...content.contact, officeAddress: e.target.value },
                    })
                  }
                  rows={3}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "footer" && (
        <Card>
          <CardHeader><CardTitle>Footer</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="About / Brand Name"><Input value={content.footer.aboutText} onChange={(e) => setContent({ ...content, footer: { ...content.footer, aboutText: e.target.value } })} /></Field>
            <Field label="Logo URL"><Input value={content.footer.logoUrl} onChange={(e) => setContent({ ...content, footer: { ...content.footer, logoUrl: e.target.value } })} /></Field>
            <div className="sm:col-span-2"><Field label="Company Description"><Textarea value={content.footer.companyDescription} onChange={(e) => setContent({ ...content, footer: { ...content.footer, companyDescription: e.target.value } })} rows={3} /></Field></div>
            <Field label="Copyright"><Input value={content.footer.copyrightText} onChange={(e) => setContent({ ...content, footer: { ...content.footer, copyrightText: e.target.value } })} /></Field>
            <Field label="Disclaimer"><Input value={content.footer.disclaimerText} onChange={(e) => setContent({ ...content, footer: { ...content.footer, disclaimerText: e.target.value } })} /></Field>
            <Field label="Newsletter Title"><Input value={content.footer.newsletterTitle} onChange={(e) => setContent({ ...content, footer: { ...content.footer, newsletterTitle: e.target.value } })} /></Field>
            <Field label="Footer CTA Text"><Input value={content.footer.ctaText} onChange={(e) => setContent({ ...content, footer: { ...content.footer, ctaText: e.target.value } })} /></Field>
            <Field label="Footer CTA Link"><Input value={content.footer.ctaLink} onChange={(e) => setContent({ ...content, footer: { ...content.footer, ctaLink: e.target.value } })} /></Field>
          </CardContent>
        </Card>
      )}

      {tab === "social" && (
        <Card>
          <CardHeader><CardTitle>Social Media</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {Object.keys(content.social).map((key) => (
              <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                <Input
                  value={content.social[key as keyof typeof content.social]}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      social: { ...content.social, [key]: e.target.value },
                    })
                  }
                  placeholder="https://"
                />
              </Field>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "seo" && (
        <Card>
          <CardHeader><CardTitle>SEO & Homepage Settings</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Homepage Title"><Input value={content.seo.title} onChange={(e) => setContent({ ...content, seo: { ...content.seo, title: e.target.value } })} /></Field>
            <Field label="Favicon URL"><Input value={content.seo.faviconUrl} onChange={(e) => setContent({ ...content, seo: { ...content.seo, faviconUrl: e.target.value } })} /></Field>
            <div className="sm:col-span-2"><Field label="Meta Description"><Textarea value={content.seo.description} onChange={(e) => setContent({ ...content, seo: { ...content.seo, description: e.target.value } })} rows={3} /></Field></div>
            <Field label="Keywords"><Input value={content.seo.keywords} onChange={(e) => setContent({ ...content, seo: { ...content.seo, keywords: e.target.value } })} /></Field>
            <Field label="Open Graph Image URL"><Input value={content.seo.openGraphImageUrl} onChange={(e) => setContent({ ...content, seo: { ...content.seo, openGraphImageUrl: e.target.value } })} /></Field>
            <Field label="Social Preview Image URL"><Input value={content.seo.socialPreviewImageUrl} onChange={(e) => setContent({ ...content, seo: { ...content.seo, socialPreviewImageUrl: e.target.value } })} /></Field>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save Landing Page"}
        </Button>
      </div>
    </div>
  );
}
