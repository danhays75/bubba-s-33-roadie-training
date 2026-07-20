// sanitizeHtml — minimal, dependency-free HTML sanitizer used as defense in
// depth at every site that renders admin-authored HTML via
// dangerouslySetInnerHTML (RecipeCardPage detail-field values,
// FlashcardActivity detail-field values) and at the bulk-import write path
// (BulkImportDialog field.value mapping).
//
// The admin Quill toolbar is restricted to bold/italic/underline/lists, but
// the bulk importer accepts pasted JSON verbatim, so a pasted
// `<img onerror=...>` or `<a href="javascript:...">` would otherwise reach
// the DOM. This helper collapses that gap by:
//   1. Parsing the input with the browser's DOMParser (server-safe fallback
//      strips all tags when `document` is undefined).
//   2. Walking the parsed tree and dropping any element whose tag is not in
//      the minimal safe set below (its children are preserved by hoisting
//      them into the parent — so `<div><b>hi</b></div>` becomes `<b>hi</b>`).
//   3. Stripping every attribute whose name starts with `on` (event handlers)
//      OR whose value uses a `javascript:` / `vbscript:` URL (href, src,
//      action, etc.). `style` is also stripped to prevent expression()-style
//      CSS exploits in legacy IE vectors.
//   4. Returning the cleaned serialized HTML.
//
// The safe tag set is intentionally tiny: only the formatting/structure tags
// the restricted Quill toolbar can emit. Anything else (img, a, script,
// iframe, object, embed, svg, form, input, ...) is removed.

const SAFE_TAGS = new Set([
  "b",
  "i",
  "u",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "p",
  "br",
]);

const URL_ATTRS = new Set([
  "href",
  "src",
  "action",
  "formaction",
  "xlink:href",
]);

/**
 * Sanitizes an HTML string for safe rendering via dangerouslySetInnerHTML.
 *
 * Returns safe HTML containing only the minimal safe tag set
 * (b, i, u, strong, em, ul, ol, li, p, br) with all `on*` event-handler
 * attributes, `javascript:` / `vbscript:` URLs, and `style` attributes
 * stripped. Unknown tags are removed but their children are preserved.
 *
 * When the DOM API is unavailable (SSR / non-browser), falls back to a
 * regex-based tag strip that leaves only the safe tags' text content —
 * conservative but never throws.
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== "string" || input.length === 0) return "";

  // Non-browser fallback: strip every tag. Conservative but safe.
  if (typeof document === "undefined") {
    return input.replace(/<[^>]+>/g, "");
  }

  const doc = new DOMParser().parseFromString(input, "text/html");
  cleanNode(doc.body);
  return doc.body.innerHTML;
}

/**
 * Recursively cleans a DOM node in place: drops unsafe elements (hoisting
 * their children into the parent) and strips unsafe attributes from safe
 * elements. Text nodes and the document root are left untouched.
 */
function cleanNode(node: Node): void {
  // Iterate over a static snapshot of children so we can mutate the live
  // child list (replace/remove) without invalidating the iterator.
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (!SAFE_TAGS.has(tag)) {
        // Hoist this element's children into the parent, then drop the
        // element itself. Recurse into the hoisted children first so any
        // nested unsafe tags/attrs are cleaned before they re-enter the
        // parent's child list.
        const fragment = document.createDocumentFragment();
        const grandkids = Array.from(el.childNodes);
        for (const gk of grandkids) {
          fragment.appendChild(gk);
        }
        cleanNode(fragment);
        node.replaceChild(fragment, el);
        continue;
      }

      // Safe tag — strip unsafe attributes, then recurse into children.
      stripUnsafeAttributes(el);
      cleanNode(el);
    } else if (child.nodeType === Node.COMMENT_NODE) {
      // Drop comments (could hide IE conditional-compile exploits).
      node.removeChild(child);
    }
    // Text nodes, CDATA, etc. are left in place.
  }
}

/**
 * Removes every unsafe attribute from a safe-tag element: any `on*` event
 * handler, any URL attribute whose value is a `javascript:` / `vbscript:`
 * URL, and any `style` attribute (CSS-based exploits).
 */
function stripUnsafeAttributes(el: Element): void {
  const attrs = Array.from(el.attributes);
  for (const attr of attrs) {
    const name = attr.name.toLowerCase();
    const value = attr.value.trim().toLowerCase();
    if (name.startsWith("on")) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === "style") {
      el.removeAttribute(attr.name);
      continue;
    }
    if (URL_ATTRS.has(name) && isScriptUrl(value)) {
      el.removeAttribute(attr.name);
    }
  }
}

/** True when the value is a javascript: or vbscript: URL (any case, any
 *  leading whitespace already trimmed by the caller). */
function isScriptUrl(value: string): boolean {
  return value.startsWith("javascript:") || value.startsWith("vbscript:");
}
