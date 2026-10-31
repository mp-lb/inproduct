import type { DataJobProgress } from "../dataJobTypes.js";

export const describeProgress = (progress?: DataJobProgress) =>
  progress
    ? `${progress.completed}${progress.total === undefined ? "" : ` of ${progress.total}`} documents`
    : "starting";
