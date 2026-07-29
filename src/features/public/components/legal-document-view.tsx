import { sanitizeLegalHtml } from "@/lib/legal/sanitize-html";
import type { PublishedLegalDocument } from "@/domain/legal-documents/types";
import { cn } from "@/lib/utils";

interface LegalDocumentViewProps {
  document: PublishedLegalDocument;
  className?: string;
}

export function LegalDocumentView({ document, className }: LegalDocumentViewProps) {
  return (
    <article className={cn("page-container py-10 md:py-16", className)}>
      <header className="mx-auto max-w-3xl border-b border-border pb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-royal-600">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950 md:text-4xl">
          {document.label}
        </h1>
        <p className="mt-3 text-sm text-navy-500">
          Version {document.versionNumber} · Last updated{" "}
          {new Date(document.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-3xl space-y-10">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold text-navy-950 md:text-2xl">
              {section.title}
            </h2>
            <div
              className="prose prose-sm mt-4 max-w-none text-navy-700 prose-headings:text-navy-950 prose-a:text-royal-600 prose-strong:text-navy-950 prose-blockquote:border-royal-200 prose-blockquote:text-navy-600 prose-table:border prose-th:bg-surface-1 prose-th:p-2 prose-td:p-2 md:prose-base"
              dangerouslySetInnerHTML={{
                __html: sanitizeLegalHtml(section.content),
              }}
            />
          </section>
        ))}
      </div>
    </article>
  );
}
