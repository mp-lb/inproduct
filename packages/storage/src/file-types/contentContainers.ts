const wordprocessing = "application/vnd.openxmlformats-officedocument.wordprocessingml";
const spreadsheet = "application/vnd.openxmlformats-officedocument.spreadsheetml";
const presentation = "application/vnd.openxmlformats-officedocument.presentationml";

export const officeOpenXmlParts = [
  {
    marker: "word/document.xml",
    types: [
      `${wordprocessing}.document`,
      `${wordprocessing}.template`,
      "application/vnd.ms-word.document.macroenabled.12",
      "application/vnd.ms-word.template.macroenabled.12",
    ],
  },
  {
    marker: "xl/workbook.xml",
    types: [
      `${spreadsheet}.sheet`,
      `${spreadsheet}.template`,
      "application/vnd.ms-excel.sheet.macroenabled.12",
      "application/vnd.ms-excel.template.macroenabled.12",
    ],
  },
  {
    marker: "ppt/presentation.xml",
    types: [
      `${presentation}.presentation`,
      `${presentation}.slideshow`,
      `${presentation}.template`,
      "application/vnd.ms-powerpoint.presentation.macroenabled.12",
    ],
  },
];

/** Formats built on a generic container. Bytes that show only the container are
 * `compatible` with these, never `exact`. Text compatibility uses `FileType.textual`. */
export const contentContainers: Record<
  string,
  { generic: string[]; members: string[] }
> = {
  zip: {
    generic: ["application/zip"],
    members: [
      ...officeOpenXmlParts.flatMap((part) => part.types),
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.oasis.opendocument.presentation",
      "application/vnd.oasis.opendocument.graphics",
      "application/epub+zip",
      "application/java-archive",
      "application/vnd.android.package-archive",
      "application/x-xpinstall",
      "application/vnd.google-earth.kmz",
      "application/vnd.ms-xpsdocument",
      "application/vnd.apple.pages",
      "application/vnd.apple.numbers",
      "application/vnd.apple.keynote",
    ],
  },
  ole: {
    generic: [],
    members: [
      "application/msword",
      "application/vnd.ms-excel",
      "application/vnd.ms-powerpoint",
      "application/vnd.ms-outlook",
      "application/vnd.visio",
    ],
  },
  "iso-bmff": {
    generic: ["video/mp4", "application/mp4"],
    members: [
      "video/mp4",
      "application/mp4",
      "audio/mp4",
      "video/x-m4v",
      "video/quicktime",
      "video/3gpp",
      "video/3gpp2",
      "image/heic",
      "image/heif",
      "image/avif",
    ],
  },
  ebml: {
    generic: ["video/x-matroska"],
    members: ["video/webm", "audio/webm", "video/x-matroska", "audio/x-matroska"],
  },
  ogg: {
    generic: ["audio/ogg", "video/ogg", "application/ogg"],
    members: ["audio/ogg", "video/ogg", "application/ogg"],
  },
  text: {
    generic: ["text/plain", "application/json", "application/xml"],
    members: [],
  },
};
