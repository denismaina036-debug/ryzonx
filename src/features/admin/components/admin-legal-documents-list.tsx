"use client";

import Link from "next/link";
import { ArrowRight, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminLegalDocument } from "@/constants/routes";
import type { AdminLegalDocumentListItem } from "@/domain/legal-documents/types";
import { LEGAL_DOCUMENT_TYPES } from "@/domain/legal-documents/types";

const ICONS = {
  [LEGAL_DOCUMENT_TYPES.TERMS_OF_SERVICE]: FileText,
  [LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY]: Shield,
} as const;

function statusBadge(status: AdminLegalDocumentListItem["status"]) {
  const styles = {
    draft: "bg-gold-50 text-gold-700",
    published: "bg-emerald-50 text-emerald-700",
    archived: "bg-surface-2 text-navy-600",
  } as const;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

export function AdminLegalDocumentsList({
  documents,
}: {
  documents: AdminLegalDocumentListItem[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {documents.map((document) => {
        const Icon = ICONS[document.documentType];
        return (
          <div
            key={document.documentType}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-950">{document.label}</h2>
                  <p className="mt-1 text-sm text-navy-500">/{document.slug}</p>
                </div>
              </div>
              {statusBadge(document.status)}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-navy-500">Published version</dt>
                <dd className="font-medium text-navy-950">
                  {document.publishedVersionNumber ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-navy-500">Draft changes</dt>
                <dd className="font-medium text-navy-950">
                  {document.hasDraftChanges ? "Pending" : "None"}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-navy-400">
                Updated {new Date(document.updatedAt).toLocaleString()}
              </p>
              <Button asChild size="sm">
                <Link href={adminLegalDocument(document.documentType)}>
                  Edit
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
