import { fileExtensionPattern } from "./fileExtensionPattern.js";
import { sanitizeFileName } from "./sanitizeFileName.js";

/** `name.extension` for downloads. The extension comes from the library's record,
 * never from the editable name, so a rename cannot change the apparent format. */
export const downloadFileName = (name: string, extension: string | null) => {
  const safe = extension && fileExtensionPattern.test(extension) ? extension : null;
  return safe ? `${sanitizeFileName(name)}.${safe}` : sanitizeFileName(name);
};
