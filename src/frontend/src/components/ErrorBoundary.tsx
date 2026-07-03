import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Top-level React error boundary. Catches any render or runtime error thrown
 * by descendants and renders a full-screen fallback so the app never shows a
 * silent black screen. Wrap the entire provider tree with this component.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] caught render error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;

    if (!hasError) {
      return this.props.children;
    }

    const message = error?.message ?? String(error ?? "Unknown error");
    const stack = errorInfo?.componentStack ?? null;

    return (
      <div
        data-ocid="error_boundary.fallback"
        className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6 font-body"
      >
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center rounded-full bg-primary/10 border border-primary/40 p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-primary"
                aria-hidden="true"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="font-heading text-3xl uppercase tracking-wide text-primary">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred while rendering the app. Reloading
              usually fixes it.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-heading">
                Error message
              </p>
              <pre
                data-ocid="error_boundary.message"
                className="overflow-x-auto rounded-md border border-border bg-card p-4 text-sm text-foreground whitespace-pre-wrap break-words font-mono"
              >
                {message}
              </pre>
            </div>

            {stack && (
              <details className="group rounded-md border border-border bg-card">
                <summary
                  className="cursor-pointer select-none px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-heading hover:text-foreground transition-smooth"
                  data-ocid="error_boundary.stack_toggle"
                >
                  Component stack (click to expand)
                </summary>
                <pre
                  data-ocid="error_boundary.stack"
                  className="overflow-x-auto px-4 pb-4 pt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono"
                >
                  {stack}
                </pre>
              </details>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              data-ocid="error_boundary.reload_button"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-sm transition-smooth hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
