import { mediaQueries } from "@/lib/breakpoints";

export const sectionIds = [
  "top",
  "message",
  "service",
  "approach",
  "network",
  "company",
  "contact",
] as const;

export type SectionId = (typeof sectionIds)[number];

export const SECTION_INDEX: Record<SectionId, number> = sectionIds.reduce(
  (acc, id, index) => {
    acc[id] = index;
    return acc;
  },
  {} as Record<SectionId, number>,
);

export const navigationCooldownMs = 940;
/** メッセージ→サービス直後、トラックパッド慣性が内部スクロールに乗らないようにする時間 */
export const SERVICE_MOMENTUM_GUARD_MS = 480;
export const wheelThreshold = 44;
export const touchThreshold = 62;
/** タッチデバイス（pointer: coarse）向けスワイプ判定 */
export const touchThresholdCoarse = 44;

const CONTACT_FORM_INTERACTIVE_SELECTOR =
  "input, textarea, button, select, a, label";

/** Contact フォームの操作対象か（入力・送信・規約リンク等） */
export function isContactFormInteractionTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const wrap = target.closest(".contact-form-wrap");
  if (!wrap) return false;
  const interactive = target.closest(CONTACT_FORM_INTERACTIVE_SELECTOR);
  return interactive !== null && wrap.contains(interactive);
}

/**
 * Contact セクションで縦スワイプ／ホイールによるセクション遷移を抑止するか。
 * タイトル帯（ASMN・見出し・キャッチ）とフォーム外の余白では遷移を許可する。
 * PC（769px 以上）ではフォーム上でも画面全体のセクション遷移を許可する。
 */
export function shouldSuppressContactSectionSwipe(target: EventTarget | null): boolean {
  if (typeof window !== "undefined" && window.matchMedia(mediaQueries.grid).matches) {
    return false;
  }
  if (!(target instanceof Element)) return false;
  if (target.closest(".contact-shell .message-titles-stack")) return false;
  return isContactFormInteractionTarget(target);
}

/** Service 侵入時の scrollTop=0（.service-scroll-area の scroll-behavior: smooth を無効化） */
export function resetServiceScrollInstant(node: HTMLElement) {
  const prev = node.style.scrollBehavior;
  node.style.scrollBehavior = "auto";
  node.scrollTop = 0;
  node.scrollLeft = 0;
  if (prev) {
    node.style.scrollBehavior = prev;
  } else {
    node.style.removeProperty("scroll-behavior");
  }
}

/** キーボード表示中の Contact 内スクロールコンテナ（存在時のみ） */
export function getContactKeyboardScrollRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(
    ".section-frame.is-active .section-shell.contact-shell.contact-shell--keyboard-scroll",
  );
}
