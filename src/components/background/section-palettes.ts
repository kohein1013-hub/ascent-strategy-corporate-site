/** 参考画像よりやや明るいオレンジ */
export const grainOrange = "#e04e28";

/** ロイヤルブルー */
export const grainRoyalBlue = "#4169e1";

/**
 * Paper Grain：オレンジ → ロイヤルブルー（3 色・黒なし）
 * 元の [橙, 青, 黒] と同じ shape 閾値（青は shape 0.5 付近から出る）
 */
function paletteOrangeRoyalBlue(orange: string) {
  return [orange, grainRoyalBlue, grainRoyalBlue] as const;
}

/** Paper Grain：セクションごとにオレンジをわずかに変化 */
export const sectionPalettes = [
  paletteOrangeRoyalBlue("#e04e28"),
  paletteOrangeRoyalBlue("#de4a24"),
  paletteOrangeRoyalBlue("#e3522c"),
  paletteOrangeRoyalBlue("#dc4826"),
  paletteOrangeRoyalBlue("#e04c2a"),
  paletteOrangeRoyalBlue("#da4622"),
  paletteOrangeRoyalBlue("#e25028"),
] as const;

/** Grain の背面。オレンジだとブルーが潰れるため、暗いロイヤルブルー系 */
export const grainColorBack = "#152a6e";
