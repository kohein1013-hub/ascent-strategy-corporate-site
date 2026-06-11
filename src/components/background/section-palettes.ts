/** 参考画像よりやや明るいオレンジ */
export const grainOrange = "#e04e28";

/** ロイヤルブルー */
export const grainRoyalBlue = "#4169e1";

/** オレンジ→ブルー遷移。ブルーが出る閾値を少し下げて表示時間を伸ばす */
const grainBlueBlend = "#6a78d4";

/** オレンジ 7 割 / ロイヤルブルー 3 割（黒なし・11 色ストップ） */
function palette70orange30blue(orange: string) {
  return [
    orange,
    orange,
    orange,
    orange,
    orange,
    orange,
    orange,
    grainBlueBlend,
    grainRoyalBlue,
    grainRoyalBlue,
    grainRoyalBlue,
  ] as const;
}

/** Paper Grain：セクションごとにオレンジをわずかに変化 */
export const sectionPalettes = [
  palette70orange30blue("#e04e28"),
  palette70orange30blue("#de4a24"),
  palette70orange30blue("#e3522c"),
  palette70orange30blue("#dc4826"),
  palette70orange30blue("#e04c2a"),
  palette70orange30blue("#da4622"),
  palette70orange30blue("#e25028"),
] as const;

/** Grain の背面。黒ではなくオレンジ系の暗色 */
export const grainColorBack = "#c43820";
