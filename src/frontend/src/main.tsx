import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// throwOnError on queries so a failed read throws into the nearest route
// error boundary (root errorComponent or per-route errorComponent) instead
// of silently returning error state and degrading to an empty render.
// Mutations keep their existing toast-based feedback — throwOnError is NOT
// set on mutations.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: true,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <InternetIdentityProvider>
        <App />
      </InternetIdentityProvider>
    </ErrorBoundary>
  </QueryClientProvider>,
);
