import type { FileView } from "./fileLibraryTypes.js";

/** The server computes preview eligibility from verified bytes and its registry. */
export const canPreviewFile = (file: Pick<FileView, "state" | "previewable">) =>
  file.state === "available" && file.previewable;
