"use client";

import { useLayoutEffect, useRef } from "react";

import { AsmCrossEyebrow } from "@/components/ui/AsmCrossEyebrow";
import { mediaQueries } from "@/lib/breakpoints";
import {
  FLOW_MARK_COLS,
  getCrossIntersectionFractions,
  HERO_CROSS_ANCHOR,
  HERO_EN_FROM_AXIS_OFFSET_X,
  HERO_EN_VERTICAL_AXIS_COL,
} from "@/lib/crossFocus";

type Props = {
  /** セクション切替で ASM の十字位置を再計算する */
  activeIndex?: number;
  /** ループ用クローン含め、この Hero が表示中フレームか */
  isFrameActive?: boolean;
  /** Contact→Hero 用ループクローン（vi=8）。リビールは本番フレームのみ */
  isLoopClone?: boolean;
};

export function HeroSection({
  activeIndex = 0,
  isFrameActive = false,
  isLoopClone = false,
}: Props) {
  const shellRef = useRef<HTMLElement>(null);
  const asmRef = useRef<HTMLParagraphElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const jpWrapRef = useRef<HTMLDivElement>(null);
  const hasActivatedOnceRef = useRef(false);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    if (!isFrameActive) {
      shell.classList.remove("hero-entry-ready");
      return;
    }

    /* PC: Hero→Message スライド中は activeIndex だけ変わる。再初期化で英日が消えないよう維持 */
    if (shell.classList.contains("hero-entry-ready")) {
      return;
    }

    shell.classList.remove("hero-entry-ready");

    const mqGrid = window.matchMedia(mediaQueries.grid);
    const mqFlow = window.matchMedia(mediaQueries.flow);

    const syncEnglishPosition = (force = false) => {
      if (!force && shell.classList.contains("hero-entry-ready")) return;

      const asm = asmRef.current;
      const rail = railRef.current;
      const shellNode = rail?.closest(".section-shell--hero") as HTMLElement | null;
      if (!rail || !shellNode) return;

      /* PC: グリッド + --hero-copy-inline-inset-left のみ（十字 JS 同期は SP 専用） */
      if (mqGrid.matches) {
        rail.style.removeProperty("--hero-copy-aligned-left");
        rail.style.removeProperty("--hero-copy-flow-top");
        shellNode.style.removeProperty("--hero-jp-aligned-left");
        shellNode.style.removeProperty("--hero-asmn-aligned-left");
        asm?.style.removeProperty("left");
        return;
      }

      rail.style.removeProperty("--hero-copy-aligned-left");
      rail.style.removeProperty("--hero-copy-flow-top");
      shellNode.style.removeProperty("--hero-asmn-aligned-left");
      shellNode.style.removeProperty("--hero-jp-aligned-left");
      asm?.style.removeProperty("left");

      if (!mqFlow.matches) return;

      const colCount = FLOW_MARK_COLS;
      const { focusX: axisX } = getCrossIntersectionFractions(
        HERO_EN_VERTICAL_AXIS_COL,
        1,
        colCount,
      );

      const root = document.documentElement;
      const crossInsetStr = getComputedStyle(root).getPropertyValue("--cross-inset").trim();
      const crossInset = crossInsetStr ? Number.parseFloat(crossInsetStr) : 30;

      const cs = getComputedStyle(shellNode);
      const axisOffsetStr =
        cs.getPropertyValue("--hero-en-from-axis-offset-x").trim() ||
        cs.getPropertyValue("--hero-en-cross-offset-x").trim();
      const axisOffsetX = axisOffsetStr
        ? Number.parseFloat(axisOffsetStr)
        : HERO_EN_FROM_AXIS_OFFSET_X;

      const shellRect = shellNode.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      const crossPlaneWidth = window.innerWidth - 2 * crossInset;
      const crossAxisX = crossInset + axisX * crossPlaneWidth;
      const left = Math.round(crossAxisX + axisOffsetX - railRect.left);

      rail.style.setProperty("--hero-copy-aligned-left", `${left}px`);

      const { focusY } = getCrossIntersectionFractions(
        HERO_CROSS_ANCHOR.col,
        HERO_CROSS_ANCHOR.row,
        colCount,
      );
      const offsetYStr = cs.getPropertyValue("--hero-en-cross-offset-y").trim();
      const offsetY = offsetYStr ? Number.parseFloat(offsetYStr) : -22;
      const crossPlaneHeight = shellRect.height - 2 * crossInset;
      const crossCenterY = crossInset + focusY * crossPlaneHeight;
      const top = Math.round(crossCenterY - offsetY - railRect.top);
      rail.style.setProperty("--hero-copy-flow-top", `${top}px`);

      const copyGroup = rail.querySelector(".hero-copy-group");
      const jpWrap = jpWrapRef.current;

      if (copyGroup && jpWrap) {
        const copyLeft = copyGroup.getBoundingClientRect().left;
        const jpLeft = jpWrap.getBoundingClientRect().left;
        shellNode.style.setProperty(
          "--hero-jp-aligned-left",
          `${Math.round(copyLeft - jpLeft)}px`,
        );
      } else {
        shellNode.style.setProperty("--hero-jp-aligned-left", `${left}px`);
      }

      if (copyGroup && asm) {
        const copyLeft = copyGroup.getBoundingClientRect().left;
        const offsetParent = asm.offsetParent as HTMLElement | null;
        const anchorRect = offsetParent?.getBoundingClientRect() ?? shellRect;
        const alignedLeft = Math.round(copyLeft - anchorRect.left);
        shellNode.style.setProperty("--hero-asmn-aligned-left", `${alignedLeft}px`);
        asm.style.left = `${alignedLeft}px`;
      }
    };

    const disconnectLayoutObservers = () => {
      roAsm.disconnect();
      roRail.disconnect();
      roJp?.disconnect();
      roShell?.disconnect();
    };

    const syncWhileHidden = () => syncEnglishPosition(false);

    syncWhileHidden();

    const asmNode = asmRef.current;
    const roAsm = new ResizeObserver(syncWhileHidden);
    const roRail = new ResizeObserver(syncWhileHidden);
    const jpNode = jpWrapRef.current;
    const roJp = jpNode ? new ResizeObserver(syncWhileHidden) : null;
    const shellNode = railRef.current?.closest(".section-shell--hero");
    const roShell = shellNode ? new ResizeObserver(syncWhileHidden) : null;
    if (asmNode) roAsm.observe(asmNode);
    roRail.observe(railRef.current!);
    roJp?.observe(jpNode!);
    if (shellNode) roShell?.observe(shellNode);

    const syncOnViewportChange = () => syncEnglishPosition(true);
    window.addEventListener("resize", syncOnViewportChange);
    mqGrid.addEventListener("change", syncOnViewportChange);
    mqFlow.addEventListener("change", syncOnViewportChange);

    /* Contact→Hero ループクローン: スライド中の位置合わせのみ（リビールは本番 vi=1） */
    if (isLoopClone) {
      return () => {
        disconnectLayoutObservers();
        window.removeEventListener("resize", syncOnViewportChange);
        mqGrid.removeEventListener("change", syncOnViewportChange);
        mqFlow.removeEventListener("change", syncOnViewportChange);
      };
    }

    const isFirstHeroActivation = !hasActivatedOnceRef.current;
    hasActivatedOnceRef.current = true;

    const markEntryReady = () => {
      syncEnglishPosition(true);
      shell.classList.add("hero-entry-ready");
      disconnectLayoutObservers();
    };

    const runReadySoon = () => {
      requestAnimationFrame(markEntryReady);
    };

    const isTrackAnimating = () =>
      document
        .querySelector(".section-track")
        ?.getAnimations()
        .some((anim) => anim.playState === "running") ?? false;

    /** Message→Hero: スライド中は待機。Contact→Hero リセット後: 即リビール */
    const scheduleRevealIfStable = () => {
      requestAnimationFrame(() => {
        if (shell.classList.contains("hero-entry-ready")) return;
        if (!isTrackAnimating()) runReadySoon();
      });
    };

    const track = document.querySelector(".section-track");

    const onTrackTransitionEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "transform" || te.target !== track) return;
      if (shell.classList.contains("hero-entry-ready")) return;
      runReadySoon();
    };

    track?.addEventListener("transitionend", onTrackTransitionEnd);

    if (isFirstHeroActivation) {
      runReadySoon();
    } else {
      scheduleRevealIfStable();
    }

    const readyFallbackId = window.setTimeout(() => {
      if (!shell.classList.contains("hero-entry-ready")) runReadySoon();
    }, 1100);

    return () => {
      disconnectLayoutObservers();
      window.removeEventListener("resize", syncOnViewportChange);
      mqGrid.removeEventListener("change", syncOnViewportChange);
      mqFlow.removeEventListener("change", syncOnViewportChange);
      track?.removeEventListener("transitionend", onTrackTransitionEnd);
      window.clearTimeout(readyFallbackId);
      shell.classList.remove("hero-entry-ready");
    };
  }, [activeIndex, isFrameActive, isLoopClone]);

  return (
    <section
      ref={shellRef}
      className={`section-shell section-shell--hero${isLoopClone ? " section-shell--hero-loop-clone" : ""}`}
      aria-labelledby="hero-heading"
    >
      <div className="content-grid hero-grid">
        <div className="hero-meta col-span-12 md:col-span-1">
          <div className="asm-cross-eyebrow-slot">
            <AsmCrossEyebrow
              ref={asmRef}
              activeIndex={activeIndex}
              className="reveal-item hero-bilingual-reveal"
            >
              ASMN 000.
            </AsmCrossEyebrow>
          </div>
          {/* 固定ヘッダーロゴ移行前と同じ縦位置を保つ（表示はヘッダーのみ） */}
          <p className="hero-brand hero-brand--layout-anchor" aria-hidden="true">
            Ascent strategy
          </p>
        </div>
        <div ref={railRef} className="hero-copy-rail col-span-12 md:col-span-7 md:col-start-2">
          <div className="hero-copy-group" lang="en">
            <div className="hero-copy-block reveal-item hero-bilingual-reveal">
              <h1 id="hero-heading" className="hero-title">
                The Strategy to Ascend.
              </h1>
              <p className="hero-subtitle">
                Financial strategy for every stage{" "}
                <br className="hero-flow-break" />
                of corporate growth.
              </p>
              <p className="hero-support">
                Ascent strategy is a financial consulting firm{" "}
                <br className="hero-flow-break" />
                specializing in four core pillars:{" "}
                <br className="hero-flow-break" />
                fundraising, institutional programs, M&amp;A, and sales support.
              </p>
            </div>
          </div>
        </div>
        <div
          ref={jpWrapRef}
          className="hero-jp-wrap reveal-item hero-bilingual-reveal col-span-12 md:col-span-4 md:col-start-9"
          lang="ja"
        >
          <p className="hero-jp-title">企業の成長フェーズに、財務戦略を。</p>
          <p className="hero-jp-body">
            Ascent strategyは、資金調達・制度活用・M&amp;A・営業支援の4領域を横断する、財務コンサルティングカンパニーです。
          </p>
        </div>
      </div>
    </section>
  );
}
