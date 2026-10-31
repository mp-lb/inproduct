import { createElement } from "./createElement.js";

export const createButton = (
  document: Document,
  label: string,
  action: () => void,
  { disabled = false, secondary = false, focusKey = label } = {},
) => {
  const button = createElement(document, "button", {
    type: "button",
    class: secondary ? "secondary" : undefined,
    disabled,
    "data-focus-key": focusKey,
  });

  button.textContent = label;
  button.addEventListener("click", action);
  return button;
};
