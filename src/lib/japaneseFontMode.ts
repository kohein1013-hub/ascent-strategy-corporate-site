/**
 * 日本語フォントの表示モード（サイト全体）。
 *
 * - `"mincho"` … 日本語を明朝体（Noto Serif JP）に統一（クライアント提出用）
 *   ※ ASM / ロゴ / Hero 英語 / セクション英字ラベル / Approach チップタイトルは常にゴシック
 * - `"gothic"` … 従来の組み合わせ（本文・UI＝ゴシック、見出し・キャッチ＝明朝）
 *
 * 戻すときはこの値を `"gothic"` に変えて push するだけ。
 */
export type JapaneseFontMode = "mincho" | "gothic";

export const JAPANESE_FONT_MODE: JapaneseFontMode = "mincho";
