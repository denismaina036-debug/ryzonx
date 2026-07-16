import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  COMMUNICATION_AUDIT_ACTIONS,
  COMMUNICATION_ENTITY_TYPE,
} from "@/constants/communication";
import type {
  CommunicationCategory,
  CommunicationChannel,
  CommunicationTemplate,
  CommunicationTemplateVersion,
  TemplatePreviewResult,
  TemplateVariableSchema,
} from "@/domain/communication/types";
import { auditService } from "@/services/audit.service";
import { communicationRepository } from "@/services/communication/communication-repository";
import { EMAIL_TEMPLATE_CATALOG } from "@/services/communication/email/catalog";
import {
  catalogEntryToCommunicationTemplate,
  renderTemplateWithPremium,
} from "@/services/communication/email/catalog-bridge";
import type { EmailTemplateSpec } from "@/services/communication/email/types";
import { mergeVariables } from "@/services/communication/template-engine";
import { getRegistryTemplate } from "@/domain/communication/template-registry";

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  category: CommunicationCategory;
  description: string | null;
  subject_template: string | null;
  body_template: string;
  email_spec: EmailTemplateSpec | null;
  in_app_title_template: string | null;
  in_app_body_template: string | null;
  variables_schema: TemplateVariableSchema[] | null;
  default_channels: CommunicationChannel[] | null;
  is_active: boolean;
  is_archived: boolean;
  version: number;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
};

type VersionRow = {
  id: string;
  template_id: string;
  version_number: number;
  slug: string;
  name: string;
  category: CommunicationCategory;
  description: string | null;
  subject_template: string | null;
  body_template: string;
  email_spec: EmailTemplateSpec | null;
  in_app_title_template: string | null;
  in_app_body_template: string | null;
  variables_schema: TemplateVariableSchema[] | null;
  default_channels: CommunicationChannel[] | null;
  change_notes: string | null;
  edited_by: string | null;
  created_at: string;
};

function mapTemplate(row: TemplateRow): CommunicationTemplate {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    emailSpec: row.email_spec,
    inAppTitleTemplate: row.in_app_title_template,
    inAppBodyTemplate: row.in_app_body_template,
    variablesSchema: Array.isArray(row.variables_schema) ? row.variables_schema : [],
    defaultChannels: row.default_channels ?? ["in_app"],
    isActive: row.is_active,
    isArchived: row.is_archived,
    version: row.version,
    lastEditedBy: row.last_edited_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVersion(row: VersionRow): CommunicationTemplateVersion {
  return {
    id: row.id,
    templateId: row.template_id,
    versionNumber: row.version_number,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    emailSpec: row.email_spec,
    inAppTitleTemplate: row.in_app_title_template,
    inAppBodyTemplate: row.in_app_body_template,
    variablesSchema: Array.isArray(row.variables_schema) ? row.variables_schema : [],
    defaultChannels: row.default_channels ?? ["in_app"],
    changeNotes: row.change_notes,
    editedBy: row.edited_by,
    createdAt: row.created_at,
  };
}

async function resolveTemplate(slug: string): Promise<CommunicationTemplate | null> {
  const fromDb = await communicationRepository.getTemplateBySlug(slug, { includeInactive: true });
  if (fromDb) return fromDb;
  return getRegistryTemplate(slug) ?? null;
}

export const emailTemplateService = {
  async listTemplates(options?: {
    includeArchived?: boolean;
    category?: CommunicationCategory;
  }): Promise<CommunicationTemplate[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("communication_templates")
      .select("*")
      .order("category")
      .order("name");

    const bySlug = new Map<string, CommunicationTemplate>();
    for (const entry of EMAIL_TEMPLATE_CATALOG) {
      bySlug.set(entry.slug, catalogEntryToCommunicationTemplate(entry));
    }

    if (!error && data?.length) {
      for (const row of data as TemplateRow[]) {
        bySlug.set(row.slug, mapTemplate(row));
      }
    }

    let templates = [...bySlug.values()];
    if (options?.category) {
      templates = templates.filter((t) => t.category === options.category);
    }
    if (!options?.includeArchived) {
      templates = templates.filter((t) => !t.isArchived);
    }
    return templates;
  },

  async getTemplate(slug: string): Promise<CommunicationTemplate | null> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return resolveTemplate(slug);
  },

  async previewTemplate(input: {
    slug: string;
    variables?: Record<string, string | number | boolean | null | undefined>;
  }): Promise<TemplatePreviewResult> {
    const template = await resolveTemplate(input.slug);
    if (!template) throw new Error(`Template not found: ${input.slug}`);

    const sampleVariables = mergeVariables(template.variablesSchema, input.variables);
    const rendered = renderTemplateWithPremium(template, sampleVariables);

    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_PREVIEW,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: template.id,
      newValues: { slug: template.slug, variables: sampleVariables },
    });

    return {
      template,
      rendered,
      sampleVariables,
      email: rendered.html
        ? { html: rendered.html, plainText: rendered.plainText ?? rendered.body }
        : undefined,
    };
  },

  async syncCatalog(): Promise<{ synced: number; skipped: number }> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    let synced = 0;
    let skipped = 0;

    for (const entry of EMAIL_TEMPLATE_CATALOG) {
      const mapped = catalogEntryToCommunicationTemplate(entry);
      const { data: existing } = await db
        .from("communication_templates")
        .select("id, version")
        .eq("slug", entry.slug)
        .maybeSingle();

      if (existing) {
        const row = existing as { id: string; version: number };
        await db
          .from("communication_templates")
          .update({
            name: mapped.name,
            category: mapped.category,
            description: mapped.description,
            subject_template: mapped.subjectTemplate,
            body_template: mapped.bodyTemplate,
            email_spec: mapped.emailSpec as never,
            in_app_title_template: mapped.inAppTitleTemplate,
            in_app_body_template: mapped.inAppBodyTemplate,
            variables_schema: mapped.variablesSchema as never,
            default_channels: mapped.defaultChannels as never,
            updated_at: new Date().toISOString(),
            last_edited_by: admin.id,
          } as never)
          .eq("id", row.id);
        skipped += 1;
        continue;
      }

      const { data: inserted, error } = await db
        .from("communication_templates")
        .insert({
          slug: mapped.slug,
          name: mapped.name,
          category: mapped.category,
          description: mapped.description,
          subject_template: mapped.subjectTemplate,
          body_template: mapped.bodyTemplate,
          email_spec: mapped.emailSpec as never,
          in_app_title_template: mapped.inAppTitleTemplate,
          in_app_body_template: mapped.inAppBodyTemplate,
          variables_schema: mapped.variablesSchema as never,
          default_channels: mapped.defaultChannels as never,
          is_active: true,
          version: 1,
          last_edited_by: admin.id,
        } as never)
        .select("id")
        .single();

      if (!error && inserted) {
        synced += 1;
        await db.from("communication_template_versions").insert({
          template_id: (inserted as { id: string }).id,
          version_number: 1,
          slug: mapped.slug,
          name: mapped.name,
          category: mapped.category,
          description: mapped.description,
          subject_template: mapped.subjectTemplate,
          body_template: mapped.bodyTemplate,
          email_spec: mapped.emailSpec as never,
          in_app_title_template: mapped.inAppTitleTemplate,
          in_app_body_template: mapped.inAppBodyTemplate,
          variables_schema: mapped.variablesSchema as never,
          default_channels: mapped.defaultChannels as never,
          change_notes: "Initial catalog sync",
          edited_by: admin.id,
        } as never);
      }
    }

    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_SYNC,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: admin.id,
      newValues: { synced, skipped, total: EMAIL_TEMPLATE_CATALOG.length },
    });

    return { synced, skipped };
  },

  async updateTemplate(
    slug: string,
    patch: {
      name?: string;
      description?: string | null;
      subjectTemplate?: string | null;
      bodyTemplate?: string;
      emailSpec?: EmailTemplateSpec | null;
      inAppTitleTemplate?: string | null;
      inAppBodyTemplate?: string | null;
      variablesSchema?: TemplateVariableSchema[];
      defaultChannels?: CommunicationChannel[];
      isActive?: boolean;
      changeNotes?: string;
    }
  ): Promise<CommunicationTemplate> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: existing, error: fetchError } = await db
      .from("communication_templates")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (fetchError?.code === "42P01" || !existing) {
      throw new Error(`Template not found in database: ${slug}. Run catalog sync first.`);
    }

    const current = mapTemplate(existing as TemplateRow);
    const nextVersion = current.version + 1;
    const updated: TemplateRow = {
      ...(existing as TemplateRow),
      name: patch.name ?? current.name,
      description: patch.description !== undefined ? patch.description : current.description,
      subject_template: patch.subjectTemplate !== undefined ? patch.subjectTemplate : current.subjectTemplate,
      body_template: patch.bodyTemplate ?? current.bodyTemplate,
      email_spec:
        patch.emailSpec !== undefined ? patch.emailSpec : (current.emailSpec ?? null),
      in_app_title_template:
        patch.inAppTitleTemplate !== undefined ? patch.inAppTitleTemplate : current.inAppTitleTemplate,
      in_app_body_template:
        patch.inAppBodyTemplate !== undefined ? patch.inAppBodyTemplate : current.inAppBodyTemplate,
      variables_schema: patch.variablesSchema ?? current.variablesSchema,
      default_channels: patch.defaultChannels ?? current.defaultChannels,
      is_active: patch.isActive ?? current.isActive,
      version: nextVersion,
      last_edited_by: admin.id,
      updated_at: new Date().toISOString(),
    };

    await db.from("communication_template_versions").insert({
      template_id: current.id,
      version_number: current.version,
      slug: current.slug,
      name: current.name,
      category: current.category,
      description: current.description,
      subject_template: current.subjectTemplate,
      body_template: current.bodyTemplate,
      email_spec: current.emailSpec as never,
      in_app_title_template: current.inAppTitleTemplate,
      in_app_body_template: current.inAppBodyTemplate,
      variables_schema: current.variablesSchema as never,
      default_channels: current.defaultChannels as never,
      change_notes: patch.changeNotes ?? "Version snapshot before update",
      edited_by: admin.id,
    } as never);

    const { data, error } = await db
      .from("communication_templates")
      .update({
        name: updated.name,
        description: updated.description,
        subject_template: updated.subject_template,
        body_template: updated.body_template,
        email_spec: updated.email_spec as never,
        in_app_title_template: updated.in_app_title_template,
        in_app_body_template: updated.in_app_body_template,
        variables_schema: updated.variables_schema as never,
        default_channels: updated.default_channels as never,
        is_active: updated.is_active,
        version: nextVersion,
        last_edited_by: admin.id,
        updated_at: updated.updated_at,
      } as never)
      .eq("id", current.id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Update failed");

    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_UPDATED,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: current.id,
      newValues: { slug, version: nextVersion },
    });

    return mapTemplate(data as TemplateRow);
  },

  async duplicateTemplate(slug: string, newSlug?: string): Promise<CommunicationTemplate> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const source = await resolveTemplate(slug);
    if (!source) throw new Error(`Template not found: ${slug}`);

    const targetSlug = newSlug ?? `${slug}_copy`;
    const db = createAdminClient();

    const mapped = catalogEntryToCommunicationTemplate(
      EMAIL_TEMPLATE_CATALOG.find((e) => e.slug === slug) ?? {
        slug: targetSlug,
        name: `${source.name} (Copy)`,
        category: source.category,
        description: source.description ?? "",
        subjectTemplate: source.subjectTemplate ?? "",
        emailSpec: (source.emailSpec ?? { title: source.name, intro: source.bodyTemplate }),
        variablesSchema: source.variablesSchema,
        defaultChannels: source.defaultChannels.filter(
          (c): c is "email" | "in_app" => c === "email" || c === "in_app"
        ),
      }
    );

    const { data, error } = await db
      .from("communication_templates")
      .insert({
        slug: targetSlug,
        name: `${source.name} (Copy)`,
        category: source.category,
        description: source.description,
        subject_template: source.subjectTemplate,
        body_template: source.bodyTemplate,
        email_spec: source.emailSpec as never,
        in_app_title_template: source.inAppTitleTemplate,
        in_app_body_template: source.inAppBodyTemplate,
        variables_schema: source.variablesSchema as never,
        default_channels: source.defaultChannels as never,
        is_active: false,
        version: 1,
        last_edited_by: admin.id,
      } as never)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Duplicate failed");
    void mapped;

    return mapTemplate(data as TemplateRow);
  },

  async archiveTemplate(slug: string): Promise<void> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    await db
      .from("communication_templates")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: admin.id,
        is_active: false,
      } as never)
      .eq("slug", slug);

    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_ARCHIVED,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: slug,
      newValues: { slug, archived: true },
    });
  },

  async restoreTemplate(slug: string): Promise<void> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    await db
      .from("communication_templates")
      .update({
        is_archived: false,
        archived_at: null,
        archived_by: null,
        is_active: true,
      } as never)
      .eq("slug", slug);

    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_UPDATED,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: slug,
      newValues: { slug, restored: true },
    });
  },

  async setActive(slug: string, isActive: boolean): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    await db.from("communication_templates").update({ is_active: isActive } as never).eq("slug", slug);
  },

  async listVersions(slug: string): Promise<CommunicationTemplateVersion[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const template = await resolveTemplate(slug);
    if (!template || template.id.startsWith("catalog-")) return [];

    const db = createAdminClient();
    const { data, error } = await db
      .from("communication_template_versions")
      .select("*")
      .eq("template_id", template.id)
      .order("version_number", { ascending: false });

    if (error?.code === "42P01" || !data) return [];
    return (data as VersionRow[]).map(mapVersion);
  },

  async restoreVersion(slug: string, versionNumber: number): Promise<CommunicationTemplate> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const template = await resolveTemplate(slug);
    if (!template) throw new Error(`Template not found: ${slug}`);

    const db = createAdminClient();
    const { data: versionRow } = await db
      .from("communication_template_versions")
      .select("*")
      .eq("template_id", template.id)
      .eq("version_number", versionNumber)
      .maybeSingle();

    if (!versionRow) throw new Error(`Version ${versionNumber} not found`);

    const version = mapVersion(versionRow as VersionRow);
    return this.updateTemplate(slug, {
      name: version.name,
      description: version.description,
      subjectTemplate: version.subjectTemplate,
      bodyTemplate: version.bodyTemplate,
      emailSpec: version.emailSpec,
      inAppTitleTemplate: version.inAppTitleTemplate,
      inAppBodyTemplate: version.inAppBodyTemplate,
      variablesSchema: version.variablesSchema,
      defaultChannels: version.defaultChannels,
      changeNotes: `Restored from version ${versionNumber}`,
    });
  },

  async sendTestEmail(input: {
    slug: string;
    recipientEmail: string;
    variables?: Record<string, string | number | boolean | null | undefined>;
  }): Promise<{ testSendId: string; preview: TemplatePreviewResult }> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const preview = await this.previewTemplate({
      slug: input.slug,
      variables: input.variables,
    });

    const db = createAdminClient();
    const { data, error } = await db
      .from("communication_template_test_sends")
      .insert({
        template_id: preview.template.id.startsWith("catalog-") ? null : preview.template.id,
        template_slug: input.slug,
        recipient_email: input.recipientEmail,
        variables: preview.sampleVariables as never,
        rendered_subject: preview.rendered.subject,
        rendered_html: preview.email?.html ?? null,
        rendered_plain_text: preview.rendered.plainText ?? preview.rendered.body,
        sent_by: admin.id,
        status: "queued",
      } as never)
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not queue test email");

    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_TEST_SEND,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: (data as { id: string }).id,
      newValues: {
        slug: input.slug,
        recipient: input.recipientEmail,
      },
    });

    return { testSendId: (data as { id: string }).id, preview };
  },
};
