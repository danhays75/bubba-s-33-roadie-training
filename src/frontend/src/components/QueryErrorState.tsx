import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldAlert } from "lucide-react";

/**
 * Inline read-error state for React Query failures.
 *
 * Sibling of the app's EmptyState cards — same dashed-border rounded card,
 * centered column, muted helper text — but clearly an error, not empty:
 * red-tinted icon badge, ShieldAlert icon, and a Retry button wired to the
 * query's refetch. Distinct from the sonner toasts mutations use: this is a
 * persistent inline state, not a transient notification.
 *
 * Use wherever a read query's `isError` is true and a refetch is available.
 */
export interface QueryErrorStateProps {
  /** Heading shown in the card. */
  title?: string;
  /** Helper text under the heading. */
  description?: string;
  /** When an Error instance, its message is shown as a secondary line. */
  error?: unknown;
  /** Called by the Retry button. Required — no auto-retry. */
  onRetry: () => void;
}

const DEFAULT_TITLE = "Something went wrong";
const DEFAULT_DESCRIPTION =
  "We couldn't load this right now. Please try again.";

export function QueryErrorState({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  error,
  onRetry,
}: QueryErrorStateProps) {
  const errorMessage =
    error instanceof Error && error.message ? error.message : null;

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-border bg-card px-6 py-14 text-center"
      data-ocid="query.error_state"
    >
      <div
        className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
        aria-hidden
      >
        <ShieldAlert className="size-6" />
      </div>

      <div className="space-y-1">
        <h3 className="font-heading text-lg uppercase tracking-wide text-foreground">
          {title}
        </h3>
        <p className="mx-auto max-w-sm font-body text-sm text-muted-foreground">
          {description}
        </p>
        {errorMessage && (
          <p
            className="mx-auto max-w-sm break-words font-mono text-xs text-muted-foreground"
            data-ocid="query.error_state.message"
          >
            {errorMessage}
          </p>
        )}
      </div>

      <Button
        type="button"
        onClick={onRetry}
        data-ocid="query.error_state.retry_button"
      >
        <RefreshCw className="size-4" aria-hidden />
        Retry
      </Button>
    </div>
  );
}
