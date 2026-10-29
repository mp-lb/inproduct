import type { FileType, FileTypeStatus } from "./fileTypeContracts.js";
import { contentDisposition } from "./contentDisposition.js";
import { downloadFileName } from "./downloadFileName.js";

/**
 * The one download response policy: always an attachment, never cached, never
 * sniffed. The canonical type is served only when bytes were recognized as that
 * type and it is not active (HTML, SVG, XML, script); otherwise
 * `application/octet-stream`. The file name always ends in the record's extension.
 */
export const describeFileDownload = (input: {
  name: string;
  extension: string | null;
  type: FileType | undefined;
  status: FileTypeStatus;
}) => {
  const fileName = downloadFileName(input.name, input.extension);

  const contentType =
    input.type && input.status === "recognized" && !input.type.active
      ? input.type.mediaType
      : "application/octet-stream";

  return {
    fileName,
    contentType,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition(fileName),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  };
};
