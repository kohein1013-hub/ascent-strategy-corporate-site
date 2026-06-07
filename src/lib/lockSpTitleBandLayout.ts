/**
 * SP タイトル帯: plane 変数と stack の top を固定。
 * .section-track に transform があるため position:fixed は使わない（表示座標が狂う）。
 */
export function lockSpTitleBandLayout(shell: HTMLElement) {
  const isContact = shell.classList.contains("contact-shell");
  const planeHKey = isContact ? "--contact-plane-h" : "--company-plane-h";
  const planeWKey = isContact ? "--contact-plane-w" : "--company-plane-w";

  const cs = getComputedStyle(shell);
  const planeH = cs.getPropertyValue(planeHKey).trim();
  const planeW = cs.getPropertyValue(planeWKey).trim();
  if (planeH) shell.style.setProperty(planeHKey, planeH);
  if (planeW) shell.style.setProperty(planeWKey, planeW);

  const stack = shell.querySelector(".message-titles-stack") as HTMLElement | null;
  if (!stack) return;

  void shell.offsetHeight;
  const stackCs = getComputedStyle(stack);
  const top = stackCs.top;
  if (top && top !== "auto") {
    stack.style.top = top;
  }

  shell.setAttribute("data-title-band-layout-sealed", "");
}

export function clearSpTitleBandLayoutSeal(shell: HTMLElement) {
  shell.removeAttribute("data-title-band-layout-sealed");
}

export function clearSpTitleBandLayoutLock(shell: HTMLElement) {
  const isContact = shell.classList.contains("contact-shell");
  shell.style.removeProperty(isContact ? "--contact-plane-h" : "--company-plane-h");
  shell.style.removeProperty(isContact ? "--contact-plane-w" : "--company-plane-w");

  const stack = shell.querySelector(".message-titles-stack") as HTMLElement | null;
  stack?.style.removeProperty("top");

  clearSpTitleBandLayoutSeal(shell);
}
