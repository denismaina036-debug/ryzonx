const LEGAL_ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "p",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "br",
  "span",
];

const LEGAL_ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "class",
  "colspan",
  "rowspan",
];

function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

export function sanitizeLegalHtml(html: string): string {
  if (!html) return "";

  try {
    // Lazy require avoids bundling/jsdom init issues in some serverless runtimes.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DOMPurify = require("isomorphic-dompurify") as {
      sanitize: (dirty: string, config?: Record<string, unknown>) => string;
    };

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: LEGAL_ALLOWED_TAGS,
      ALLOWED_ATTR: LEGAL_ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
    });
  } catch (error) {
    console.error("[legal] HTML sanitization fallback used:", error);
    return stripUnsafeHtml(html);
  }
}
