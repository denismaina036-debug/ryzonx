"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  History,
  Mail,
  MessageSquare,
  Monitor,
  RefreshCw,
  Save,
  Send,
  Smartphone,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMUNICATION_CATEGORIES,
  COMMUNICATION_CATEGORY_LABELS,
  COMMUNICATION_CHANNEL_LABELS,
} from "@/constants/communication";
import type {
  CommunicationCategory,
  CommunicationTemplate,
  CommunicationTemplateVersion,
  RenderedCommunication,
} from "@/domain/communication/types";
import { cn } from "@/lib/utils";

interface AdminCommunicationTemplatesViewProps {
  initialTemplates: CommunicationTemplate[];
}

type ViewportMode = "desktop" | "mobile";
type PreviewTab = "email" | "in_app" | "plain";

interface PreviewPayload {
  rendered: RenderedCommunication;
  email?: { html: string; plainText: string };
}

interface TemplateEditorDraft {
  name: string;
  description: string;
  subjectTemplate: string;
  bodyTemplate: string;
  emailTitle: string;
  emailIntro: string;
  inAppTitleTemplate: string;
  inAppBodyTemplate: string;
  isActive: boolean;
  changeNotes: string;
}

function createEditorDraft(template?: CommunicationTemplate | null): TemplateEditorDraft {
  return {
    name: template?.name ?? "",
    description: template?.description ?? "",
    subjectTemplate: template?.subjectTemplate ?? "",
    bodyTemplate: template?.bodyTemplate ?? "",
    emailTitle: template?.emailSpec?.title ?? "",
    emailIntro: template?.emailSpec?.intro ?? "",
    inAppTitleTemplate: template?.inAppTitleTemplate ?? "",
    inAppBodyTemplate: template?.inAppBodyTemplate ?? "",
    isActive: template?.isActive ?? true,
    changeNotes: "",
  };
}

export function AdminCommunicationTemplatesView({
  initialTemplates,
}: AdminCommunicationTemplatesViewProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [categoryFilter, setCategoryFilter] = useState<CommunicationCategory | "all">("all");
  const [selectedSlug, setSelectedSlug] = useState(initialTemplates[0]?.slug ?? "");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [versions, setVersions] = useState<CommunicationTemplateVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("email");
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [editorDraft, setEditorDraft] = useState<TemplateEditorDraft>(() =>
    createEditorDraft(initialTemplates[0])
  );
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    if (categoryFilter === "all") return templates;
    return templates.filter((t) => t.category === categoryFilter);
  }, [templates, categoryFilter]);

  const selected = useMemo(
    () => templates.find((t) => t.slug === selectedSlug) ?? null,
    [templates, selectedSlug]
  );

  const initVariables = useCallback((template: CommunicationTemplate) => {
    const init: Record<string, string> = {};
    for (const field of template.variablesSchema) {
      init[field.key] = field.sample ?? "";
    }
    setVariables(init);
  }, []);

  const fetchPreview = useCallback(async (slug: string, vars: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/communication/templates/${slug}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables: vars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preview failed");
      setPreview({ rendered: data.rendered, email: data.email });
    } catch {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVersions = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/admin/communication/templates/${slug}/versions`);
      const data = await res.json();
      if (res.ok) setVersions(data.versions ?? []);
      else setVersions([]);
    } catch {
      setVersions([]);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    initVariables(selected);
    setEditorDraft(createEditorDraft(selected));
    setSaveResult(null);
  }, [selected, initVariables]);

  useEffect(() => {
    if (!selectedSlug || Object.keys(variables).length === 0) return;
    const timer = setTimeout(() => fetchPreview(selectedSlug, variables), 300);
    return () => clearTimeout(timer);
  }, [selectedSlug, variables, fetchPreview]);

  useEffect(() => {
    if (showVersions && selectedSlug) fetchVersions(selectedSlug);
  }, [showVersions, selectedSlug, fetchVersions]);

  useEffect(() => {
    if (!selected) return;
    const hasInApp = Boolean(selected.inAppTitleTemplate || selected.inAppBodyTemplate);
    if (!hasInApp && previewTab === "in_app") setPreviewTab("email");
  }, [selected, previewTab]);

  const handleSyncCatalog = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/communication/templates/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      const listRes = await fetch("/api/admin/communication/templates");
      const listData = await listRes.json();
      if (listRes.ok) setTemplates(listData.templates);
      setTestResult(`Synced ${data.synced} templates (${data.skipped} updated).`);
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleTestSend = async () => {
    if (!selectedSlug || !testEmail.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/admin/communication/templates/${selectedSlug}/test-send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientEmail: testEmail, variables }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test send failed");
      setTestResult(`Test email queued for ${testEmail} (ID: ${data.testSendId.slice(0, 8)}…).`);
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Test send failed");
    } finally {
      setTestSending(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selected) return;
    setSavingTemplate(true);
    setSaveResult(null);
    try {
      const payload: Record<string, unknown> = {
        name: editorDraft.name.trim(),
        description: editorDraft.description.trim() || null,
        subjectTemplate: editorDraft.subjectTemplate.trim() || null,
        bodyTemplate: editorDraft.bodyTemplate,
        inAppTitleTemplate: editorDraft.inAppTitleTemplate.trim() || null,
        inAppBodyTemplate: editorDraft.inAppBodyTemplate.trim() || null,
        isActive: editorDraft.isActive,
        changeNotes: editorDraft.changeNotes.trim() || "Updated from Automated Messages",
      };

      if (selected.emailSpec) {
        payload.emailSpec = {
          ...selected.emailSpec,
          title: editorDraft.emailTitle,
          intro: editorDraft.emailIntro,
        };
      }

      const res = await fetch(`/api/admin/communication/templates/${selected.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        template?: CommunicationTemplate;
        error?: string;
      };
      if (!res.ok || !data.template) {
        throw new Error(data.error ?? "Could not save automated message");
      }

      const updatedTemplate = data.template;
      setTemplates((current) =>
        current.map((template) =>
          template.slug === updatedTemplate.slug ? updatedTemplate : template
        )
      );
      setSaveResult("Automated message saved.");
    } catch (error) {
      setSaveResult(error instanceof Error ? error.message : "Could not save automated message");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!selectedSlug) return;
    const res = await fetch(`/api/admin/communication/templates/${selectedSlug}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionNumber }),
    });
    if (res.ok) {
      fetchPreview(selectedSlug, variables);
      fetchVersions(selectedSlug);
    }
  };

  if (templates.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-navy-500">
        No email templates found. Run migration{" "}
        <code className="text-xs">00021_email_template_system.sql</code> then sync the catalog.
      </p>
    );
  }

  const emailHtml = preview?.email?.html ?? preview?.rendered.html;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
            label="All"
          />
          {COMMUNICATION_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat}
              active={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
              label={COMMUNICATION_CATEGORY_LABELS[cat]}
            />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={syncing} onClick={handleSyncCatalog}>
          <Upload className={cn("mr-1.5 h-3.5 w-3.5", syncing && "animate-pulse")} />
          Sync catalog to database
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-3">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
            Templates ({filteredTemplates.length})
          </p>
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
            {filteredTemplates.map((t) => (
              <li key={t.slug}>
                <button
                  type="button"
                  onClick={() => setSelectedSlug(t.slug)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                    selectedSlug === t.slug
                      ? "bg-royal-50 text-royal-800"
                      : "hover:bg-navy-50 text-navy-700"
                  )}
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-navy-400">
                    {COMMUNICATION_CATEGORY_LABELS[t.category]}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-6">
          {selected && (
            <>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-navy-900">{selected.name}</h2>
                    <p className="mt-1 text-sm text-navy-500">{selected.description}</p>
                    <p className="mt-2 font-mono text-xs text-navy-400">
                      {selected.slug} · v{selected.version}
                      {selected.emailSpec ? " · Premium HTML" : " · Plain text"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.defaultChannels.map((ch) => (
                      <span
                        key={ch}
                        className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[10px] font-medium text-navy-600"
                      >
                        {COMMUNICATION_CHANNEL_LABELS[ch]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-6">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-navy-800">Message details</p>
                        <p className="mt-1 text-xs text-navy-500">
                          Changes apply to future automated messages that use this template.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-medium text-navy-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-royal-600"
                          checked={editorDraft.isActive}
                          onChange={(event) =>
                            setEditorDraft((draft) => ({
                              ...draft,
                              isActive: event.target.checked,
                            }))
                          }
                        />
                        Active
                      </label>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="automated-message-name">Internal name</Label>
                        <Input
                          id="automated-message-name"
                          value={editorDraft.name}
                          onChange={(event) =>
                            setEditorDraft((draft) => ({ ...draft, name: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="automated-message-description">Description</Label>
                        <Textarea
                          id="automated-message-description"
                          rows={2}
                          value={editorDraft.description}
                          onChange={(event) =>
                            setEditorDraft((draft) => ({
                              ...draft,
                              description: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="automated-message-subject">Email subject</Label>
                        <Input
                          id="automated-message-subject"
                          value={editorDraft.subjectTemplate}
                          onChange={(event) =>
                            setEditorDraft((draft) => ({
                              ...draft,
                              subjectTemplate: event.target.value,
                            }))
                          }
                        />
                      </div>

                      {selected.emailSpec ? (
                        <>
                          <div className="space-y-1.5">
                            <Label htmlFor="automated-message-email-title">Email heading</Label>
                            <Input
                              id="automated-message-email-title"
                              value={editorDraft.emailTitle}
                              onChange={(event) =>
                                setEditorDraft((draft) => ({
                                  ...draft,
                                  emailTitle: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="automated-message-email-intro">Email message</Label>
                            <Textarea
                              id="automated-message-email-intro"
                              rows={4}
                              value={editorDraft.emailIntro}
                              onChange={(event) =>
                                setEditorDraft((draft) => ({
                                  ...draft,
                                  emailIntro: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1.5">
                          <Label htmlFor="automated-message-body">Email message</Label>
                          <Textarea
                            id="automated-message-body"
                            rows={5}
                            value={editorDraft.bodyTemplate}
                            onChange={(event) =>
                              setEditorDraft((draft) => ({
                                ...draft,
                                bodyTemplate: event.target.value,
                              }))
                            }
                          />
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="automated-message-in-app-title">In-app title</Label>
                          <Input
                            id="automated-message-in-app-title"
                            value={editorDraft.inAppTitleTemplate}
                            onChange={(event) =>
                              setEditorDraft((draft) => ({
                                ...draft,
                                inAppTitleTemplate: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="automated-message-in-app-body">In-app message</Label>
                          <Textarea
                            id="automated-message-in-app-body"
                            rows={2}
                            value={editorDraft.inAppBodyTemplate}
                            onChange={(event) =>
                              setEditorDraft((draft) => ({
                                ...draft,
                                inAppBodyTemplate: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="automated-message-notes">Change note</Label>
                        <Input
                          id="automated-message-notes"
                          placeholder="Optional note for version history"
                          value={editorDraft.changeNotes}
                          onChange={(event) =>
                            setEditorDraft((draft) => ({
                              ...draft,
                              changeNotes: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingTemplate || !editorDraft.name.trim()}
                        onClick={handleSaveTemplate}
                      >
                        <Save className={cn("mr-1.5 h-3.5 w-3.5", savingTemplate && "animate-pulse")} />
                        {savingTemplate ? "Saving…" : "Save message"}
                      </Button>
                      {saveResult && <p className="text-xs text-navy-600">{saveResult}</p>}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5">
                    <p className="mb-4 text-sm font-semibold text-navy-800">Variables</p>
                    <div className="max-h-64 space-y-3 overflow-y-auto">
                      {selected.variablesSchema.map((field) => (
                        <div key={field.key}>
                          <label className="mb-1 block text-xs font-medium text-navy-500">
                            {field.label}
                            <span className="ml-1 font-mono text-navy-400">{`{{${field.key}}}`}</span>
                          </label>
                          <Input
                            value={variables[field.key] ?? ""}
                            onChange={(e) =>
                              setVariables((v) => ({ ...v, [field.key]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      disabled={loading}
                      onClick={() => fetchPreview(selectedSlug, variables)}
                    >
                      <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
                      Refresh preview
                    </Button>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5">
                    <p className="mb-3 text-sm font-semibold text-navy-800">Test email</p>
                    <p className="mb-3 text-xs text-navy-500">
                      Queues a test send with sample variables — no Resend delivery yet.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={testSending || !testEmail.trim()}
                        onClick={handleTestSend}
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Send
                      </Button>
                    </div>
                    {testResult && (
                      <p className="mt-3 text-xs text-navy-600">{testResult}</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between text-sm font-semibold text-navy-800"
                      onClick={() => setShowVersions((v) => !v)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <History className="h-4 w-4" />
                        Version history
                      </span>
                      <span className="text-xs font-normal text-navy-400">
                        {versions.length} versions
                      </span>
                    </button>
                    {showVersions && (
                      <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                        {versions.length === 0 ? (
                          <li className="text-xs text-navy-400">
                            No versions in database. Sync catalog to enable versioning.
                          </li>
                        ) : (
                          versions.map((v) => (
                            <li
                              key={v.id}
                              className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2"
                            >
                              <div>
                                <p className="text-xs font-medium text-navy-800">
                                  v{v.versionNumber} — {v.name}
                                </p>
                                <p className="text-[10px] text-navy-400">
                                  {new Date(v.createdAt).toLocaleString()}
                                  {v.changeNotes ? ` · ${v.changeNotes}` : ""}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleRestoreVersion(v.versionNumber)}
                              >
                                <Copy className="mr-1 h-3 w-3" />
                                Restore
                              </Button>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <PreviewTab
                        active={previewTab === "email"}
                        onClick={() => setPreviewTab("email")}
                        icon={Mail}
                        label="Email"
                      />
                      {(selected.inAppTitleTemplate || selected.inAppBodyTemplate) && (
                        <PreviewTab
                          active={previewTab === "in_app"}
                          onClick={() => setPreviewTab("in_app")}
                          icon={MessageSquare}
                          label="In-App"
                        />
                      )}
                      <PreviewTab
                        active={previewTab === "plain"}
                        onClick={() => setPreviewTab("plain")}
                        icon={Copy}
                        label="Plain"
                      />
                    </div>
                    {previewTab === "email" && emailHtml && (
                      <div className="flex gap-1">
                        <ViewportToggle
                          active={viewport === "desktop"}
                          onClick={() => setViewport("desktop")}
                          icon={Monitor}
                          label="Desktop"
                        />
                        <ViewportToggle
                          active={viewport === "mobile"}
                          onClick={() => setViewport("mobile")}
                          icon={Smartphone}
                          label="Mobile"
                        />
                      </div>
                    )}
                  </div>

                  {loading && !preview ? (
                    <p className="py-12 text-center text-sm text-navy-400">Rendering…</p>
                  ) : previewTab === "email" ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">
                          Subject
                        </p>
                        <p className="mt-1 rounded-lg bg-navy-50 px-3 py-2 text-sm font-medium text-navy-900">
                          {preview?.rendered.subject || "—"}
                        </p>
                      </div>
                      {emailHtml ? (
                        <div
                          className={cn(
                            "mx-auto overflow-hidden rounded-lg border border-navy-100 bg-white shadow-sm transition-all",
                            viewport === "desktop" ? "w-full max-w-[640px]" : "w-[375px]"
                          )}
                        >
                          <iframe
                            title="Email preview"
                            srcDoc={emailHtml}
                            className="h-[520px] w-full border-0"
                            sandbox="allow-same-origin"
                          />
                        </div>
                      ) : (
                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-navy-50 px-3 py-3 text-sm leading-relaxed text-navy-800">
                          {preview?.rendered.body || "—"}
                        </pre>
                      )}
                    </div>
                  ) : previewTab === "in_app" ? (
                    <div className="rounded-xl border border-royal-100 bg-gradient-to-br from-white to-royal-50/40 p-4 shadow-sm">
                      <p className="text-sm font-semibold text-navy-900">
                        {preview?.rendered.inAppTitle || "—"}
                      </p>
                      <p className="mt-2 text-sm text-navy-600">
                        {preview?.rendered.inAppBody || "—"}
                      </p>
                      <p className="mt-3 text-[10px] text-navy-400">Just now · RyvonX</p>
                    </div>
                  ) : (
                    <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg bg-navy-50 px-3 py-3 text-sm leading-relaxed text-navy-800">
                      {preview?.email?.plainText ?? preview?.rendered.body ?? "—"}
                    </pre>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active ? "bg-royal-600 text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100"
      )}
    >
      {label}
    </button>
  );
}

function PreviewTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-royal-600 text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function ViewportToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
        active ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
