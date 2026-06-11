/** 参考画像よりやや明るいオレンジ */
export const grainOrange = "#e04e28";

/** ロイヤルブルー */
export const grainRoyalBlue = "#4169e1";

/**
 * Paper Grain：オレンジ → ロイヤルブルー（3 色・黒なし）
 * 画面占有比をオレンジ 70% / ロイヤルブルー 30% に寄せる。
 * 3 色は shape 値 [0,1] に等間隔（0 / 0.5 / 1）で並ぶため、
 * [橙, 橙, 青] にすると前半 50% が橙のまま、後半で橙→青へ遷移し、
 * 青が支配的になるのは概ね後方 30% に収まる。
 */
function paletteOrangeRoyalBlue(orange: string) {
  return [orange, orange, grainRoyalBlue] as const;
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

/**
 * Grain の背面（スフィアの外側に出る色）。
 * 紺色を出さず、オレンジ × ロイヤルブルーの二色だけに見せるため
 * 背面色そのものをロイヤルブルーにする。これでスフィア外側も
 * ロイヤルブルーになり、左側に紺色のスフィア縁が出なくなる。
 */
export const grainColorBack = grainRoyalBlue;
