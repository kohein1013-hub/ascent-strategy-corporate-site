/**
 * レスポンシブブレイクポイント（CSS @media と JS matchMedia の単一ソース）
 *
 * - flow（768px 以下）: 縦積み・罫線→枠線・ASM 通常フロー
 * - grid（769px 以上）: 十字グリッド座標・ASM 絶対配置・罫線ドロー
 * - mobile-sm（480px 以下）: 狭い SP の追加調整
 * - tablet（769–1024px）: 第2フェーズ用（現状 CSS 未使用）
 */

export const BREAKPOINT_FLOW_MAX_PX = 768;
export const BREAKPOINT_GRID_MIN_PX = 769;
export const BREAKPOINT_MOBILE_SM_MAX_PX = 480;
export const BREAKPOINT_TABLET_MAX_PX = 1024;

export const mediaQueries = {
  flow: `(max-width: ${BREAKPOINT_FLOW_MAX_PX}px)`,
  grid: `(min-width: ${BREAKPOINT_GRID_MIN_PX}px)`,
  mobileSm: `(max-width: ${BREAKPOINT_MOBILE_SM_MAX_PX}px)`,
  tablet: `(min-width: ${BREAKPOINT_GRID_MIN_PX}px) and (max-width: ${BREAKPOINT_TABLET_MAX_PX}px)`,
  /** マウスホバーが有効な環境（タッチの synthetic mouseenter 除外用） */
  fineHover: "(hover: hover) and (pointer: fine)",
} as const;
