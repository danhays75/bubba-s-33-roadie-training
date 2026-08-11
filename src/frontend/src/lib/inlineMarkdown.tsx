// inlineMarkdown — tiny inline-markdown renderer for prep-card text.
//
// Supports **bold** and *italic* ONLY. No other markdown. No HTML
// injection. The renderer:
//   1. Escapes HTML special characters first (& < > " '), so any raw
//      markup in the source string is rendered as visible text, never
//      parsed by the DOM.
//   2. Parses **bold** runs as <span className="prep-bold-chip"> (a
//      pale-yellow inline chip wrapping the phrase) and *italic* runs
//      as <span className="prep-italic-note"> (a muted-color italic
//      span).
//   3. Returns an array of React nodes (strings and spans) so the
//      caller can drop them straight into JSX.
//
// This is intentionally NOT a general markdown renderer. It exists so
// admin-authored step text, component names/amounts, and quality
// identifiers can carry inline emphasis on the prep card without
// pulling in a full markdown library or allowing arbitrary HTML. The
// existing lib/sanitizeHtml.ts is a separate concern (HTML sanitizer
// for dangerouslySetInnerHTML sites) and is not involved here.
//
// Parsing rules (deliberately strict):
//   - Bold is `**...**` — two asterisks on each side. A single `*`
//     inside a bold run is treated as literal text (no nesting).
//   - Italic is `*...*` — one asterisk on each side. It does NOT match
//     across a `**` boundary, so `**bold**` is never mis-parsed as
//     italic.
//   - Markers do not span newlines (inline emphasis only).
//   - Unmatched markers render as literal text — no partial spans.
//   - Empty emphasis runs (`****` or `**`) render as literal markers.
//
// The returned array is keyed by index so React can reconcile it
// inside lists. Callers that render the result inside a `.map()`
// should still key the outer <li> — the inner nodes are stable per
// string.

import type { ReactNode } from "react";

/**
 * Escapes the five HTML special characters so a raw string can never
 * be interpreted as markup by the DOM. Order matters: `&` first so it
 * does not double-escape the entities introduced for the others.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders a string with inline **bold** and *italic* markdown as an
 * array of React nodes. HTML special characters in the source are
 * escaped first, so no raw markup can reach the DOM.
 *
 * Bold runs become `<span className="prep-bold-chip">` and italic runs
 * become `<span className="prep-italic-note">`. All other text is
 * returned as plain strings (already escaped).
 *
 * Returns `[]` for null/undefined/non-string input so callers can
 * drop the result straight into JSX without a guard.
 */
export function renderInlineMarkdown(
  input: string | null | undefined,
): ReactNode[] {
  if (typeof input !== "string" || input.length === 0) return [];

  // Escape first — every subsequent slice is already safe text.
  const text = escapeHtml(input);

  // Tokenize: walk the string left to right, emitting plain text,
  // bold runs (**...**), and italic runs (*...*). We scan for `**`
  // before `*` so bold is never mis-parsed as italic.
  const nodes: ReactNode[] = [];
  let i = 0;
  let plain = "";
  let key = 0;

  const flushPlain = (): void => {
    if (plain.length > 0) {
      nodes.push(plain);
      plain = "";
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // Bold: **...** (no newline inside, no empty content).
    if (ch === "*" && text[i + 1] === "*") {
      const close = findBoldClose(text, i + 2);
      if (close !== -1) {
        const inner = text.slice(i + 2, close);
        // Empty bold run (****) renders as literal markers.
        if (inner.length === 0) {
          plain += "**";
          i += 2;
          continue;
        }
        flushPlain();
        nodes.push(
          <span key={`b-${key++}`} className="prep-bold-chip">
            {inner}
          </span>,
        );
        i = close + 2;
        continue;
      }
      // No closing ** — literal.
      plain += "**";
      i += 2;
      continue;
    }

    // Italic: *...* (no newline inside, no empty content, must not be
    // the first `*` of a `**` pair — handled above).
    if (ch === "*") {
      const close = findItalicClose(text, i + 1);
      if (close !== -1) {
        const inner = text.slice(i + 1, close);
        if (inner.length === 0) {
          plain += "*";
          i += 1;
          continue;
        }
        flushPlain();
        nodes.push(
          <span key={`i-${key++}`} className="prep-italic-note">
            {inner}
          </span>,
        );
        i = close + 1;
        continue;
      }
      // No closing * — literal.
      plain += "*";
      i += 1;
      continue;
    }

    // Plain character — accumulate.
    plain += ch;
    i += 1;
  }

  flushPlain();

  // When the whole input produced a single plain-text node, return it
  // as a one-element array so callers always get ReactNode[].
  return nodes;
}

/**
 * Finds the index of the closing `**` for a bold run that starts at
 * `start` (the character after the opening `**`). Returns -1 if there
 * is no close on the same line. Newlines terminate the search (inline
 * emphasis only). A lone `*` inside the run is allowed (literal).
 */
function findBoldClose(text: string, start: number): number {
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === "\n") return -1;
    if (text[i] === "*" && text[i + 1] === "*") return i;
  }
  return -1;
}

/**
 * Finds the index of the closing `*` for an italic run that starts at
 * `start` (the character after the opening `*`). Returns -1 if there
 * is no close on the same line. Newlines terminate the search. A `**`
 * pair is NOT treated as an italic close — it would unbalance the
 * bold parser, so we skip past it.
 */
function findItalicClose(text: string, start: number): number {
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === "\n") return -1;
    // Skip a `**` pair so it is not mistaken for a single `*` close.
    if (text[i] === "*" && text[i + 1] === "*") {
      i += 1;
      continue;
    }
    if (text[i] === "*") return i;
  }
  return -1;
}

/**
 * Convenience wrapper that returns a single ReactNode (a Fragment when
 * there are multiple nodes, the single node when there is one, or
 * null for empty input). Useful when a caller wants to drop the
 * rendered output into a single child slot without wrapping it in an
 * array.
 */
export function renderInlineMarkdownNode(
  input: string | null | undefined,
): ReactNode {
  const nodes = renderInlineMarkdown(input);
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];
  return <>{nodes}</>;
}
