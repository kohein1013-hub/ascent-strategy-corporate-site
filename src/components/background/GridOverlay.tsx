"use client";

import { CSSProperties, useLayoutEffect, useMemo, useState } from "react";

import { mediaQueries } from "@/lib/breakpoints";
import {
  FLOW_MARK_COLS,
  FOCUS_COLS,
  FOCUS_ROWS,
  getFocusPoint,
} from "@/lib/crossFocus";

/** PC grid：SP flow と同じ 7 個＋＋右端ダッシュ */
const GRID_COLS = FLOW_MARK_COLS;
const GRID_ROWS = 3;

type Props = {
  activeIndex: number;
};

export function GridOverlay({ activeIndex }: Props) {
  const focus = getFocusPoint(activeIndex);
  // SSR（=window無し）時とCSR（hydration）時で初期値がズレると
  // Next dev の hydration error が出て、アニメーションの再生順が不安定になります。
  // そこで初期レンダは常に false に固定し、matchMedia は mount 後にだけ確定します。
  const [isFlowLayout, setIsFlowLayout] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(mediaQueries.flow);
    const update = () => setIsFlowLayout(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const mainMarkCols = isFlowLayout ? FLOW_MARK_COLS : GRID_COLS;

  const marks = useMemo(() => {
    const items: Array<{
      key: string;
      edge: boolean;
      x: number;
      y: number;
    }> = [];

    for (let row = 1; row <= 7; row += 1) {
      items.push({
        key: `left-${row}`,
        edge: true,
        x: 0,
        y: (row - 1) / 6,
      });
    }

    for (let col = 1; col <= mainMarkCols; col += 1) {
      for (let row = 1; row <= GRID_ROWS; row += 1) {
        items.push({
          key: `main-${mainMarkCols}-${col}-${row}`,
          edge: col === mainMarkCols,
          x: col / mainMarkCols,
          y: (row - 1) / (GRID_ROWS - 1),
        });
      }
    }

    return items;
  }, [mainMarkCols]);

  const focusColCount = isFlowLayout ? FLOW_MARK_COLS : FOCUS_COLS;
  const focusX = focus.col / focusColCount;
  const focusY = (focus.row - 1) / (FOCUS_ROWS - 1);
  const style = useMemo(
    () =>
      ({
        "--grid-cols": GRID_COLS,
        "--grid-rows": GRID_ROWS,
        "--focus-cols": focusColCount,
        "--focus-rows": FOCUS_ROWS,
        "--focus-col": focus.col,
        "--focus-row": focus.row,
        "--focus-x": focusX,
        "--focus-y": focusY,
      }) as CSSProperties,
    [focus, focusColCount, focusX, focusY],
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--overlay-focus-x", String(focusX));
    root.style.setProperty("--overlay-focus-y", String(focusY));
  }, [focusX, focusY]);

  return (
    <div className="grid-overlay" style={style} aria-hidden>
      <div className="cross-plane">
        <div className="cross-grid">
          {marks.map((mark) => (
            <span
              key={mark.key}
              className={`cross-mark ${mark.edge ? "is-edge-dash" : ""}`}
              style={
                {
                  "--mark-x": mark.x,
                  "--mark-y": mark.y,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <div className="cross-focus-axis cross-focus-axis-h" />
        <div className="cross-focus-axis cross-focus-axis-v" />
        <div className="cross-focus">
          <span className="cross-focus-arm arm-top" />
          <span className="cross-focus-arm arm-right" />
          <span className="cross-focus-arm arm-bottom" />
          <span className="cross-focus-arm arm-left" />
          <span className="cross-focus-core" />
        </div>
      </div>
    </div>
  );
}
