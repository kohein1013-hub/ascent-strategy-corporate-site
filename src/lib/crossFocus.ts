/** GridOverlay の十字フォーカスと共有（ASM・ヒーロー配置の単一ソース） */

import { SECTION_INDEX } from "@/lib/sectionNavigation";

/** 横並び＋は 7 個＋右端ダッシュ（列位置 8 まで）。SP flow / PC grid 共通 */
export const FLOW_MARK_COLS = 8;

/** PC（grid）の十字・フォーカス列数 — SP と同じ 8 列 */
export const FOCUS_COLS = FLOW_MARK_COLS;
export const FOCUS_ROWS = 7;

/** Hero 十字・ASM・英語ブロックの交差点（col 1 / row 2） */
export const HERO_CROSS_ANCHOR = { col: 1, row: 2 } as const;

/** Hero 英語ブロック左端：列 1 の縦軸（交差点 1/1〜1/7）から右へ */
export const HERO_EN_VERTICAL_AXIS_COL = 1;
export const HERO_EN_FROM_AXIS_OFFSET_X = 15;

/** Message 英語ブロックを収める十字交差の矩形（col/row は 1 始まり） */
export const MESSAGE_EN_CROSS_BOUNDS = {
  colStart: 4,
  rowStart: 4,
  colEnd: 7,
  rowEnd: 7,
} as const;

/** Message 英語ブロック（SP flow）：列 3〜8（右端は CSS/JS の inset でダッシュ手前に収める） */
export const MESSAGE_EN_CROSS_BOUNDS_SP = {
  colStart: 3,
  rowStart: 4,
  colEnd: 8,
  rowEnd: 7,
} as const;

/**
 * Network 本文（SP flow）：横は 1〜7 列、縦は row 7 まで（下余白は cross-inset）。
 * 上端は JS でタイトル帯直下に合わせる。
 */
export const NETWORK_CONTENT_BOUNDS_SP = {
  colStart: 1,
  rowStart: 1,
  colEnd: 7,
  rowEnd: 7,
} as const;

/** Network 本文（PC grid）：1/1〜5/4 の中央に配置 */
export const NETWORK_CONTENT_BOUNDS_PC = {
  colStart: 1,
  rowStart: 1,
  colEnd: 5,
  rowEnd: 4,
} as const;

export type CrossBounds = {
  colStart: number;
  rowStart: number;
  colEnd: number;
  rowEnd: number;
};

/** 交差点 colStart/rowStart 〜 colEnd/rowEnd の内側矩形（クロスプレーン上の比率） */
export function getCrossBoundsBox(
  bounds: CrossBounds,
  colCount: number = FOCUS_COLS,
  rowIntervals: number = FOCUS_ROWS - 1,
) {
  const { colStart, rowStart, colEnd, rowEnd } = bounds;
  return {
    leftFrac: colStart / colCount,
    topFrac: (rowStart - 1) / rowIntervals,
    widthFrac: (colEnd - colStart) / colCount,
    heightFrac: (rowEnd - rowStart) / rowIntervals,
  };
}

/** 左上交差点を (1,1) とするグリッド上の交差点（セクション index に対応） */
export const focusPoints = [
  HERO_CROSS_ANCHOR,
  { col: 4, row: 4 },
  { col: 6, row: 3 },
  { col: 7, row: 5 },
  { col: 5, row: 5 },
  { col: 3, row: 5 },
  { col: 8, row: 7 },
] as const;

/** Approach セクションのみ十字・ASM・見出し軸をこの交差点に合わせる */
export const APPROACH_CROSS_FOCUS = { col: 2, row: 4 } as const;

/** Network セクションの十字・ASM・見出し軸（交差点を1段下） */
export const NETWORK_CROSS_FOCUS = { col: 5, row: 5 } as const;

/** Company セクションの十字・ASM・見出し軸（交差点 1/6） */
export const COMPANY_CROSS_FOCUS = { col: 1, row: 6 } as const;

/** Contact セクションの十字・ASM 軸（交差点 8/7） */
export const CONTACT_CROSS_FOCUS = { col: 8, row: 7 } as const;

/**
 * Company 表罫線：GridOverlay の 8×7 フォーカス交差（左端 7 行マーク）に合わせる。
 * 起点 (1,1)、col 1–8 / row 1–7（5 行 + 最下段交差）＝水平線 7 本。
 */
export const COMPANY_TABLE_GRID = {
  colStart: 1,
  colEnd: 8,
  rowStart: 1,
  rowEnd: 7,
  focusCols: FOCUS_COLS,
  focusRowIntervals: FOCUS_ROWS - 1,
} as const;

/**
 * Contact フォーム罫線：Company と同じ 8×7 交差。
 * 起点 (1,1)、5 行分（案内 1 行 + フィールド 4 行）＋最下段交差 8/7 ＝水平線 7 本。
 */
export const CONTACT_FORM_GRID = {
  colStart: 1,
  colEnd: 8,
  rowStart: 1,
  rowUnits: 5,
  focusCols: FOCUS_COLS,
  focusRowIntervals: FOCUS_ROWS - 1,
} as const;

export function getFocusPoint(activeIndex: number): { col: number; row: number } {
  if (activeIndex === SECTION_INDEX.approach) {
    return APPROACH_CROSS_FOCUS;
  }
  if (activeIndex === SECTION_INDEX.network) {
    return NETWORK_CROSS_FOCUS;
  }
  if (activeIndex === SECTION_INDEX.company) {
    return COMPANY_CROSS_FOCUS;
  }
  if (activeIndex === SECTION_INDEX.contact) {
    return CONTACT_CROSS_FOCUS;
  }
  return focusPoints[activeIndex % focusPoints.length];
}

export function getCrossIntersectionFractions(
  col: number,
  row: number,
  colCount: number,
  rowIntervals: number = FOCUS_ROWS - 1,
): { focusX: number; focusY: number } {
  return {
    focusX: col / colCount,
    focusY: (row - 1) / rowIntervals,
  };
}

export function getFocusFractions(
  activeIndex: number,
  colCount: number = FOCUS_COLS,
): { focusX: number; focusY: number } {
  const focus = getFocusPoint(activeIndex);
  return getCrossIntersectionFractions(focus.col, focus.row, colCount);
}
