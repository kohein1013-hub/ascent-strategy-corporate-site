/** documentElement の --app-viewport-h（px）を読む */
export function readAppViewportHeightPx(fallback = 0): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--app-viewport-h")
    .trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
