/** `safe_to_rerun` jobs converge when repeated; `manual_recovery` jobs need an operator after a failure. */
export type DataJobRetryPolicy = "safe_to_rerun" | "manual_recovery";

/** One kind of change a job makes, with the number of documents it applies to. */
export type DataJobChange = { label: string; count: number };

export type DataJobProgress = { completed: number; total?: number };

export type DataJobInspection = {
  summary: string;
  matchedCount: number;
  changes: DataJobChange[];
  /** Data in scope that the job will not change, such as unsupported shapes. */
  warnings: string[];
};

export type DataJobRunContext = {
  reportProgress: (progress: DataJobProgress) => void;
};

export type DataJobOutcome = {
  summary: string;
  changedCount: number;
  skippedCount: number;
  changes: DataJobChange[];
};

export type DataJobVerification = {
  passed: boolean;
  summary: string;
  remainingCount: number;
};

/** Describes what a job touches. Shown to operators before they confirm a run. */
export type DataJobMetadata = {
  id: string;
  title: string;
  description: string;
  scope: string;
  destructive: boolean;
  retryPolicy: DataJobRetryPolicy;
};

/** A registered job. Its behavior is bound in host code; callers only pick it by ID. */
export type DataJob = DataJobMetadata & {
  inspect: () => Promise<DataJobInspection>;
  run: (context: DataJobRunContext) => Promise<DataJobOutcome>;
  verify: () => Promise<DataJobVerification>;
};

export type DataJobResult =
  | {
      status: "succeeded";
      runId: string;
      startedAt: string;
      finishedAt: string;
      outcome: DataJobOutcome;
      verification: DataJobVerification;
    }
  | {
      status: "failed";
      runId: string;
      startedAt: string;
      finishedAt: string;
      error: string;
      progress?: DataJobProgress;
      outcome?: DataJobOutcome;
      verification?: DataJobVerification;
      rerunSupported: boolean;
    };

/** In-memory state of a job within one runner process. */
export type DataJobState =
  | { status: "idle" }
  | {
      status: "running";
      runId: string;
      startedAt: string;
      progress?: DataJobProgress;
    }
  | DataJobResult;

export type DataJobSummary = DataJobMetadata & {
  rerunSupported: boolean;
  state: DataJobState;
};

/** An inspection plus a single-use token that must accompany the confirmed run. */
export type DataJobPreview = {
  job: DataJobSummary;
  inspection: DataJobInspection;
  confirmationToken: string;
  expiresAt: string;
};

export type DataJobRunRequest = {
  id: string;
  confirmationToken: string;
  /** Required for destructive jobs. */
  acceptDataLoss?: boolean;
};

/** Operations the panel and other remote callers use. */
export type DataJobsClient = {
  list: () => Promise<DataJobSummary[]>;
  inspect: (id: string) => Promise<DataJobPreview>;
  run: (request: DataJobRunRequest) => Promise<DataJobResult>;
  verify: (id: string) => Promise<DataJobVerification>;
};
