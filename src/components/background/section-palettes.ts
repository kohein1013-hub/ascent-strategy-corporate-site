/** 参考画像よりやや明るいオレンジ */
export const grainOrange = "#e04e28";

/** ロイヤルブルー */
export const grainRoyalBlue = "#4169e1";

/** オレンジ 8 割 / ロイヤルブルー 2 割（黒なし・6 色ストップ） */
function palette80orange20blue(orange: string) {
  return [orange, orange, orange, orange, orange, grainRoyalBlue] as const;
}

/** Paper Grain：セクションごとにオレンジをわずかに変化 */
export const sectionPalettes = [
  palette80orange20blue("#e04e28"),
  palette80orange20blue("#de4a24"),
  palette80orange20blue("#e3522c"),
  palette80orange20blue("#dc4826"),
  palette80orange20blue("#e04c2a"),
  palette80orange20blue("#da4622"),
  palette80orange20blue("#e25028"),
] as const;

/** Grain の背面。黒ではなくオレンジ系の暗色 */
export const grainColorBack = "#c43820";
