/** グラデーション用の純黒 */
export const gradientBlack = "#000000";

/** Paper Grain：オレンジ → 青 → 黒（3 色） */
export const sectionPalettes = [
  ["#c4341c", "#1a43b2", gradientBlack],
  ["#bc2f18", "#173ea5", gradientBlack],
  ["#c4371e", "#1e47b2", gradientBlack],
  ["#b82b16", "#13389d", gradientBlack],
  ["#c0331a", "#1c41ae", gradientBlack],
  ["#b62914", "#153399", gradientBlack],
  ["#c2371c", "#1840aa", gradientBlack],
] as const;

/** Grain の背面。:root --surface と揃える */
export const grainColorBack = "#040405";
