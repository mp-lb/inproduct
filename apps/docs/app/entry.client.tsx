import { startTransition, StrictMode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

// A reload preserves same-document history entries. Back can therefore change
// the URL before our scripts run, leaving HTML/loader data for a different page.
const documentPath = document.documentElement.dataset.documentPath;
const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

const matchesDocument = () =>
  documentPath === undefined ||
  normalizePath(window.location.pathname) === normalizePath(documentPath);

const recoverEarlyHistory = (event?: PopStateEvent) => {
  if (matchesDocument()) return;

  // Do not let the not-yet-hydrated router consume data for the previous URL.
  event?.stopImmediatePropagation();
  window.location.reload();
};

const App = () => {
  useEffect(() => {
    window.removeEventListener("popstate", recoverEarlyHistory);
  }, []);

  return <HydratedRouter />;
};

if (matchesDocument()) {
  window.addEventListener("popstate", recoverEarlyHistory);
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
} else {
  recoverEarlyHistory();
}
