"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Eye,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { LegalDocumentView } from "@/features/public/components/legal-document-view";
import { ROUTES } from "@/constants/routes";
import { LEGAL_DOCUMENT_LABELS } from "@/domain/legal-documents/defaults";
import type {
  LegalDocumentDraft,
  LegalDocumentSeo,
  LegalDocumentType,
  LegalDocumentVersionSummary,
  LegalSection,
  PublishedLegalDocument,
} from "@/domain/legal-documents/types";

function createSection(title = "New Section"): LegalSection {
  return {
    id: `section-${crypto.randomUUID()}`,
    title,
    content: "<p></p>",
    sortOrder: 0,
  };
}

function toPreviewDocument(
  documentType: LegalDocumentType,
  seo: LegalDocumentSeo,
  sections: LegalSection[]
): PublishedLegalDocument {
  return {
    documentType,
    documentId: "preview",
    versionId: "preview",
    versionNumber: 0,
    label: LEGAL_DOCUMENT_LABELS[documentType],
    seo,
    sections,
    publishedAt: new Date().toISOString(),
  };
}

export function AdminLegalDocumentEditor({
  documentType,
  initialDocument,
  initialVersions,
}: {
  documentType: LegalDocumentType;
  initialDocument: LegalDocumentDraft;
  initialVersions: LegalDocumentVersionSummary[];
}) {
  const [document, setDocument] = useState(initialDocument);
  const [versions, setVersions] = useState(initialVersions);
  const [changeNotes, setChangeNotes] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  const previewDocument = useMemo(
    () => toPreviewDocument(documentType, document.seo, document.sections),
    [documentType, document.seo, document.sections]
  );

  function updateSeo(field: keyof LegalDocumentSeo, value: string) {
    setDocument((current) => ({
      ...current,
      seo: { ...current.seo, [field]: value },
    }));
  }

  function updateSection(sectionId: string, patch: Partial<LegalSection>) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    }));
  }

  function addSection() {
    setDocument((current) => ({
      ...current,
      sections: [...current.sections, createSection()],
    }));
  }

  function removeSection(sectionId: string) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== sectionId),
    }));
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    setDocument((current) => {
      const index = current.sections.findIndex((section) => section.id === sectionId);
      if (index === -1) return current;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.sections.length) return current;
      const next = [...current.sections];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(targetIndex, 0, item);
      return {
        ...current,
        sections: next.map((section, sortOrder) => ({ ...section, sortOrder })),
      };
    });
  }

  async function refreshDocument() {
    const response = await fetch(`/api/admin/legal-documents/${documentType}`);
    const payload = (await response.json()) as {
      document?: LegalDocumentDraft;
      versions?: LegalDocumentVersionSummary[];
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error ?? "Failed to refresh document");
    if (payload.document) setDocument(payload.document);
    if (payload.versions) setVersions(payload.versions);
  }

  async function handleSaveDraft() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/legal-documents/${documentType}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seo: document.seo,
          sections: document.sections,
        }),
      });
      const payload = (await response.json()) as {
        document?: LegalDocumentDraft;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save draft");
      if (payload.document) setDocument(payload.document);
      toast.success("Draft saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    setIsPublishing(true);
    try {
      await handleSaveDraft();
      const response = await fetch(`/api/admin/legal-documents/${documentType}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeNotes }),
      });
      const payload = (await response.json()) as {
        document?: LegalDocumentDraft;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Failed to publish");
      if (payload.document) setDocument(payload.document);
      await refreshDocument();
      setChangeNotes("");
      toast.success("Document published");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleArchive() {
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/admin/legal-documents/${documentType}/archive`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to archive");
      await refreshDocument();
      toast.success("Document archived");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive");
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleRestore(versionNumber: number) {
    setRestoringVersion(versionNumber);
    try {
      const response = await fetch(
        `/api/admin/legal-documents/${documentType}/versions/${versionNumber}/restore`,
        { method: "POST" }
      );
      const payload = (await response.json()) as {
        document?: LegalDocumentDraft;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Failed to restore version");
      if (payload.document) setDocument(payload.document);
      toast.success(`Version ${versionNumber} restored to draft`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore version");
    } finally {
      setRestoringVersion(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-navy-500">
            <Link href={ROUTES.adminLegal} className="hover:text-royal-600">
              Legal Documents
            </Link>{" "}
            / {LEGAL_DOCUMENT_LABELS[documentType]}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-navy-950">
            {LEGAL_DOCUMENT_LABELS[documentType]}
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            Status: <span className="capitalize">{document.status}</span>
            {document.publishedVersionNumber
              ? ` · Published v${document.publishedVersionNumber}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button type="button" variant="outline" onClick={handleSaveDraft} isLoading={isSaving}>
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button type="button" onClick={handlePublish} isLoading={isPublishing}>
            <Send className="h-4 w-4" />
            Publish
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleArchive}
            isLoading={isArchiving}
          >
            <Archive className="h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {document.sections.map((section, index) => (
                <div key={section.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <Label htmlFor={`section-title-${section.id}`}>Section title</Label>
                      <Input
                        id={`section-title-${section.id}`}
                        value={section.title}
                        onChange={(event) =>
                          updateSection(section.id, { title: event.target.value })
                        }
                        className="mt-2"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === 0}
                        onClick={() => moveSection(section.id, "up")}
                        aria-label="Move section up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === document.sections.length - 1}
                        onClick={() => moveSection(section.id, "down")}
                        aria-label="Move section down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => removeSection(section.id)}
                        aria-label="Delete section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Section content</Label>
                    <RichTextEditor
                      value={section.content}
                      onChange={(content) => updateSection(section.id, { content })}
                      className="mt-2"
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addSection}>
                <Plus className="h-4 w-4" />
                Add Section
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="page-title">Page title</Label>
                <Input
                  id="page-title"
                  value={document.seo.pageTitle}
                  onChange={(event) => updateSeo("pageTitle", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={document.seo.slug}
                  onChange={(event) => updateSeo("slug", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-description">Meta description</Label>
                <Textarea
                  id="meta-description"
                  value={document.seo.metaDescription}
                  onChange={(event) => updateSeo("metaDescription", event.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-keywords">Keywords</Label>
                <Input
                  id="meta-keywords"
                  value={document.seo.metaKeywords}
                  onChange={(event) => updateSeo("metaKeywords", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="og-image">Open Graph image URL</Label>
                <Input
                  id="og-image"
                  value={document.seo.ogImageUrl}
                  onChange={(event) => updateSeo("ogImageUrl", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="change-notes">Change notes (optional)</Label>
                <Textarea
                  id="change-notes"
                  value={changeNotes}
                  onChange={(event) => setChangeNotes(event.target.value)}
                  rows={3}
                  placeholder="Describe what changed in this version"
                />
              </div>
              {document.seo.slug ? (
                <Link
                  href={`/${document.seo.slug}`}
                  target="_blank"
                  className="text-sm text-royal-600 hover:underline"
                >
                  View live page /{document.seo.slug}
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {versions.length === 0 ? (
                <p className="text-sm text-navy-500">No published versions yet.</p>
              ) : (
                versions.map((version) => (
                  <div
                    key={version.id}
                    className="rounded-lg border border-border px-3 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-navy-950">Version {version.versionNumber}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(version.versionNumber)}
                        isLoading={restoringVersion === version.versionNumber}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-navy-500">
                      {new Date(version.publishedAt).toLocaleString()}
                      {version.publishedByName ? ` · ${version.publishedByName}` : ""}
                    </p>
                    {version.changeNotes ? (
                      <p className="mt-2 text-xs text-navy-600">{version.changeNotes}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Draft Preview</DialogTitle>
          </DialogHeader>
          <LegalDocumentView document={previewDocument} className="px-0 py-0" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
