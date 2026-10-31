import type { DataJobState } from "../dataJobTypes.js";
import { describeProgress } from "./describeProgress.js";

export const describeJobStatus = (state: DataJobState) => {
  if (state.status === "idle") return "Not run by this server process";
  if (state.status === "running")
    return `Running: ${describeProgress(state.progress)}`;
  return `${state.status === "succeeded" ? "Succeeded" : "Failed"} at ${new Date(state.finishedAt).toLocaleString()}`;
};
