"use client";

import { useLayoutEffect, useState } from "react";

import { isAppViewportHeightFrozen } from "@/lib/appViewportHeightFreeze";

/**
 * iOS Safari では transform 内の 100dvh が効かないことがあるため、
 * visualViewport / innerHeight の px 値を --app-viewport-h に反映する。
 *
 * ソフトキーボード表示で visualViewport だけが縮む場合はレイアウト高さを固定し、
 * タップ前と同じ寸法を維持する（キーボードはオーバーレイ扱い）。
 */
export function useViewportHeight(): number {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    let layoutHeight = 0;

    const applyHeight = (next: number) => {
      if (next <= 0) return;
      layoutHeight = next;
      setHeight(next);
      document.documentElement.style.setProperty("--app-viewport-h", `${next}px`);
    };

    const readHeights = () => {
      const inner = window.innerHeight;
      const visual = window.visualViewport?.height ?? inner;
      return { inner, visual };
    };

    const isLikelySoftKeyboard = (inner: number, visual: number) =>
      layoutHeight > 0 && visual < layoutHeight * 0.85 && inner >= layoutHeight * 0.92;

    const update = () => {
      if (isAppViewportHeightFrozen()) {
        return;
      }

      const { inner, visual } = readHeights();

      if (layoutHeight === 0) {
        applyHeight(Math.max(inner, visual));
        return;
      }

      if (isLikelySoftKeyboard(inner, visual)) {
        return;
      }

      const next = Math.max(layoutHeight, inner, visual);
      if (next !== layoutHeight) {
        applyHeight(next);
      }
    };

    const onOrientationChange = () => {
      layoutHeight = 0;
      requestAnimationFrame(update);
    };

    update();

    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", onOrientationChange);

    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", onOrientationChange);
    };
  }, []);

  return height;
}
