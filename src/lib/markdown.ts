import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.use({ gfm: true, breaks: true });

// Bracketed mentions ([@handle]) are informational-only per #152 — the
// fan-out router does not interrupt those agents. Style them visually
// muted so the chat surface reads "who actually got pinged" at a glance.
// Handle pattern is restricted to safe word chars so the regex can't
// produce HTML attributes or close existing tags.
const BRACKETED_MENTION = /\[@([\w-]+)\]/g;

export function renderMarkdown(raw: string): string {
  const html = marked.parse(raw, { async: false }) as string;
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "code", "pre", "blockquote",
      "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
      "a", "img", "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "del", "ins", "hr", "sup", "sub"
    ],
    ALLOWED_ATTR: [
      "href", "title", "src", "alt", "class", "target", "rel"
    ],
  });
  return clean.replace(BRACKETED_MENTION, '<span class="mention-bracketed">[@$1]</span>');
}
