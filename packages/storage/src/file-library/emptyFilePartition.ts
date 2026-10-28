import type { FilePartition } from "./fileLibraryContracts.js";

export const emptyFilePartition = (tenantId: string): FilePartition => ({
  _id: tenantId,
  revision: 0,
  files: [],
  audit: [],
});
