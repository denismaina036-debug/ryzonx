"use client";

import type {
  LandingCopyTradingEducation,
  LandingEducationFaq,
  LandingEducationSection,
  LandingRiskWarning,
} from "@/domain/landing-page/types";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function VisibilitySelect({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <Select value={enabled ? "on" : "off"} onValueChange={(value) => onChange(value === "on")}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="on">Visible</SelectItem>
        <SelectItem value="off">Hidden</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function AdminCopyTradingEducationEditor({
  riskWarning,
  education,
  onRiskWarningChange,
  onEducationChange,
}: {
  riskWarning: LandingRiskWarning;
  education: LandingCopyTradingEducation;
  onRiskWarningChange: (value: LandingRiskWarning) => void;
  onEducationChange: (value: LandingCopyTradingEducation) => void;
}) {
  function updateSection(id: string, next: LandingEducationSection) {
    onEducationChange({
      ...education,
      sections: education.sections.map((section) => (section.id === id ? next : section)),
    });
  }

  function updateFaq(id: string, next: LandingEducationFaq) {
    onEducationChange({
      ...education,
      faqs: education.faqs.map((faq) => (faq.id === id ? next : faq)),
    });
  }

  function addFaq() {
    const nextOrder = Math.max(0, ...education.faqs.map((faq) => faq.order)) + 1;
    onEducationChange({
      ...education,
      faqs: [
        ...education.faqs,
        {
          id: `faq-${crypto.randomUUID()}`,
          enabled: true,
          order: nextOrder,
          question: "New question",
          answer: "Add the answer here.",
        },
      ],
    });
  }

  function removeFaq(id: string) {
    onEducationChange({
      ...education,
      faqs: education.faqs.filter((faq) => faq.id !== id),
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Risk Warning</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Display Warning">
            <VisibilitySelect
              enabled={riskWarning.enabled}
              onChange={(enabled) => onRiskWarningChange({ ...riskWarning, enabled })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Warning Text">
              <Textarea
                value={riskWarning.text}
                onChange={(event) =>
                  onRiskWarningChange({ ...riskWarning, text: event.target.value })
                }
                rows={3}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Copy Trading Education</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Display Education Section">
            <VisibilitySelect
              enabled={education.enabled}
              onChange={(enabled) => onEducationChange({ ...education, enabled })}
            />
          </Field>
          <Field label="Display Introduction">
            <VisibilitySelect
              enabled={education.intro.enabled}
              onChange={(enabled) =>
                onEducationChange({
                  ...education,
                  intro: { ...education.intro, enabled },
                })
              }
            />
          </Field>
          <Field label="Eyebrow / Label">
            <Input
              value={education.intro.eyebrow}
              onChange={(event) =>
                onEducationChange({
                  ...education,
                  intro: { ...education.intro, eyebrow: event.target.value },
                })
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Heading">
              <Input
                value={education.intro.heading}
                onChange={(event) =>
                  onEducationChange({
                    ...education,
                    intro: { ...education.intro, heading: event.target.value },
                  })
                }
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                value={education.intro.description}
                onChange={(event) =>
                  onEducationChange({
                    ...education,
                    intro: { ...education.intro, description: event.target.value },
                  })
                }
                rows={3}
              />
            </Field>
          </div>
          <Field label="Display Primary Button">
            <VisibilitySelect
              enabled={education.intro.ctaEnabled}
              onChange={(ctaEnabled) =>
                onEducationChange({
                  ...education,
                  intro: { ...education.intro, ctaEnabled },
                })
              }
            />
          </Field>
          <Field label="Primary Button Text">
            <Input
              value={education.intro.ctaLabel}
              onChange={(event) =>
                onEducationChange({
                  ...education,
                  intro: { ...education.intro, ctaLabel: event.target.value },
                })
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Primary Button Destination">
              <Input
                value={education.intro.ctaHref}
                onChange={(event) =>
                  onEducationChange({
                    ...education,
                    intro: { ...education.intro, ctaHref: event.target.value },
                  })
                }
                placeholder="/marketplace or https://..."
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy-950">Article Sections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a section to edit its title, article content, button, and display order.
          </p>
        </div>
        {education.sections.map((section) => (
          <details key={section.id} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-5 font-semibold text-navy-950 outline-none transition hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
              <span className="font-mono text-xs text-blue-600">
                {section.displayNumber || String(section.order).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate">{section.title}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid gap-4 border-t border-border px-6 py-5 sm:grid-cols-2">
              <Field label="Display Section">
                <VisibilitySelect
                  enabled={section.enabled}
                  onChange={(enabled) => updateSection(section.id, { ...section, enabled })}
                />
              </Field>
              <Field label="Display Order">
                <Input
                  type="number"
                  min={1}
                  value={section.order}
                  onChange={(event) =>
                    updateSection(section.id, {
                      ...section,
                      order: Number(event.target.value) || 1,
                    })
                  }
                />
              </Field>
              <Field label="Section Number">
                <Input
                  value={section.displayNumber}
                  onChange={(event) =>
                    updateSection(section.id, {
                      ...section,
                      displayNumber: event.target.value,
                    })
                  }
                  placeholder="01"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Section Title">
                  <Input
                    value={section.title}
                    onChange={(event) =>
                      updateSection(section.id, { ...section, title: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Article Content">
                  <Textarea
                    value={section.body}
                    onChange={(event) =>
                      updateSection(section.id, { ...section, body: event.target.value })
                    }
                    rows={7}
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Use blank lines for paragraphs and start lines with numbers or bullets for short lists. HTML is not required.
                  </p>
                </Field>
              </div>
              <Field label="Display Section Button">
                <VisibilitySelect
                  enabled={section.ctaEnabled}
                  onChange={(ctaEnabled) =>
                    updateSection(section.id, { ...section, ctaEnabled })
                  }
                />
              </Field>
              <Field label="Button Text">
                <Input
                  value={section.ctaLabel}
                  onChange={(event) =>
                    updateSection(section.id, { ...section, ctaLabel: event.target.value })
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Button Destination">
                  <Input
                    value={section.ctaHref}
                    onChange={(event) =>
                      updateSection(section.id, { ...section, ctaHref: event.target.value })
                    }
                    placeholder="/marketplace or https://..."
                  />
                </Field>
              </div>
            </div>
          </details>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-navy-950">Frequently Asked Questions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add, edit, reorder, hide, or remove questions shown in the education article.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addFaq}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add FAQ Item
          </Button>
        </div>
        {education.faqs.map((faq) => (
          <details key={faq.id} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-5 font-semibold text-navy-950 outline-none transition hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 truncate">{faq.question}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid gap-4 border-t border-border px-6 py-5 sm:grid-cols-2">
              <Field label="Display FAQ Item">
                <VisibilitySelect
                  enabled={faq.enabled}
                  onChange={(enabled) => updateFaq(faq.id, { ...faq, enabled })}
                />
              </Field>
              <Field label="Order">
                <Input
                  type="number"
                  min={1}
                  value={faq.order}
                  onChange={(event) =>
                    updateFaq(faq.id, { ...faq, order: Number(event.target.value) || 1 })
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="FAQ Question">
                  <Input
                    value={faq.question}
                    onChange={(event) =>
                      updateFaq(faq.id, { ...faq, question: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="FAQ Answer">
                  <Textarea
                    value={faq.answer}
                    onChange={(event) =>
                      updateFaq(faq.id, { ...faq, answer: event.target.value })
                    }
                    rows={3}
                  />
                </Field>
              </div>
              <div className="flex justify-end sm:col-span-2">
                <Button type="button" variant="outline" size="sm" onClick={() => removeFaq(faq.id)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove FAQ Item
                </Button>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
