import DOMPurify from "isomorphic-dompurify";

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

export function sanitizeLegalHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: LEGAL_ALLOWED_TAGS,
    ALLOWED_ATTR: LEGAL_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
