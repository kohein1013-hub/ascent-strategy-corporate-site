import { useLayoutEffect, useRef, type RefObject } from "react";

import { mediaQueries } from "@/lib/breakpoints";

/** .section-track transform 1.02s 想定 */
export const PC_SHELL_ASM_SLIDE_MS = 1020;
/** 再訪問: スライド終了前 */
export const PC_SHELL_ASM_REVEAL_LEAD_MS = 340;
/** 初回: 縦ズレを避けつつやや早め */
export const PC_SHELL_ASM_FIRST_VISIT_LEAD_MS = 140;

export type PcShellAsmHeroRevealOptions = {
  shellRef: RefObject<HTMLElement | null>;
  activeIndex: number;
  sectionIndex: number;
  readyClass: string;
  lockAttr: string;
  visitedClass: string;
  layoutEventName: "service-fv-layout" | "approach-titles-layout" | "network-titles-layout";
  /** 計測用 dataset（Service / Approach / Network SP 同型） */
  finalizeDatasetKey?: "serviceAsmFinalize" | "approachAsmFinalize" | "networkAsmFinalize";
  /** 侵入元に応じた ASMN 縦補正（px）。Service: APPROACH→SERVICE 等 */
  getPcEntryLiftPx?: (prevActiveIndex: number) => number;
  entryLiftCssVar?: string;
};

function measureVisitedClass(visitedClass: string) {
  return visitedClass.replace(/-visited$/, "-measure-visited");
}

/**
 * PC: Message と同型の ASMN リビール（hero-asmn-reveal・opacity 0.4s）。
 * SP 用 layout-ready / entry-ready とは別クラスで制御する。
 */
export function usePcShellAsmHeroReveal(options: PcShellAsmHeroRevealOptions) {
  const wasSectionRef = useRef(false);
  const activeIndexRef = useRef(options.activeIndex);
  const prevActiveIndexRef = useRef(options.activeIndex);
  /** セクション滞在中の侵入元（再レンダーで prev が上書きされないよう保持） */
  const entrySourceRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    activeIndexRef.current = options.activeIndex;
    const transitionPrev = prevActiveIndexRef.current;
    prevActiveIndexRef.current = options.activeIndex;

    const shell = options.shellRef.current;
    if (!shell || typeof window === "undefined") return;

    const mqGrid = window.matchMedia(mediaQueries.grid);
    const isSectionActive = options.activeIndex === options.sectionIndex;
    const track = document.querySelector(".section-track");
    const measureClass = measureVisitedClass(options.visitedClass);
    const entryLiftCssVar =
      options.entryLiftCssVar ?? "--service-pc-asmn-approach-entry-lift";

    const getRevealEntryPrev = () => entrySourceRef.current ?? transitionPrev;

    const isShellFrameActive = () => {
      const frame = shell.closest(".section-frame");
      return frame?.classList.contains("is-active") ?? false;
    };

    const notifyPcLayout = () => {
      shell.dispatchEvent(
        new CustomEvent(options.layoutEventName, { detail: { sync: true } }),
      );
    };

    const applyEntryLift = () => {
      if (!options.getPcEntryLiftPx) return;
      const liftPx = options.getPcEntryLiftPx(getRevealEntryPrev());
      if (liftPx > 0) {
        shell.style.setProperty(entryLiftCssVar, `${liftPx}px`);
        shell.dataset.pcAsmEntryLift = String(liftPx);
      } else {
        shell.style.removeProperty(entryLiftCssVar);
        delete shell.dataset.pcAsmEntryLift;
      }
    };

    const beginAsmReveal = () => {
      if (shell.classList.contains(options.readyClass)) return;
      if (!isShellFrameActive()) return;

      applyEntryLift();

      /*
       * MESSAGE→SERVICE / APPROACH→SERVICE とも同一計測（再訪問でも measure-visited で確定してから lock）。
       */
      shell.classList.add(measureClass);
      if (options.finalizeDatasetKey) {
        shell.dataset[options.finalizeDatasetKey] = "1";
      }
      notifyPcLayout();
      void shell.offsetHeight;
      if (options.finalizeDatasetKey) {
        delete shell.dataset[options.finalizeDatasetKey];
      }
      shell.classList.remove(measureClass);
      shell.setAttribute(options.lockAttr, "");

      requestAnimationFrame(() => {
        if (!isShellFrameActive()) return;
        if (activeIndexRef.current !== options.sectionIndex) return;
        shell.classList.add(options.readyClass);
      });
    };

    const runReadySoon = () => {
      beginAsmReveal();
    };

    const scheduleRevealIfStable = () => {
      requestAnimationFrame(() => {
        if (shell.classList.contains(options.readyClass)) return;
        /* スライド静止後のみ（再訪問の早期計測で縦ズレ） */
      });
    };

    const onTrackTransitionEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "transform" || te.target !== track) return;
      if (!isSectionActive || !mqGrid.matches) return;
      if (shell.classList.contains(options.readyClass)) return;
      runReadySoon();
    };

    if (!mqGrid.matches) {
      wasSectionRef.current = false;
      entrySourceRef.current = null;
      shell.style.removeProperty(entryLiftCssVar);
      delete shell.dataset.pcAsmEntryLift;
      return;
    }

    if (isSectionActive) {
      if (entrySourceRef.current === null) {
        entrySourceRef.current = transitionPrev;
      }

      shell.classList.remove(options.readyClass);
      shell.classList.remove(measureClass);
      shell.removeAttribute(options.lockAttr);
      if (options.finalizeDatasetKey) {
        delete shell.dataset[options.finalizeDatasetKey];
      }

      const entryLiftPx = options.getPcEntryLiftPx?.(getRevealEntryPrev()) ?? 0;
      /* 侵入元補正あり: スライド静止後に一度だけ計測（途中計測＋表示後再配置でガタつく） */
      const deferRevealUntilSlideEnd = entryLiftPx > 0;

      applyEntryLift();

      const asmRevealLeadMs = PC_SHELL_ASM_FIRST_VISIT_LEAD_MS;

      scheduleRevealIfStable();

      const revealLeadId = deferRevealUntilSlideEnd
        ? undefined
        : window.setTimeout(() => {
            if (
              activeIndexRef.current === options.sectionIndex &&
              !shell.classList.contains(options.readyClass)
            ) {
              runReadySoon();
            }
          }, Math.max(0, PC_SHELL_ASM_SLIDE_MS - asmRevealLeadMs));

      track?.addEventListener("transitionend", onTrackTransitionEnd);

      const readyFallbackId = window.setTimeout(() => {
        if (
          activeIndexRef.current === options.sectionIndex &&
          !shell.classList.contains(options.readyClass)
        ) {
          runReadySoon();
        }
      }, PC_SHELL_ASM_SLIDE_MS + 120);

      wasSectionRef.current = true;

      return () => {
        track?.removeEventListener("transitionend", onTrackTransitionEnd);
        if (revealLeadId !== undefined) window.clearTimeout(revealLeadId);
        window.clearTimeout(readyFallbackId);
        shell.removeAttribute(options.lockAttr);
        shell.classList.remove(measureClass);
        if (options.finalizeDatasetKey) {
          delete shell.dataset[options.finalizeDatasetKey];
        }
      };
    }

    track?.removeEventListener("transitionend", onTrackTransitionEnd);

    if (wasSectionRef.current) {
      shell.classList.add(options.visitedClass);
    }
    shell.classList.remove(options.readyClass);
    shell.classList.remove(measureClass);
    shell.removeAttribute(options.lockAttr);
    shell.style.removeProperty(entryLiftCssVar);
    delete shell.dataset.pcAsmEntryLift;
    entrySourceRef.current = null;
    if (options.finalizeDatasetKey) {
      delete shell.dataset[options.finalizeDatasetKey];
    }
    wasSectionRef.current = false;

    return undefined;
  }, [
    options.activeIndex,
    options.sectionIndex,
    options.readyClass,
    options.lockAttr,
    options.visitedClass,
    options.layoutEventName,
    options.finalizeDatasetKey,
    options.entryLiftCssVar,
    options.shellRef,
    options.getPcEntryLiftPx,
  ]);
}
