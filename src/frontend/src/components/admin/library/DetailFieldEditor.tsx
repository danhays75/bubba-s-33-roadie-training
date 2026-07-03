import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { makeDetailFieldId } from "@/hooks/useLibrary";
import type { DetailField } from "@/types/foundation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import type { ChangeEvent, ReactNode } from "react";

/**
 * Editor for the variable list of labeled detail fields on a Library item.
 *
 * Each row is a backend DetailField { fieldLabel, value }. Admins can:
 *   - edit the label (plain text Input — never rich text)
 *   - edit the value (rich text editor — react-quill-new) — outputs HTML
 *     string into the existing `value` field, maxLength 500 on raw HTML
 *   - add a new empty row ('Add field' button — red primary)
 *   - remove a row (trash button per row)
 *   - reorder a row up/down (per-parent reorder pattern)
 *
 * The rich text toolbar exposes ONLY: bold, italic, underline, bullet list,
 * numbered list, and line break. No headings, links, images, or color — per
 * the build contract. The editor surface is styled for the dark Bubba's 33
 * theme via the `.bubbas-quill` wrapper class in index.css (dark editor
 * background, rounded corners, red accent on toolbar/active states).
 *
 * The parent owns the array; this component is fully controlled via
 * `value` + `onChange`. Empty rows are preserved on save so admins can
 * stage a row before filling it; the parent decides whether to filter
 * blank rows before persisting.
 *
 * data-ocid markers follow the library.admin.item.field.* scheme.
 */

/** Quill toolbar — bold, italic, underline, bullet list, numbered list, line break only. */
const QUILL_TOOLBAR = [
  ["bold", "italic", "underline"],
  [{ list: "bullet" }, { list: "ordered" }],
  ["break"],
];

/** Quill formats — restricted to match the toolbar (no headings/links/images/color). */
const QUILL_FORMATS = ["bold", "italic", "underline", "list"];

/** Max raw-HTML length stored in the backend DetailField.value. */
const MAX_HTML_LENGTH = 500;

/**
 * Wraps a single ReactQuill editor and forces its `.ql-editor` + `.ql-container`
 * to grow with content instead of staying at a fixed height.
 *
 * PRIOR APPROACHES (all failed): (1) CSS `height:auto !important` alone — Quill's
 * JS sets an INLINE `style='height: <px>'` on `.ql-editor` at runtime, and inline
 * styles beat external CSS even with `!important` in some browsers. (2) A single
 * MutationObserver on `.ql-editor`'s style attribute, queried once on mount —
 * react-quill-new initializes `.ql-editor` asynchronously, so `querySelector` on
 * mount often returns null and the observer never attaches. (3) Watching only
 * `.ql-editor` — Quill also sets inline height on `.ql-container`.
 *
 * ROBUST APPROACH (this implementation):
 *   (A) A ResizeObserver on `.ql-editor` imperatively sets `.ql-container`'s
 *       height to `editor.scrollHeight + 'px'` on every content/size change.
 *       This ACTIVELY grows the box regardless of what inline styles Quill sets.
 *   (B) An async-init retry loop (requestAnimationFrame-based) locates
 *       `.ql-editor` and `.ql-container` inside the wrapper, retrying until both
 *       exist (Quill inits async). THEN attaches the ResizeObserver + a
 *       MutationObserver on BOTH elements' style attributes. Cleans up on unmount.
 *   (C) Generous min-height (12rem) + overflow-y:auto fallback in index.css so
 *       content is at least scrollable within a tall box if auto-grow hits an
 *       edge case — never clipped in a tiny 5rem box.
 *   (D) The unlayered `!important` CSS overrides in index.css remain as a
 *       cascade backstop.
 *
 * Each DetailFieldEditor row renders its own QuillAutoGrow, so every row has
 * its own wrapper ref + observers (no shared state, no cross-row interference).
 */
function QuillAutoGrow({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Imperatively grow the container to fit the editor's full content height.
  // Called on every ResizeObserver callback and after clearing inline heights.
  const growContainer = useCallback(
    (editor: HTMLElement, container: HTMLElement) => {
      // Clear any inline height Quill set on the editor so scrollHeight
      // reflects the natural content height, not a clamped box.
      if (editor.style.height !== "auto") editor.style.height = "auto";
      if (editor.style.overflowY !== "visible")
        editor.style.overflowY = "visible";

      // Measure the editor's full content height and apply it to the
      // container. This is the active grow: regardless of what Quill tries
      // to set, we override the container height to fit all content.
      const target = editor.scrollHeight;
      if (target > 0) {
        container.style.height = `${target}px`;
      }
      // Keep the container from scrolling internally — the page scrolls instead.
      if (container.style.overflowY !== "visible")
        container.style.overflowY = "visible";
    },
    [],
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let resizeObserver: ResizeObserver | null = null;
    let editorObserver: MutationObserver | null = null;
    let containerObserver: MutationObserver | null = null;
    let rafId = 0;
    let attempts = 0;
    let cancelled = false;

    // Async-init retry: react-quill-new renders .ql-editor asynchronously,
    // so querySelector on mount may return null. Retry via requestAnimationFrame
    // until both elements exist (cap attempts to avoid an infinite loop if
    // Quill never initializes — e.g. readOnly with no DOM).
    const attach = () => {
      if (cancelled) return;
      const editor = wrapper.querySelector<HTMLElement>(".ql-editor");
      const container = wrapper.querySelector<HTMLElement>(".ql-container");
      if (!editor || !container) {
        attempts += 1;
        if (attempts < 60) {
          // ~1s at 60fps; plenty for Quill's async init.
          rafId = requestAnimationFrame(attach);
        }
        return;
      }

      // Initial grow.
      growContainer(editor, container);

      // (A) ResizeObserver on the editor — fires on content/size changes.
      // This is the primary active-grow mechanism.
      resizeObserver = new ResizeObserver(() => {
        growContainer(editor, container);
      });
      resizeObserver.observe(editor);

      // (B) MutationObservers on BOTH editor and container style attributes.
      // Quill re-applies inline height on focus / content change / resize;
      // re-grow whenever it does. Watching both covers the case where Quill
      // sets height on the container instead of (or in addition to) the editor.
      const onStyleMut = () => growContainer(editor, container);
      editorObserver = new MutationObserver(onStyleMut);
      editorObserver.observe(editor, {
        attributes: true,
        attributeFilter: ["style"],
      });
      containerObserver = new MutationObserver(onStyleMut);
      containerObserver.observe(container, {
        attributes: true,
        attributeFilter: ["style"],
      });
    };

    rafId = requestAnimationFrame(attach);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      editorObserver?.disconnect();
      containerObserver?.disconnect();
    };
  }, [growContainer]);

  return (
    <div className="bubbas-quill" ref={wrapperRef}>
      {children}
    </div>
  );
}

export function DetailFieldEditor({
  value,
  onChange,
  disabled,
}: {
  value: DetailField[];
  onChange: (next: DetailField[]) => void;
  disabled?: boolean;
}) {
  const quillModules = useMemo(() => ({ toolbar: QUILL_TOOLBAR }), []);

  const update = useCallback(
    (index: number, patch: Partial<DetailField>) => {
      const next = value.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      );
      onChange(next);
    },
    [value, onChange],
  );

  const remove = useCallback(
    (index: number) => {
      // Never drop below one row — keep an empty row so the editor always
      // has a visible target. The replacement row gets a fresh stable id so
      // its React key never collides with the removed row's key.
      if (value.length <= 1) {
        onChange([{ id: makeDetailFieldId(), fieldLabel: "", value: "" }]);
        return;
      }
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const add = useCallback(() => {
    // New row gets a stable id generated once, here. The id is the React
    // key for the row — it never changes for the lifetime of the row, so
    // typing in the row's inputs does not remount them (no focus loss).
    onChange([
      ...value,
      { id: makeDetailFieldId(), fieldLabel: "", value: "" },
    ]);
  }, [value, onChange]);

  const move = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= value.length) return;
      const next = [...value];
      [next[index], next[target]] = [next[target], next[index]];
      onChange(next);
    },
    [value, onChange],
  );

  const handleLabelChange = useCallback(
    (index: number) => (e: ChangeEvent<HTMLInputElement>) =>
      update(index, { fieldLabel: e.target.value }),
    [update],
  );

  const handleValueChange = useCallback(
    (index: number) => (html: string) => {
      // Enforce maxLength on the raw HTML string. If the editor produces
      // more than MAX_HTML_LENGTH chars, drop the change (do not truncate
      // mid-HTML — that would corrupt the document). The toolbar's limited
      // format set keeps HTML growth slow in practice.
      if (html.length > MAX_HTML_LENGTH) return;
      update(index, { value: html });
    },
    [update],
  );

  return (
    <div className="grid gap-3" data-ocid="library.admin.item.field.list">
      {value.map((row, index) => {
        const isFirst = index === 0;
        const isLast = index === value.length - 1;
        return (
          <div
            key={row.id}
            className="rounded-md border border-border bg-card p-3"
            data-ocid={`library.admin.item.field.${index + 1}`}
          >
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-2">
                <Input
                  value={row.fieldLabel}
                  onChange={handleLabelChange(index)}
                  placeholder="Label e.g. Rocks Ingredients"
                  aria-label={`Detail field ${index + 1} label`}
                  disabled={disabled}
                  maxLength={80}
                  autoComplete="off"
                  data-ocid={`library.admin.item.field.${index + 1}.label`}
                  className="font-heading text-xs uppercase tracking-wider"
                />
                <QuillAutoGrow>
                  <ReactQuill
                    theme="snow"
                    value={row.value}
                    onChange={handleValueChange(index)}
                    modules={quillModules}
                    formats={QUILL_FORMATS}
                    placeholder="Value"
                    readOnly={disabled}
                    data-ocid={`library.admin.item.field.${index + 1}.value`}
                  />
                </QuillAutoGrow>
              </div>

              {/* Reorder + remove controls */}
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => move(index, -1)}
                  disabled={disabled || isFirst}
                  aria-label={`Move field ${index + 1} up`}
                  data-ocid={`library.admin.item.field.${index + 1}.move_up`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => move(index, 1)}
                  disabled={disabled || isLast}
                  aria-label={`Move field ${index + 1} down`}
                  data-ocid={`library.admin.item.field.${index + 1}.move_down`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  aria-label={`Remove field ${index + 1}`}
                  data-ocid={`library.admin.item.field.${index + 1}.remove`}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="default"
        onClick={add}
        disabled={disabled}
        data-ocid="library.admin.item.field.add"
        className="w-full justify-center gap-2"
      >
        <Plus />
        Add field
      </Button>
    </div>
  );
}
