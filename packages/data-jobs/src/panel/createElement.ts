type Child = Node | string | false | undefined;

/** Minimal DOM builder. Text is always set as text, never parsed as HTML. */
export const createElement = (
  document: Document,
  tag: string,
  attributes: Record<string, string | boolean | undefined> = {},
  children: Child[] = [],
) => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes))
    if (value === true) element.setAttribute(name, "");
    else if (typeof value === "string") element.setAttribute(name, value);
  for (const child of children) if (child) element.append(child);
  return element;
};
