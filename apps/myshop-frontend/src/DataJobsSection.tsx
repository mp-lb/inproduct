import { useEffect, useRef } from "react";
import type { DataJobsClient } from "@mp-lb/inproduct-data-jobs";
import { mountDataJobsPanel } from "@mp-lb/inproduct-data-jobs/panel";

/** Hosts the library's framework-free panel inside the React admin. */
export const DataJobsSection = ({ client }: { client: DataJobsClient }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = mountDataJobsPanel(container.current!, client);
    return panel.destroy;
  }, [client]);

  return (
    <div className="data-jobs">
      <p className="muted">
        Jobs run against the disposable local <code>myshop_demo</code> MongoDB
        database. Reset demo products first to load synthetic legacy data.
      </p>
      <div ref={container} />
    </div>
  );
};
