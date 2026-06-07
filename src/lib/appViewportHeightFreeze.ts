import { readAppViewportHeightPx } from "@/lib/readAppViewportHeight";

/** セクション遷移中の一時凍結（全セクション共通） */
let timedFrozenUntil = 0;

/** Company / Contact 表示中は高さ更新を止める（表示完了後のジャンプ防止） */
let sectionFrozen: "company" | "contact" | null = null;

export function freezeAppViewportHeight(durationMs: number) {
  timedFrozenUntil = Math.max(timedFrozenUntil, Date.now() + durationMs);
}

export function freezeAppViewportForSection(section: "company" | "contact") {
  sectionFrozen = section;
  if (typeof document === "undefined") return;
  const h = readAppViewportHeightPx();
  if (h > 0) {
    document.documentElement.style.setProperty("--app-viewport-h", `${h}px`);
  }
}

export function releaseAppViewportSectionFreeze() {
  sectionFrozen = null;
}

export function isAppViewportHeightFrozen(): boolean {
  return sectionFrozen !== null || Date.now() < timedFrozenUntil;
}

/** 縦スライド(720ms) + タイトル帯リビール(700ms) + 余裕 */
export const SECTION_ENTRY_VIEWPORT_FREEZE_MS = 2800;
