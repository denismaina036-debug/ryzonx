import { cache } from "react";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePermission } from "@/lib/auth/authorization";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DEFAULT_LEGAL_SEO,
  getDefaultSections,
  getFallbackPublishedDocument,
  isLegalDocumentType,
  LEGAL_DOCUMENT_LABELS,
  resolveDocumentTypeFromSlug,
} from "@/domain/legal-documents/defaults";
import {
  LEGAL_DOCUMENT_STATUSES,
  type AdminLegalDocumentListItem,
  type LegalDocumentDraft,
  type LegalDocumentLink,
  type LegalDocumentSeo,
  type LegalDocumentStatus,
  type LegalDocumentType,
  type LegalDocumentVersionDetail,
  type LegalDocumentVersionSummary,
  type LegalSection,
  type PendingLegalAcceptance,
  type PublishedLegalDocument,
} from "@/domain/legal-documents/types";

type LegalDocumentRow = {
  id: string;
  document_type: LegalDocumentType;
  slug: string;
  page_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image_url: string;
  status: LegalDocumentStatus;
  published_version_number: number | null;
  draft_sections: unknown;
  updated_by: string | null;
  updated_at: string;
};

type LegalDocumentVersionRow = {
  id: string;
  document_id: string;
  version_number: number;
  slug: string;
  page_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image_url: string;
  sections: unknown;
  change_notes: string | null;
  published_by: string | null;
  published_at: string;
};

function warnPublicReadFailure(context: string, error: unknown): void {
  if (process.env.NODE_ENV !== "development") return;
  const message =
    error instanceof Error
      ? error.message.replace(/\s+/g, " ").slice(0, 160)
      : String(error).replace(/\s+/g, " ").slice(0, 160);
  console.warn(`[legal-document] ${context} — using fallback.`, message);
}

function parseSections(value: unknown): LegalSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id : `section-${index}`;
      const title = typeof row.title === "string" ? row.title : "Untitled Section";
      const content = typeof row.content === "string" ? row.content : "";
      const sortOrder =
        typeof row.sortOrder === "number" ? row.sortOrder : index;
      return { id, title, content, sortOrder };
    })
    .filter((item): item is LegalSection => item !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function normalizeSections(sections: LegalSection[]): LegalSection[] {
  return sections
    .map((section, index) => ({
      ...section,
      id: section.id.trim() || `section-${index + 1}`,
      title: section.title.trim() || "Untitled Section",
      content: section.content ?? "",
      sortOrder: index,
    }))
    .filter((section) => section.title.length > 0);
}

function toSeo(row: Pick<
  LegalDocumentRow,
  "page_title" | "meta_description" | "meta_keywords" | "slug" | "og_image_url"
>): LegalDocumentSeo {
  return {
    pageTitle: row.page_title,
    metaDescription: row.meta_description,
    metaKeywords: row.meta_keywords,
    slug: row.slug,
    ogImageUrl: row.og_image_url,
  };
}

function sectionsEqual(a: LegalSection[], b: LegalSection[]): boolean {
  return JSON.stringify(normalizeSections(a)) === JSON.stringify(normalizeSections(b));
}

async function getDocumentRow(documentType: LegalDocumentType): Promise<LegalDocumentRow | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("legal_documents")
    .select("*")
    .eq("document_type", documentType)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as LegalDocumentRow | null) ?? null;
}

async function getPublicDocumentRow(documentType: LegalDocumentType): Promise<LegalDocumentRow | null> {
  try {
    const db = createPublicClient();
    const { data, error } = await db
      .from("legal_documents")
      .select("*")
      .eq("document_type", documentType)
      .eq("status", LEGAL_DOCUMENT_STATUSES.PUBLISHED)
      .maybeSingle();
    if (error) {
      warnPublicReadFailure("public document read failed", error.message);
      return null;
    }
    return (data as LegalDocumentRow | null) ?? null;
  } catch (error) {
    warnPublicReadFailure("public document read failed", error);
    return null;
  }
}

async function getPublicDocumentRowBySlug(slug: string): Promise<LegalDocumentRow | null> {
  try {
    const db = createPublicClient();
    const { data, error } = await db
      .from("legal_documents")
      .select("*")
      .eq("slug", slug)
      .eq("status", LEGAL_DOCUMENT_STATUSES.PUBLISHED)
      .maybeSingle();
    if (error) {
      warnPublicReadFailure("public slug read failed", error.message);
      return null;
    }
    return (data as LegalDocumentRow | null) ?? null;
  } catch (error) {
    warnPublicReadFailure("public slug read failed", error);
    return null;
  }
}

async function getPublishedVersionRow(
  documentId: string,
  versionNumber: number,
  usePublicClient = false
): Promise<LegalDocumentVersionRow | null> {
  try {
    const db = usePublicClient ? createPublicClient() : createAdminClient();
    const { data, error } = await db
      .from("legal_document_versions")
      .select("*")
      .eq("document_id", documentId)
      .eq("version_number", versionNumber)
      .maybeSingle();
    if (error) {
      if (usePublicClient) {
        warnPublicReadFailure("public version read failed", error.message);
        return null;
      }
      throw new Error(error.message);
    }
    return (data as LegalDocumentVersionRow | null) ?? null;
  } catch (error) {
    if (usePublicClient) {
      warnPublicReadFailure("public version read failed", error);
      return null;
    }
    throw error;
  }
}

function mapPublishedDocument(
  row: LegalDocumentRow,
  version: LegalDocumentVersionRow
): PublishedLegalDocument {
  return {
    documentType: row.document_type,
    documentId: row.id,
    versionId: version.id,
    versionNumber: version.version_number,
    label: LEGAL_DOCUMENT_LABELS[row.document_type],
    seo: {
      pageTitle: version.page_title,
      metaDescription: version.meta_description,
      metaKeywords: version.meta_keywords,
      slug: version.slug,
      ogImageUrl: version.og_image_url,
    },
    sections: parseSections(version.sections),
    publishedAt: version.published_at,
  };
}

export const legalDocumentService = {
  getPublicLinks: cache(async (): Promise<LegalDocumentLink[]> => {
    try {
      const db = createPublicClient();
      const { data, error } = await db
        .from("legal_documents")
        .select("document_type, slug, status, published_version_number")
        .eq("status", LEGAL_DOCUMENT_STATUSES.PUBLISHED)
        .not("published_version_number", "is", null);
      if (error) {
        warnPublicReadFailure("public links read failed", error.message);
        return [];
      }

      const links = ((data ?? []) as Array<{
        document_type: LegalDocumentType;
        slug: string;
      }>).map((row) => ({
        documentType: row.document_type,
        label: LEGAL_DOCUMENT_LABELS[row.document_type],
        href: `/${row.slug}`,
      }));

      return links.length > 0 ? links : [];
    } catch (error) {
      warnPublicReadFailure("public links read failed", error);
      return [];
    }
  }),

  getPublishedBySlug: cache(async (slug: string): Promise<PublishedLegalDocument | null> => {
    try {
      const row = await getPublicDocumentRowBySlug(slug);
      if (!row?.published_version_number) {
        const documentType = resolveDocumentTypeFromSlug(slug);
        return documentType ? getFallbackPublishedDocument(documentType) : null;
      }

      const version = await getPublishedVersionRow(row.id, row.published_version_number, true);
      if (!version) {
        const documentType = resolveDocumentTypeFromSlug(slug);
        return documentType ? getFallbackPublishedDocument(documentType) : null;
      }

      return mapPublishedDocument(row, version);
    } catch (error) {
      console.error("[legal-document] getPublishedBySlug failed:", error);
      const documentType = resolveDocumentTypeFromSlug(slug);
      return documentType ? getFallbackPublishedDocument(documentType) : null;
    }
  }),

  getPublishedByType: cache(async (
    documentType: LegalDocumentType
  ): Promise<PublishedLegalDocument> => {
    try {
      const row = await getPublicDocumentRow(documentType);
      if (!row?.published_version_number) {
        return getFallbackPublishedDocument(documentType);
      }

      const version = await getPublishedVersionRow(row.id, row.published_version_number, true);
      if (!version) {
        return getFallbackPublishedDocument(documentType);
      }

      return mapPublishedDocument(row, version);
    } catch (error) {
      console.error("[legal-document] getPublishedByType failed:", error);
      return getFallbackPublishedDocument(documentType);
    }
  }),

  async listAdminDocuments(): Promise<AdminLegalDocumentListItem[]> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const db = createAdminClient();
    const { data, error } = await db.from("legal_documents").select("*");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as LegalDocumentRow[];
    const items = await Promise.all(
      rows.map(async (row) => {
        let hasDraftChanges = false;
        if (row.published_version_number) {
          const published = await getPublishedVersionRow(row.id, row.published_version_number);
          if (published) {
            hasDraftChanges = !sectionsEqual(
              parseSections(row.draft_sections),
              parseSections(published.sections)
            );
          }
        } else {
          hasDraftChanges = parseSections(row.draft_sections).length > 0;
        }

        return {
          documentType: row.document_type,
          label: LEGAL_DOCUMENT_LABELS[row.document_type],
          status: row.status,
          slug: row.slug,
          publishedVersionNumber: row.published_version_number,
          updatedAt: row.updated_at,
          hasDraftChanges,
        } satisfies AdminLegalDocumentListItem;
      })
    );

    return items.sort((a, b) => a.label.localeCompare(b.label));
  },

  async getAdminDocument(documentType: LegalDocumentType): Promise<LegalDocumentDraft> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    let row = await getDocumentRow(documentType);

    if (!row) {
      const db = createAdminClient();
      const defaults = DEFAULT_LEGAL_SEO[documentType];
      const sections = getDefaultSections(documentType);
      const { data, error } = await db
        .from("legal_documents")
        .insert({
          document_type: documentType,
          slug: defaults.slug,
          page_title: defaults.pageTitle,
          meta_description: defaults.metaDescription,
          meta_keywords: defaults.metaKeywords,
          og_image_url: defaults.ogImageUrl,
          status: LEGAL_DOCUMENT_STATUSES.DRAFT,
          draft_sections: sections,
        } as never)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      row = data as LegalDocumentRow;
    }

    return {
      documentType: row.document_type,
      status: row.status,
      publishedVersionNumber: row.published_version_number,
      seo: toSeo(row),
      sections: parseSections(row.draft_sections),
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  },

  async saveDraft(input: {
    documentType: LegalDocumentType;
    seo: LegalDocumentSeo;
    sections: LegalSection[];
    actorId: string;
  }): Promise<LegalDocumentDraft> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const db = createAdminClient();
    const sections = normalizeSections(input.sections);
    const { data, error } = await db
      .from("legal_documents")
      .update({
        slug: input.seo.slug.trim(),
        page_title: input.seo.pageTitle.trim(),
        meta_description: input.seo.metaDescription.trim(),
        meta_keywords: input.seo.metaKeywords.trim(),
        og_image_url: input.seo.ogImageUrl.trim(),
        draft_sections: sections,
        updated_by: input.actorId,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("document_type", input.documentType)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const row = data as LegalDocumentRow;

    const { auditService } = await import("@/services/audit.service");
    await auditService.log({
      actorId: input.actorId,
      action: "legal_document_draft_saved",
      entityType: "legal_documents",
      entityId: row.id,
      newValues: { documentType: input.documentType, slug: row.slug },
    });

    return {
      documentType: row.document_type,
      status: row.status,
      publishedVersionNumber: row.published_version_number,
      seo: toSeo(row),
      sections: parseSections(row.draft_sections),
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  },

  async publishDocument(input: {
    documentType: LegalDocumentType;
    changeNotes?: string;
    actorId: string;
  }): Promise<LegalDocumentDraft> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const row = await getDocumentRow(input.documentType);
    if (!row) throw new Error("Legal document not found");

    const sections = normalizeSections(parseSections(row.draft_sections));
    const nextVersion = (row.published_version_number ?? 0) + 1;
    const db = createAdminClient();

    const { error: versionError } = await db.from("legal_document_versions").insert({
      document_id: row.id,
      version_number: nextVersion,
      slug: row.slug,
      page_title: row.page_title,
      meta_description: row.meta_description,
      meta_keywords: row.meta_keywords,
      og_image_url: row.og_image_url,
      sections,
      change_notes: input.changeNotes?.trim() || null,
      published_by: input.actorId,
    } as never);
    if (versionError) throw new Error(versionError.message);

    const { data, error } = await db
      .from("legal_documents")
      .update({
        status: LEGAL_DOCUMENT_STATUSES.PUBLISHED,
        published_version_number: nextVersion,
        draft_sections: sections,
        updated_by: input.actorId,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { auditService } = await import("@/services/audit.service");
    await auditService.log({
      actorId: input.actorId,
      action: "legal_document_published",
      entityType: "legal_documents",
      entityId: row.id,
      newValues: { documentType: input.documentType, versionNumber: nextVersion },
    });

    revalidatePath("/terms");
    revalidatePath("/privacy");
    revalidatePath(`/${row.slug}`);
    revalidateTag("legal-links");

    const updated = data as LegalDocumentRow;
    return {
      documentType: updated.document_type,
      status: updated.status,
      publishedVersionNumber: updated.published_version_number,
      seo: toSeo(updated),
      sections: parseSections(updated.draft_sections),
      updatedAt: updated.updated_at,
      updatedBy: updated.updated_by,
    };
  },

  async archiveDocument(documentType: LegalDocumentType, actorId: string): Promise<void> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const db = createAdminClient();
    const { error } = await db
      .from("legal_documents")
      .update({
        status: LEGAL_DOCUMENT_STATUSES.ARCHIVED,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("document_type", documentType);
    if (error) throw new Error(error.message);
    revalidateTag("legal-links");

    const { auditService } = await import("@/services/audit.service");
    await auditService.log({
      actorId,
      action: "legal_document_archived",
      entityType: "legal_documents",
      entityId: documentType,
    });
  },

  async listVersions(documentType: LegalDocumentType): Promise<LegalDocumentVersionSummary[]> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const row = await getDocumentRow(documentType);
    if (!row) return [];

    const db = createAdminClient();
    const { data, error } = await db
      .from("legal_document_versions")
      .select("id, version_number, page_title, slug, change_notes, published_by, published_at")
      .eq("document_id", row.id)
      .order("version_number", { ascending: false });
    if (error) throw new Error(error.message);

    const versions = (data ?? []) as LegalDocumentVersionRow[];
    const publisherIds = [...new Set(versions.map((version) => version.published_by).filter(Boolean))] as string[];
    const namesById = new Map<string, string>();

    if (publisherIds.length > 0) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, full_name")
        .in("id", publisherIds);
      for (const profile of (profiles ?? []) as Array<{ id: string; full_name?: string }>) {
        namesById.set(profile.id, profile.full_name ?? "");
      }
    }

    return versions.map((version) => ({
      id: version.id,
      versionNumber: version.version_number,
      pageTitle: version.page_title,
      slug: version.slug,
      changeNotes: version.change_notes,
      publishedBy: version.published_by,
      publishedByName: version.published_by
        ? namesById.get(version.published_by) ?? null
        : null,
      publishedAt: version.published_at,
    }));
  },

  async getVersion(
    documentType: LegalDocumentType,
    versionNumber: number
  ): Promise<LegalDocumentVersionDetail | null> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const row = await getDocumentRow(documentType);
    if (!row) return null;
    const version = await getPublishedVersionRow(row.id, versionNumber);
    if (!version) return null;

    const db = createAdminClient();
    const { data: profile } = version.published_by
      ? await db.from("profiles").select("full_name").eq("id", version.published_by).maybeSingle()
      : { data: null };

    return {
      id: version.id,
      versionNumber: version.version_number,
      pageTitle: version.page_title,
      slug: version.slug,
      changeNotes: version.change_notes,
      publishedBy: version.published_by,
      publishedByName: (profile as { full_name?: string } | null)?.full_name ?? null,
      publishedAt: version.published_at,
      sections: parseSections(version.sections),
      metaDescription: version.meta_description,
      metaKeywords: version.meta_keywords,
      ogImageUrl: version.og_image_url,
    };
  },

  async restoreVersion(input: {
    documentType: LegalDocumentType;
    versionNumber: number;
    actorId: string;
  }): Promise<LegalDocumentDraft> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const row = await getDocumentRow(input.documentType);
    if (!row) throw new Error("Legal document not found");
    const version = await getPublishedVersionRow(row.id, input.versionNumber);
    if (!version) throw new Error("Version not found");

    const db = createAdminClient();
    const { data, error } = await db
      .from("legal_documents")
      .update({
        slug: version.slug,
        page_title: version.page_title,
        meta_description: version.meta_description,
        meta_keywords: version.meta_keywords,
        og_image_url: version.og_image_url,
        draft_sections: parseSections(version.sections),
        updated_by: input.actorId,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const updated = data as LegalDocumentRow;
    return {
      documentType: updated.document_type,
      status: updated.status,
      publishedVersionNumber: updated.published_version_number,
      seo: toSeo(updated),
      sections: parseSections(updated.draft_sections),
      updatedAt: updated.updated_at,
      updatedBy: updated.updated_by,
    };
  },

  async hasAnyAcceptance(userId: string): Promise<boolean> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("legal_document_acceptances")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  },

  /**
   * Returns documents the user must accept before continuing.
   * When `autoRecordRegistration` is true, silently records current published
   * versions for users who accepted at registration but have no saved rows yet
   * (registration recording race/failure). Does not skip re-acceptance after
   * admin publishes a newer version.
   */
  async getPendingAcceptances(
    userId: string,
    options?: { autoRecordRegistration?: boolean }
  ): Promise<PendingLegalAcceptance[]> {
    if (options?.autoRecordRegistration) {
      const pending = await legalDocumentService.getPendingAcceptances(userId);
      if (pending.length === 0) return pending;

      const hasAny = await legalDocumentService.hasAnyAcceptance(userId);
      if (!hasAny) {
        await legalDocumentService.recordCurrentPublishedAcceptances(userId);
        return legalDocumentService.getPendingAcceptances(userId);
      }

      return pending;
    }

    const db = createAdminClient();
    const { data: docs, error } = await db
      .from("legal_documents")
      .select("id, document_type, slug, published_version_number, status")
      .eq("status", LEGAL_DOCUMENT_STATUSES.PUBLISHED)
      .not("published_version_number", "is", null);
    if (error) throw new Error(error.message);

    const pending: PendingLegalAcceptance[] = [];

    for (const doc of (docs ?? []) as Array<{
      id: string;
      document_type: LegalDocumentType;
      slug: string;
      published_version_number: number;
    }>) {
      const version = await getPublishedVersionRow(doc.id, doc.published_version_number);
      if (!version) continue;

      const { data: acceptance } = await db
        .from("legal_document_acceptances")
        .select("id")
        .eq("user_id", userId)
        .eq("document_id", doc.id)
        .eq("version_id", version.id)
        .maybeSingle();

      if (!acceptance) {
        pending.push({
          documentType: doc.document_type,
          label: LEGAL_DOCUMENT_LABELS[doc.document_type],
          href: `/${doc.slug}`,
          versionNumber: version.version_number,
          versionId: version.id,
          publishedAt: version.published_at,
        });
      }
    }

    return pending;
  },

  async recordAcceptances(input: {
    userId: string;
    versionIds: string[];
  }): Promise<void> {
    if (input.versionIds.length === 0) return;
    const db = createAdminClient();

    const { data: versions, error } = await db
      .from("legal_document_versions")
      .select("id, document_id, version_number")
      .in("id", input.versionIds);
    if (error) throw new Error(error.message);

    const rows = ((versions ?? []) as Array<{
      id: string;
      document_id: string;
      version_number: number;
    }>).map((version) => ({
      user_id: input.userId,
      document_id: version.document_id,
      version_id: version.id,
      version_number: version.version_number,
    }));

    if (rows.length === 0) return;

    const { error: insertError } = await db
      .from("legal_document_acceptances")
      .upsert(rows as never, { onConflict: "user_id,document_id,version_id" });
    if (insertError) throw new Error(insertError.message);
  },

  async recordCurrentPublishedAcceptances(userId: string): Promise<void> {
    const db = createAdminClient();
    const { data: docs, error } = await db
      .from("legal_documents")
      .select("id, published_version_number, status")
      .eq("status", LEGAL_DOCUMENT_STATUSES.PUBLISHED)
      .not("published_version_number", "is", null);
    if (error) throw new Error(error.message);

    const versionIds: string[] = [];
    for (const doc of (docs ?? []) as Array<{
      id: string;
      published_version_number: number;
    }>) {
      const version = await getPublishedVersionRow(doc.id, doc.published_version_number);
      if (version) versionIds.push(version.id);
    }

    await legalDocumentService.recordAcceptances({ userId, versionIds });
  },

  isLegalDocumentType,
};

export async function requireAuthenticatedUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}
