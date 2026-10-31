import type { Document } from "mongodb";

/** Demo products use readable string IDs; other fields are deliberately loose legacy data. */
export type DemoProductDocument = Document & { _id: string };
