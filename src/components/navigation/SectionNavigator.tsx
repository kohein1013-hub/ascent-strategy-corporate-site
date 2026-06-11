"use client";

import {
  type ReactNode,
  type TransitionEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

import {
  navigationCooldownMs,
  sectionIds,
  SECTION_INDEX,
  SERVICE_MOMENTUM_GUARD_MS,
  touchThreshold,
  touchThresholdAtScrollEdge,
  touchThresholdCoarse,
  wheelThreshold,
  wheelThresholdAtScrollEdge,
  getContactKeyboardScrollRoot,
  isContactFormInteractionTarget,
  resetServiceScrollInstant,
  shouldSuppressContactSectionSwipe,
} from "@/lib/sectionNavigation";
import {
  freezeAppViewportHeight,
  SECTION_ENTRY_VIEWPORT_FREEZE_MS,
} from "@/lib/appViewportHeightFreeze";
import {
  isSectionTrackTransitioning,
  setSectionTrackTransitioning,
} from "@/lib/sectionTrackTransition";
import { mediaQueries } from "@/lib/breakpoints";
import { readAppViewportHeightPx } from "@/lib/readAppViewportHeight";
import { useContactKeyboardScroll } from "@/lib/useContactKeyboardScroll";
import { useViewportHeight } from "@/lib/useViewportHeight";
import { ApproachSection } from "@/components/sections/ApproachSection";
import { CompanySection } from "@/components/sections/CompanySection";
import { ContactSection } from "@/components/sections/ContactSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { MessageSection } from "@/components/sections/MessageSection";
import { NetworkSection } from "@/components/sections/NetworkSection";
import { ServiceSection } from "@/components/sections/ServiceSection";

type Props = {
  onActiveIndexChange?: (index: number) => void;
};

export function SectionNavigator({ onActiveIndexChange }: Props) {
  const [virtualIndex, setVirtualIndex] = useState(1);
  const virtualIndexRef = useRef(1);
  /** 縦スライド中は virtual の先、完了後に追従（SP チラつき防止） */
  const [committedTrackIndex, setCommittedTrackIndex] = useState(1);
  const committedTrackIndexRef = useRef(1);
  /** スライド開始時の離脱フレーム（完了まで is-active を固定） */
  const [slideSourceTrackIndex, setSlideSourceTrackIndex] = useState<number | null>(
    null,
  );
  const slideSourceTrackIndexRef = useRef<number | null>(null);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const cooldownUntilRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const serviceScrollRef = useRef<HTMLDivElement>(null);
  const isResettingRef = useRef(false);
  const prevActiveIndexRef = useRef<number | null>(null);
  /** メッセージ→サービス直後、トラックパッド慣性が内部スクロールに乗らないようにする */
  const serviceMomentumGuardUntilRef = useRef(0);
  /** Service 内でネイティブ慣性スクロールが使われたタッチ（touchend の二重適用を防ぐ） */
  const serviceTouchUsedNativeRef = useRef(false);
  /** Contact キーボード表示中のセクション内スクロール */
  const contactTouchUsedNativeRef = useRef(false);
  const viewportHeight = useViewportHeight();
  /** Company / Contact 表示中はトラック Y を固定（リビール後の viewport 更新でジャンプしない） */
  const [pinnedTrackOffsetY, setPinnedTrackOffsetY] = useState<number | undefined>(
    undefined,
  );

  const activeIndex = (virtualIndex - 1 + sectionIds.length) % sectionIds.length;
  const effectiveActiveTrackIndex = slideSourceTrackIndex ?? committedTrackIndex;
  /** セクション内リビール・背景用（スライド完了まで離脱側を維持） */
  const committedActiveIndex =
    (effectiveActiveTrackIndex - 1 + sectionIds.length) % sectionIds.length;

  const [isPcGrid, setIsPcGrid] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(mediaQueries.grid).matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(mediaQueries.grid);
    const sync = () => setIsPcGrid(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /** PC: 遷移開始と同時に先セクションのリビール。SP: committed 遅延でチラつき防止 */
  const sectionRevealIndex = isPcGrid ? activeIndex : committedActiveIndex;

  const isTrackFrameVisible = (trackIndex: number) =>
    virtualIndex === trackIndex || slideSourceTrackIndex === trackIndex;

  const pinTrackOffsetForTitleBandSections = useCallback(() => {
    if (
      activeIndex !== SECTION_INDEX.company &&
      activeIndex !== SECTION_INDEX.contact
    ) {
      setPinnedTrackOffsetY(undefined);
      return;
    }
    const h = readAppViewportHeightPx();
    if (h > 0) {
      setPinnedTrackOffsetY(-virtualIndex * h);
    }
  }, [activeIndex, virtualIndex]);

  useLayoutEffect(() => {
    pinTrackOffsetForTitleBandSections();
  }, [pinTrackOffsetForTitleBandSections]);

  useLayoutEffect(() => {
    virtualIndexRef.current = virtualIndex;
  }, [virtualIndex]);

  useLayoutEffect(() => {
    committedTrackIndexRef.current = committedTrackIndex;
  }, [committedTrackIndex]);

  useLayoutEffect(() => {
    slideSourceTrackIndexRef.current = slideSourceTrackIndex;
  }, [slideSourceTrackIndex]);

  useLayoutEffect(() => {
    if (!transitionEnabled) {
      setSlideSourceTrackIndex(null);
      setCommittedTrackIndex(virtualIndex);
    }
  }, [virtualIndex, transitionEnabled]);

  /*
   * SP: スライド中は committed の is-active を DOM に固定（virtual 先行による離脱フラッシュ防止）
   */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia(mediaQueries.flow).matches) return;
    if (!isSectionTrackTransitioning()) return;

    const track = document.querySelector(".section-track");
    if (!track) return;

    const activeTrack = slideSourceTrackIndex ?? committedTrackIndex;
    track.querySelectorAll(":scope > .section-frame").forEach((frame, index) => {
      frame.classList.toggle("is-active", index === activeTrack);
    });
  }, [virtualIndex, committedTrackIndex, slideSourceTrackIndex]);

  useContactKeyboardScroll(activeIndex);

  const canMove = useCallback(() => Date.now() >= cooldownUntilRef.current, []);

  const pinCommittedFrameActive = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia(mediaQueries.flow).matches) return;
    const track = document.querySelector(".section-track");
    if (!track) return;
    const activeTrack =
      slideSourceTrackIndexRef.current ?? committedTrackIndexRef.current;
    track.querySelectorAll(":scope > .section-frame").forEach((frame, index) => {
      frame.classList.toggle("is-active", index === activeTrack);
    });
  }, []);

  const syncSlideTrackVars = useCallback(
    (sourceTrackIndex: number, targetTrackIndex: number) => {
      if (typeof window === "undefined") return;
      if (!window.matchMedia(mediaQueries.flow).matches) return;
      const track = document.querySelector<HTMLElement>(".section-track");
      if (!track) return;
      track.style.setProperty("--slide-source-track-index", String(sourceTrackIndex));
      track.style.setProperty("--virtual-track-index", String(targetTrackIndex));
    },
    [],
  );

  const clearSlideTrackVars = useCallback(() => {
    if (typeof window === "undefined") return;
    const track = document.querySelector<HTMLElement>(".section-track");
    track?.style.removeProperty("--slide-source-track-index");
    track?.style.removeProperty("--virtual-track-index");
  }, []);

  const beginSectionSlide = useCallback(
    (targetTrackIndex: number) => {
      /* 表示中のフレーム（virtual）を離脱元とする。committed の遅延とズレない */
      const from = virtualIndexRef.current;
      slideSourceTrackIndexRef.current = from;
      flushSync(() => setSlideSourceTrackIndex(from));
      setSectionTrackTransitioning(true);
      syncSlideTrackVars(from, targetTrackIndex);

      if (typeof window !== "undefined" && window.matchMedia(mediaQueries.flow).matches) {
        const track = document.querySelector(".section-track");
        track?.querySelectorAll(":scope > .section-frame").forEach((frame, index) => {
          frame.classList.toggle("is-slide-source", index === from);
          frame.classList.toggle("is-active", index === from);
        });
      } else {
        pinCommittedFrameActive();
      }
    },
    [pinCommittedFrameActive, syncSlideTrackVars],
  );

  const endSectionSlide = useCallback(
    (targetTrackIndex: number) => {
      slideSourceTrackIndexRef.current = null;
      setSlideSourceTrackIndex(null);
      setCommittedTrackIndex(targetTrackIndex);
      setSectionTrackTransitioning(false);
      clearSlideTrackVars();

      if (typeof window !== "undefined" && window.matchMedia(mediaQueries.flow).matches) {
        const track = document.querySelector(".section-track");
        track?.querySelectorAll(":scope > .section-frame").forEach((frame, index) => {
          frame.classList.remove("is-slide-source");
          frame.classList.toggle("is-active", index === targetTrackIndex);
        });
      }
    },
    [clearSlideTrackVars],
  );

  const scheduleSlideEndFallback = useCallback(() => {
    window.setTimeout(() => {
      if (!isSectionTrackTransitioning()) return;
      endSectionSlide(virtualIndexRef.current);
    }, 1100);
  }, [endSectionSlide]);

  const moveBy = useCallback(
    (delta: -1 | 1) => {
      if (!canMove()) return;
      if (isSectionTrackTransitioning()) return;
      setTransitionEnabled(true);
      const targetTrackIndex = virtualIndexRef.current + delta;
      beginSectionSlide(targetTrackIndex);
      freezeAppViewportHeight(SECTION_ENTRY_VIEWPORT_FREEZE_MS);
      setVirtualIndex(targetTrackIndex);
      cooldownUntilRef.current = Date.now() + navigationCooldownMs;
      scheduleSlideEndFallback();
    },
    [beginSectionSlide, canMove, scheduleSlideEndFallback],
  );

  const isServiceActive = activeIndex === SECTION_INDEX.service;
  const isContactActive = activeIndex === SECTION_INDEX.contact;

  const getServiceScrollEdges = useCallback((node: HTMLElement) => {
    const edgeSlack = 6;
    const atTop = node.scrollTop <= edgeSlack;
    const atBottom =
      node.scrollTop + node.clientHeight >= node.scrollHeight - edgeSlack;
    const canScroll = node.scrollHeight > node.clientHeight + edgeSlack;
    return { atTop, atBottom, canScroll };
  }, []);

  /** 内部スクロール端でセクション遷移しようとしているか */
  const isAtScrollEdgeForSectionExit = useCallback(
    (deltaY: number) => {
      if (deltaY === 0) return false;

      if (isServiceActive) {
        const scrollEl = serviceScrollRef.current;
        if (scrollEl) {
          const { atTop, atBottom, canScroll } = getServiceScrollEdges(scrollEl);
          if (canScroll) {
            if (deltaY > 0 && atBottom) return true;
            if (deltaY < 0 && atTop) return true;
          }
        }
      }

      if (isContactActive) {
        const contactScrollEl = getContactKeyboardScrollRoot();
        if (contactScrollEl) {
          const { atTop, atBottom, canScroll } =
            getServiceScrollEdges(contactScrollEl);
          if (canScroll) {
            if (deltaY > 0 && atBottom) return true;
            if (deltaY < 0 && atTop) return true;
          }
        }
      }

      return false;
    },
    [getServiceScrollEdges, isContactActive, isServiceActive],
  );

  const passesWheelThreshold = useCallback(
    (deltaY: number) => {
      const threshold = isAtScrollEdgeForSectionExit(deltaY)
        ? wheelThresholdAtScrollEdge
        : wheelThreshold;
      return Math.abs(deltaY) >= threshold;
    },
    [isAtScrollEdgeForSectionExit],
  );

  const scrollServiceBy = useCallback(
    (deltaY: number, behavior: ScrollBehavior = "auto") => {
      const node = serviceScrollRef.current;
      if (!node) return false;
      const { atTop, atBottom, canScroll } = getServiceScrollEdges(node);
      if (!canScroll) return false;

      if (deltaY > 0) {
        if (atBottom) return false;
        node.scrollBy({ top: deltaY, behavior });
        return true;
      }

      if (deltaY < 0) {
        if (atTop) return false;
        node.scrollBy({ top: deltaY, behavior });
        return true;
      }

      return false;
    },
    [getServiceScrollEdges],
  );

  const resolveServiceScroll = useCallback(
    (deltaY: number, behavior: ScrollBehavior = "auto") => {
      const node = serviceScrollRef.current;
      if (!node) {
        moveBy(deltaY > 0 ? 1 : -1);
        return;
      }

      const { atTop, atBottom, canScroll } = getServiceScrollEdges(node);
      if (!canScroll) {
        moveBy(deltaY > 0 ? 1 : -1);
        return;
      }

      if (deltaY > 0) {
        if (atBottom) moveBy(1);
        else scrollServiceBy(deltaY, behavior);
        return;
      }

      if (deltaY < 0) {
        if (atTop) moveBy(-1);
        else scrollServiceBy(deltaY, behavior);
      }
    },
    [getServiceScrollEdges, moveBy, scrollServiceBy],
  );

  useEffect(() => {
    /* 背景・グリッドはスライド完了まで遅延（即時切替のフラッシュ防止） */
    onActiveIndexChange?.(committedActiveIndex);
  }, [committedActiveIndex, onActiveIndexChange]);

  /* PC Contact: フォーカス中 input 上のホイールを window capture で横取り */
  useEffect(() => {
    if (!isContactActive) return undefined;

    const mq = window.matchMedia(mediaQueries.grid);
    if (!mq.matches) return undefined;

    const onContactFormWheelCapture = (event: WheelEvent) => {
      if (!isContactFormInteractionTarget(event.target)) return;
      if (!passesWheelThreshold(event.deltaY)) return;
      event.preventDefault();
      event.stopPropagation();
      moveBy(event.deltaY > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onContactFormWheelCapture, {
      passive: false,
      capture: true,
    });

    const onMqChange = () => {
      window.removeEventListener("wheel", onContactFormWheelCapture, {
        capture: true,
      });
      if (mq.matches) {
        window.addEventListener("wheel", onContactFormWheelCapture, {
          passive: false,
          capture: true,
        });
      }
    };

    mq.addEventListener("change", onMqChange);

    return () => {
      window.removeEventListener("wheel", onContactFormWheelCapture, {
        capture: true,
      });
      mq.removeEventListener("change", onMqChange);
    };
  }, [isContactActive, moveBy, passesWheelThreshold]);

  /* メッセージ / Approach → サービス: FV を scrollTop=0 に揃え（侵入時の上部ガタつき防止） */
  useLayoutEffect(() => {
    const prev = prevActiveIndexRef.current;
    prevActiveIndexRef.current = activeIndex;
    if (activeIndex !== SECTION_INDEX.service) return;
    if (prev !== SECTION_INDEX.message && prev !== SECTION_INDEX.approach) return;
    const el = serviceScrollRef.current;
    if (!el) return;
    resetServiceScrollInstant(el);
    serviceMomentumGuardUntilRef.current = Date.now() + SERVICE_MOMENTUM_GUARD_MS;
    requestAnimationFrame(() => {
      const node = serviceScrollRef.current;
      if (node) resetServiceScrollInstant(node);
    });
  }, [activeIndex]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (!passesWheelThreshold(event.deltaY)) return;

      const wheelTarget = event.target;
      const isPcGrid = window.matchMedia(mediaQueries.grid).matches;
      if (isContactActive && !isPcGrid) {
        const contactScrollEl = getContactKeyboardScrollRoot();
        const nodeTarget = wheelTarget as Node | null;
        if (
          contactScrollEl &&
          nodeTarget &&
          contactScrollEl.contains(nodeTarget)
        ) {
          const { atTop, atBottom, canScroll } = getServiceScrollEdges(contactScrollEl);
          if (canScroll) {
            if (event.deltaY > 0 && !atBottom) return;
            if (event.deltaY < 0 && !atTop) return;
          }
        } else if (shouldSuppressContactSectionSwipe(wheelTarget)) {
          const textarea =
            wheelTarget instanceof Element
              ? wheelTarget.closest<HTMLTextAreaElement>("textarea")
              : null;
          if (textarea) {
            const atTop = textarea.scrollTop <= 0;
            const atBottom =
              textarea.scrollTop + textarea.clientHeight >= textarea.scrollHeight - 1;
            if ((event.deltaY > 0 && !atBottom) || (event.deltaY < 0 && !atTop)) return;
          }
          return;
        }
      }

      const scrollEl = serviceScrollRef.current;
      const nodeTarget = wheelTarget as Node | null;
      const inServiceScroll =
        isServiceActive &&
        scrollEl &&
        nodeTarget &&
        scrollEl.contains(nodeTarget);

      if (
        isServiceActive &&
        scrollEl &&
        Date.now() < serviceMomentumGuardUntilRef.current
      ) {
        event.preventDefault();
        return;
      }

      if (isServiceActive && scrollEl) {
        const { atTop, atBottom, canScroll } = getServiceScrollEdges(scrollEl);

        if (canScroll) {
          /* 端以外はブラウザのネイティブスクロール（慣性つき）に任せる */
          if (inServiceScroll && event.deltaY > 0 && !atBottom) return;
          if (inServiceScroll && event.deltaY < 0 && !atTop) return;

          event.preventDefault();
          if (scrollServiceBy(event.deltaY)) return;
          resolveServiceScroll(event.deltaY);
          return;
        }
      }

      event.preventDefault();
      if (isServiceActive) {
        resolveServiceScroll(event.deltaY);
        return;
      }
      moveBy(event.deltaY > 0 ? 1 : -1);
    };

    const getTouchSwipeThreshold = () =>
      window.matchMedia("(pointer: coarse)").matches
        ? touchThresholdCoarse
        : touchThreshold;

    const onTouchStart = (event: TouchEvent) => {
      contactTouchUsedNativeRef.current = false;
      if (isContactActive && shouldSuppressContactSectionSwipe(event.target)) {
        const contactScrollEl = getContactKeyboardScrollRoot();
        const target = event.target;
        if (
          !contactScrollEl ||
          !(target instanceof Node) ||
          !contactScrollEl.contains(target)
        ) {
          touchStartYRef.current = null;
          serviceTouchUsedNativeRef.current = false;
          return;
        }
      }
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
      serviceTouchUsedNativeRef.current = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (touchStartYRef.current === null) return;

      const currentY = event.touches[0]?.clientY;
      const startY = touchStartYRef.current;
      if (currentY === undefined || startY === null) return;

      const delta = startY - currentY;
      if (Math.abs(delta) < 8) return;

      if (isServiceActive) {
        const scrollEl = serviceScrollRef.current;
        if (!scrollEl) return;

        const target = event.target;
        const inScroll = target instanceof Node && scrollEl.contains(target);
        const { atTop, atBottom, canScroll } = getServiceScrollEdges(scrollEl);

        if (canScroll && inScroll) {
          serviceTouchUsedNativeRef.current = true;
          /* 端では小さなスワイプで即セクション遷移（touchend 待ちのラグを削減） */
          if (atTop && delta < 0) {
            serviceTouchUsedNativeRef.current = false;
            event.preventDefault();
            if (Math.abs(delta) >= touchThresholdAtScrollEdge) {
              touchStartYRef.current = null;
              moveBy(-1);
            }
            return;
          }
          if (atBottom && delta > 0) {
            serviceTouchUsedNativeRef.current = false;
            event.preventDefault();
            if (delta >= touchThresholdAtScrollEdge) {
              touchStartYRef.current = null;
              moveBy(1);
            }
            return;
          }
          return;
        }

        if (canScroll && !inScroll) {
          event.preventDefault();
          scrollServiceBy(delta);
          touchStartYRef.current = currentY;
        }
        return;
      }

      if (isContactActive) {
        const contactScrollEl = getContactKeyboardScrollRoot();
        const target = event.target;
        const inContactScroll =
          contactScrollEl && target instanceof Node && contactScrollEl.contains(target);

        if (inContactScroll) {
          const { atTop, atBottom, canScroll } = getServiceScrollEdges(contactScrollEl);
          if (canScroll) {
            contactTouchUsedNativeRef.current = true;
            if (atTop && delta < 0) {
              contactTouchUsedNativeRef.current = false;
              event.preventDefault();
            } else if (atBottom && delta > 0) {
              contactTouchUsedNativeRef.current = false;
              event.preventDefault();
            }
            return;
          }
        }

        if (shouldSuppressContactSectionSwipe(event.target)) {
          return;
        }
      }

      /* 他セクション: 縦スワイプ用にバンドスクロールを抑止 */
      event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      const startY = touchStartYRef.current;
      touchStartYRef.current = null;
      if (startY === null) return;

      const endY = event.changedTouches[0]?.clientY ?? startY;
      const delta = startY - endY;
      const threshold = isAtScrollEdgeForSectionExit(delta)
        ? touchThresholdAtScrollEdge
        : getTouchSwipeThreshold();
      if (Math.abs(delta) < threshold) return;

      if (isContactActive) {
        const contactScrollEl = getContactKeyboardScrollRoot();
        if (contactScrollEl) {
          const { atTop, atBottom, canScroll } = getServiceScrollEdges(contactScrollEl);
          if (contactTouchUsedNativeRef.current && canScroll) {
            if (delta > 0 && atBottom) moveBy(1);
            else if (delta < 0 && atTop) moveBy(-1);
            return;
          }
        }
        if (shouldSuppressContactSectionSwipe(event.target)) {
          return;
        }
      }

      if (isServiceActive) {
        const scrollEl = serviceScrollRef.current;
        if (!scrollEl) return;

        const { atTop, atBottom, canScroll } = getServiceScrollEdges(scrollEl);

        if (serviceTouchUsedNativeRef.current && canScroll) {
          if (delta > 0 && atBottom) moveBy(1);
          else if (delta < 0 && atTop) moveBy(-1);
          return;
        }

        resolveServiceScroll(delta);
        return;
      }

      moveBy(delta > 0 ? 1 : -1);
    };

    const onTouchCancel = () => {
      touchStartYRef.current = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        if (isServiceActive) resolveServiceScroll(120, "smooth");
        else moveBy(1);
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        if (isServiceActive) resolveServiceScroll(-120, "smooth");
        else moveBy(-1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        setTransitionEnabled(true);
        setVirtualIndex(1);
      }
      if (event.key === "End") {
        event.preventDefault();
        setTransitionEnabled(true);
        setVirtualIndex(sectionIds.length);
      }
    };

    const touchOpts = { capture: true, passive: false } as const;
    const touchEndOpts = { capture: true, passive: true } as const;

    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("touchstart", onTouchStart, touchEndOpts);
    document.addEventListener("touchmove", onTouchMove, touchOpts);
    document.addEventListener("touchend", onTouchEnd, touchEndOpts);
    document.addEventListener("touchcancel", onTouchCancel, touchEndOpts);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("touchstart", onTouchStart, touchEndOpts);
      document.removeEventListener("touchmove", onTouchMove, touchOpts);
      document.removeEventListener("touchend", onTouchEnd, touchEndOpts);
      document.removeEventListener("touchcancel", onTouchCancel, touchEndOpts);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    getServiceScrollEdges,
    isAtScrollEdgeForSectionExit,
    isContactActive,
    isServiceActive,
    moveBy,
    passesWheelThreshold,
    resolveServiceScroll,
    scrollServiceBy,
  ]);

  const onTrackTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      // 子の reveal 等の transitionend がバブルすると、トラック transform 途中で
      // virtualIndex がリセットされカクつくため、トラック自身の transform のみ処理する
      if (event.target !== event.currentTarget) return;
      if (event.propertyName !== "transform") return;

      /* 通常遷移（Approach→Service 等）でも必ず解除 */
      endSectionSlide(virtualIndex);
      freezeAppViewportHeight(SECTION_ENTRY_VIEWPORT_FREEZE_MS);
      pinTrackOffsetForTitleBandSections();

      const currentActive =
        (virtualIndex - 1 + sectionIds.length) % sectionIds.length;
      if (currentActive === SECTION_INDEX.service) {
        const scrollEl = serviceScrollRef.current;
        if (scrollEl) resetServiceScrollInstant(scrollEl);
      }

      if (isResettingRef.current) return;
      if (virtualIndex !== 0 && virtualIndex !== sectionIds.length + 1) return;

      isResettingRef.current = true;
      setTransitionEnabled(false);
      setVirtualIndex(virtualIndex === 0 ? sectionIds.length : 1);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionEnabled(true);
          isResettingRef.current = false;
        });
      });
    },
    [endSectionSlide, virtualIndex, pinTrackOffsetForTitleBandSections],
  );

  const renderSectionFrame = useCallback(
    (trackIndex: number, content: ReactNode) => (
      <div
        className={`section-frame${trackIndex === effectiveActiveTrackIndex ? " is-active" : ""}${trackIndex === slideSourceTrackIndex ? " is-slide-source" : ""}${trackIndex === virtualIndex ? " is-virtual-active" : ""}`}
      >
        {content}
      </div>
    ),
    [effectiveActiveTrackIndex, slideSourceTrackIndex, virtualIndex],
  );

  const goToTop = useCallback(() => {
    setTransitionEnabled(true);
    beginSectionSlide(1);
    freezeAppViewportHeight(SECTION_ENTRY_VIEWPORT_FREEZE_MS);
    setVirtualIndex(1);
    scheduleSlideEndFallback();
  }, [beginSectionSlide, scheduleSlideEndFallback]);

  const trackOffsetY =
    pinnedTrackOffsetY ??
    (viewportHeight > 0 ? -virtualIndex * viewportHeight : undefined);

  return (
    <main className="section-navigator relative overflow-hidden">
      <header className="site-header">
        <button
          type="button"
          className="site-header__brand hero-brand"
          onClick={goToTop}
          aria-label="トップへ戻る"
        >
          Ascent strategy
        </button>
      </header>
      <div
        className="section-track"
        onTransitionEnd={onTrackTransitionEnd}
        style={{
          transform:
            trackOffsetY !== undefined
              ? `translate3d(0, ${trackOffsetY}px, 0)`
              : `translate3d(0, calc(-1 * ${virtualIndex} * 100dvh), 0)`,
          transition: transitionEnabled ? undefined : "none",
          ...(slideSourceTrackIndex !== null
            ? {
                ["--slide-source-track-index" as string]: String(slideSourceTrackIndex),
                ["--virtual-track-index" as string]: String(virtualIndex),
              }
            : {}),
        }}
      >
        {renderSectionFrame(
          0,
          <ContactSection
            activeIndex={sectionRevealIndex}
            isLoopClone
            isFrameActive={isTrackFrameVisible(0)}
          />,
        )}
        {renderSectionFrame(
          1,
          <HeroSection
            activeIndex={sectionRevealIndex}
            isFrameActive={isTrackFrameVisible(1)}
            isLoopClone={false}
          />,
        )}
        {renderSectionFrame(2, <MessageSection activeIndex={sectionRevealIndex} />)}
        {renderSectionFrame(
          3,
          <ServiceSection
            scrollRef={serviceScrollRef}
            activeIndex={sectionRevealIndex}
          />,
        )}
        {renderSectionFrame(4, <ApproachSection activeIndex={sectionRevealIndex} />)}
        {renderSectionFrame(5, <NetworkSection activeIndex={sectionRevealIndex} />)}
        {renderSectionFrame(6, <CompanySection activeIndex={sectionRevealIndex} />)}
        {renderSectionFrame(
          7,
          <ContactSection
            activeIndex={sectionRevealIndex}
            isFrameActive={isTrackFrameVisible(sectionIds.length)}
          />,
        )}
        {renderSectionFrame(
          8,
          <HeroSection
            activeIndex={sectionRevealIndex}
            isFrameActive={isTrackFrameVisible(8)}
            isLoopClone
          />,
        )}
      </div>
      <nav className="section-dots" aria-label="Section navigation">
        {sectionIds.map((id, index) => (
          <button
            key={id}
            type="button"
            className={`left-rail-dot ${index === activeIndex ? "is-active" : ""}`}
            onClick={() => {
              setTransitionEnabled(true);
              const targetTrackIndex = index + 1;
              beginSectionSlide(targetTrackIndex);
              freezeAppViewportHeight(SECTION_ENTRY_VIEWPORT_FREEZE_MS);
              setVirtualIndex(targetTrackIndex);
              scheduleSlideEndFallback();
            }}
            aria-label={`${id} section`}
          />
        ))}
      </nav>
    </main>
  );
}
