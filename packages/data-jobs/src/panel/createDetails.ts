import { createElement } from "./createElement.js";

export const createDetails = (
  document: Document,
  entries: [string, string][],
) =>
  createElement(
    document,
    "dl",
    {},
    entries.flatMap(([term, value]) => [
      createElement(document, "dt", {}, [term]),
      createElement(document, "dd", {}, [value]),
    ]),
  );
