import type {
  DataJobPreview,
  DataJobResult,
  DataJobSummary,
  DataJobVerification,
} from "../dataJobTypes.js";

export type DataJobsPanelState = {
  jobs: DataJobSummary[];
  loading: boolean;
  /** The job with a request in flight, if any. */
  busyJobId?: string;
  error?: string;
  preview?: DataJobPreview;
  acceptDataLoss: boolean;
  results: Record<string, DataJobResult>;
  verifications: Record<string, DataJobVerification>;
};
