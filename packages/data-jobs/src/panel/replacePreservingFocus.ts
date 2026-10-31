/** Re-renders without losing keyboard focus: the control with the remembered focus key
 * regains it, unless focus has moved elsewhere on the page.
 */
export const replacePreservingFocus = (
  element: HTMLElement,
  content: Node,
  focusKey: string | undefined,
) => {
  const { activeElement, body } = element.ownerDocument;

  const focusWasHere =
    !activeElement || activeElement === body || element.contains(activeElement);

  element.replaceChildren(content);
  if (focusKey && focusWasHere)
    element
      .querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(focusKey)}"]`)
      ?.focus();
};
