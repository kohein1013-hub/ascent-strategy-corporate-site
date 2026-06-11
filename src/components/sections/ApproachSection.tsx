"use client";

import {
  type MouseEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { mediaQueries } from "@/lib/breakpoints";
import {
  APPROACH_CROSS_FOCUS,
  FLOW_MARK_COLS,
  getCrossIntersectionFractions,
} from "@/lib/crossFocus";
import { SECTION_INDEX } from "@/lib/sectionNavigation";
import { isSectionTrackTransitioning } from "@/lib/sectionTrackTransition";
import { usePcShellAsmHeroReveal } from "@/lib/usePcShellAsmHeroReveal";

const approachItems: {
  key: string;
  label: string;
  body: ReactNode;
}[] = [
  {
    key: "one-stop",
    label: "One-Stop Financial Partner",
    body: (
      <>
        <span lang="en">Ascent Capital</span>・<span lang="en">Ascent Grants</span>・
        <span lang="en">Ascent M&amp;A</span>・<span lang="en">Ascent Sales</span>
        を一つの戦略パッケージとして提供。「
        <span lang="en">Ascent Grants</span>で初期負担を抑え、
        <span lang="en">Ascent Capital</span>で成長資金を整え、
        <span lang="en">Ascent Sales</span>で売上を拡大した上で、
        <span lang="en">Ascent M&amp;A</span>による承継・売却を検討する」——こうした長期ストーリーの設計が可能です。
      </>
    ),
  },
  {
    key: "lifecycle",
    label: "Across the Lifecycle",
    body:
      "創業期の事業計画策定から、成熟企業の事業承継、買収による事業拡大まで。企業のライフサイクル全体に対応できる専門家ネットワークを整えています。",
  },
  {
    key: "execution",
    label: "Execution-Driven",
    body:
      "「戦略は、実行されてはじめて価値を生む」——私たちはこの考えのもと、案件ソーシング・営業実行・専門家アサインに至るまで、戦略の実行フェーズを継続的にご支援します。",
  },
];

/** チップ reveal-delay-4（0.38s）+ transform（0.7s）+ 余裕 */
const APPROACH_CHIP_REVEAL_LOCK_MS = 1150;
/** タイトル帯リビール（transition 0.7s）+ 余裕 */
const APPROACH_TITLES_REVEAL_LOCK_MS = 1100;

const getRevealTranslateY = (el: HTMLElement) => {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === "none") return 0;
  return new DOMMatrix(transform).m42;
};

/** transform リビール中もレイアウト上端で計測（getBoundingClientRect 単体だとガタつく） */
const getLayoutTopInShell = (el: HTMLElement, shellEl: HTMLElement) => {
  const shellRect = shellEl.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return elRect.top - shellRect.top - getRevealTranslateY(el);
};

export function ApproachSection({ activeIndex = 0 }: { activeIndex?: number }) {
  const shellRef = useRef<HTMLElement>(null);

  usePcShellAsmHeroReveal({
    shellRef,
    activeIndex,
    sectionIndex: SECTION_INDEX.approach,
    readyClass: "approach-pc-asm-ready",
    lockAttr: "data-approach-pc-asm-lock",
    visitedClass: "approach-pc-asm-visited",
    layoutEventName: "approach-titles-layout",
    finalizeDatasetKey: "approachAsmFinalize",
  });

  const [openChipKey, setOpenChipKey] = useState<string | null>(null);
  const [dismissedHoverKey, setDismissedHoverKey] = useState<string | null>(null);

  const openChipKeyOnApproach =
    activeIndex === SECTION_INDEX.approach ? openChipKey : null;

  const toggleChip = useCallback((key: string) => {
    setDismissedHoverKey(null);
    setOpenChipKey((prev) => (prev === key ? null : key));
  }, []);

  const handleChipHeadClick = useCallback(
    (event: MouseEvent<HTMLDivElement>, key: string) => {
      const chip = event.currentTarget.closest(".approach-chip") as HTMLElement | null;
      const isOpen = openChipKeyOnApproach === key;

      if (isOpen) {
        event.stopPropagation();
        setOpenChipKey(null);
        setDismissedHoverKey(key);
        chip?.blur();
        return;
      }

      /*
       * PC のみ: ホバー表示中にタイトルクリックで閉じる。
       * タッチでは mouseenter が先に走るため hovered 状態の追跡は使わない。
       */
      const canFineHover =
        typeof window !== "undefined" &&
        window.matchMedia(mediaQueries.fineHover).matches;
      if (canFineHover && chip?.matches(":hover")) {
        event.stopPropagation();
        setDismissedHoverKey(key);
        chip.blur();
      }
    },
    [openChipKeyOnApproach],
  );

  const handleChipMouseLeave = useCallback((key: string) => {
    setDismissedHoverKey((prev) => (prev === key ? null : prev));
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const shell = shellRef.current;
    if (!shell) return;

    const mqFlow = window.matchMedia(mediaQueries.flow);
    let chipLayoutLockUntil = 0;
    let titlesRevealLockUntil = 0;
    let revealUnlockId: number | undefined;
    let titlesRevealArmed = false;

    const armRevealLayoutLock = () => {
      const lockUntil = Date.now() + APPROACH_TITLES_REVEAL_LOCK_MS;
      titlesRevealLockUntil = lockUntil;
      chipLayoutLockUntil = Math.max(chipLayoutLockUntil, lockUntil);
      window.clearTimeout(revealUnlockId);
      revealUnlockId = window.setTimeout(() => {
        runSoon({ forceChipSync: true, forceTitlesSync: true });
      }, APPROACH_TITLES_REVEAL_LOCK_MS);
    };

    const syncTitlesVerticalAlign = (force = false) => {
      const frame = shell.closest(".section-frame");
      const titlesStack = shell.querySelector(".message-titles-stack") as HTMLElement | null;
      if (!mqFlow.matches) {
        shell.style.removeProperty("--approach-titles-top");
        shell.classList.remove("approach-layout-ready", "approach-titles-reveal-go");
        return;
      }
      if (!frame?.classList.contains("is-active") || !titlesStack) return;
      if (!force && Date.now() < titlesRevealLockUntil) return;

      const root = document.documentElement;
      const crossInsetStr = getComputedStyle(root).getPropertyValue("--cross-inset").trim();
      const crossInset = crossInsetStr ? Number.parseFloat(crossInsetStr) : 30;

      const shellRect = shell.getBoundingClientRect();
      const crossPlaneHeight = shellRect.height - 2 * crossInset;
      const { focusY } = getCrossIntersectionFractions(
        APPROACH_CROSS_FOCUS.col,
        APPROACH_CROSS_FOCUS.row,
        FLOW_MARK_COLS,
      );
      const crossArmY = crossInset + focusY * crossPlaneHeight;

      const cs = getComputedStyle(shell);
      const gapAboveStr = cs.getPropertyValue("--approach-titles-above-arm-gap").trim();
      const gapAbove = gapAboveStr ? Number.parseFloat(gapAboveStr) : 12;
      const titlesHeight = titlesStack.offsetHeight;
      const top = Math.max(0, Math.round(crossArmY - gapAbove - titlesHeight));
      shell.style.setProperty("--approach-titles-top", `${top}px`);
    };

    const syncChipVerticalAlign = (force = false) => {
      const body = shell.querySelector(".approach-body") as HTMLElement | null;
      const frame = shell.closest(".section-frame");
      if (!mqFlow.matches) {
        shell.style.removeProperty("--approach-chip-base-margin-down");
        body?.style.removeProperty("margin-top");
        return;
      }
      /* 非表示フレームは reveal 未��用で計測が狂うため、表示中のみ同期 */
      if (!frame?.classList.contains("is-active")) return;
      /* チップ侵入リビール中は margin を固定（transform 計測ずれによるガタつき防止） */
      if (!force && Date.now() < chipLayoutLockUntil) return;

      const grid = shell.querySelector(".approach-chip-grid") as HTMLElement | null;
      if (!body || !grid) return;
      const anchorChip = (shell.querySelector(
        '.approach-chip-grid .approach-chip[data-chip-key="one-stop"]',
      ) ?? grid.querySelector(".approach-chip:first-child")) as HTMLElement | null;
      if (!anchorChip) return;

      const root = document.documentElement;
      const crossInsetStr = getComputedStyle(root).getPropertyValue("--cross-inset").trim();
      const crossInset = crossInsetStr ? Number.parseFloat(crossInsetStr) : 30;

      const shellRect = shell.getBoundingClientRect();
      const crossPlaneHeight = shellRect.height - 2 * crossInset;
      const { focusY } = getCrossIntersectionFractions(
        APPROACH_CROSS_FOCUS.col,
        APPROACH_CROSS_FOCUS.row,
        FLOW_MARK_COLS,
      );
      /* 横アーム（row 4）のすぐ下に ONE-STOP チップ（先頭）の上端を合わせる */
      const crossArmY = crossInset + focusY * crossPlaneHeight;

      body.style.marginTop = "0px";
      const chipTopInShell = getLayoutTopInShell(anchorChip, shell);
      body.style.removeProperty("margin-top");

      const cs = getComputedStyle(shell);
      const gapBelowStr = cs.getPropertyValue("--approach-chip-below-arm-gap").trim();
      const gapBelow = gapBelowStr ? Number.parseFloat(gapBelowStr) : 12;
      const targetChipTopY = crossArmY + gapBelow;
      const baseMargin = Math.round(targetChipTopY - chipTopInShell);
      shell.style.setProperty("--approach-chip-base-margin-down", `${baseMargin}px`);
    };

    const notify = (sync = false) => {
      if (!mqFlow.matches) return;
      shell.dispatchEvent(
        new CustomEvent("approach-titles-layout", { detail: { sync } }),
      );
    };

    const markApproachEntryReady = () => {
      if (!mqFlow.matches) {
        shell.classList.remove("approach-layout-ready", "approach-titles-reveal-go");
        shell.removeAttribute("data-approach-asm-lock");
        delete shell.dataset.approachAsmFinalize;
        titlesRevealArmed = false;
        return;
      }
      if (titlesRevealArmed || shell.classList.contains("approach-titles-reveal-go")) {
        return;
      }

      syncTitlesVerticalAlign(true);
      syncChipVerticalAlign(true);

      /* 計測用フラグ → AsmCrossEyebrow で幅を取ってから座標確定（Service FV 同型） */
      shell.dataset.approachAsmFinalize = "1";
      notify(true);
      delete shell.dataset.approachAsmFinalize;

      shell.classList.add("approach-layout-ready");
      notify(true);

      titlesRevealArmed = true;
      /* 18px 初期姿勢を1フレーム描画してから keyframes リビール */
      void shell.offsetHeight;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          shell.classList.add("approach-titles-reveal-go");
          shell.setAttribute("data-approach-asm-lock", "");
          notify(true);
          armRevealLayoutLock();
          window.setTimeout(() => {
            shell.removeAttribute("data-approach-asm-lock");
          }, APPROACH_TITLES_REVEAL_LOCK_MS);
        });
      });
    };

    const runReadySoon = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          runSoon({ forceChipSync: true, forceTitlesSync: true, markEntryReady: true });
        });
      });
    };

    const runSoon = (options?: {
      forceChipSync?: boolean;
      forceTitlesSync?: boolean;
      markEntryReady?: boolean;
    }) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncTitlesVerticalAlign(options?.forceTitlesSync ?? false);
          syncChipVerticalAlign(options?.forceChipSync ?? false);
          if (!options?.markEntryReady) {
            notify();
          }
          if (options?.markEntryReady) {
            markApproachEntryReady();
          }
        });
      });
    };

    const isTrackAnimating = () =>
      document
        .querySelector(".section-track")
        ?.getAnimations()
        .some((anim) => anim.playState === "running") ?? false;

    const resetApproachVisualState = () => {
      shell.style.removeProperty("--approach-chip-base-margin-down");
      shell.style.removeProperty("--approach-titles-top");
      shell.classList.remove("approach-layout-ready", "approach-titles-reveal-go");
      shell.removeAttribute("data-approach-asm-lock");
      delete shell.dataset.approachAsmFinalize;
      titlesRevealArmed = false;
      shell.querySelector(".approach-body")?.removeAttribute("style");
    };

    let exitResetOnTrackEnd: ((e: Event) => void) | undefined;

    if (activeIndex === SECTION_INDEX.approach) {
      shell.classList.remove("approach-titles-reveal-go");
      shell.removeAttribute("data-approach-asm-lock");
      delete shell.dataset.approachAsmFinalize;
      titlesRevealArmed = false;
    } else if (
      shell.classList.contains("approach-layout-ready") ||
      shell.classList.contains("approach-titles-reveal-go") ||
      shell.style.getPropertyValue("--approach-titles-top")
    ) {
      /* 離脱中はスライド完了までレイアウトを保持（isTrackAnimating は effect 時点では未開始になり得る） */
      const trackEl = document.querySelector(".section-track");
      if (trackEl) {
        exitResetOnTrackEnd = (e: Event) => {
          const te = e as TransitionEvent;
          if (te.propertyName !== "transform" || te.target !== trackEl) return;
          trackEl.removeEventListener("transitionend", exitResetOnTrackEnd!);
          exitResetOnTrackEnd = undefined;
          resetApproachVisualState();
        };
        trackEl.addEventListener("transitionend", exitResetOnTrackEnd);
      } else {
        resetApproachVisualState();
      }
    }

    const suppressApproachLayout = activeIndex !== SECTION_INDEX.approach;

    if (activeIndex === SECTION_INDEX.approach && mqFlow.matches) {
      runSoon({ forceChipSync: true });
      requestAnimationFrame(() => {
        if (!isTrackAnimating()) runReadySoon();
      });
    }

    const approachBody = shell.querySelector(".approach-body");
    const chipGrid = shell.querySelector(".approach-chip-grid");
    const taglineAxis = shell.querySelector(".approach-tagline-axis");
    const tagline = shell.querySelector(".approach-tagline-axis .message-tagline");
    const headingAxis = shell.querySelector(".approach-heading-axis");
    const titlesStack = shell.querySelector(".message-titles-stack");
    const titlesAxis = shell.querySelector(".message-titles-axis");
    const scheduleLayout = () => {
      if (suppressApproachLayout || isSectionTrackTransitioning()) return;
      if (Date.now() < titlesRevealLockUntil) return;
      runSoon();
    };
    const ro = new ResizeObserver(scheduleLayout);
    ro.observe(shell);
    if (approachBody) ro.observe(approachBody);
    if (chipGrid) ro.observe(chipGrid);
    if (titlesStack) ro.observe(titlesStack);
    if (taglineAxis) ro.observe(taglineAxis);
    if (tagline) ro.observe(tagline);
    if (headingAxis) ro.observe(headingAxis);
    if (titlesAxis) ro.observe(titlesAxis);
    window.addEventListener("resize", scheduleLayout);
    const onMqChange = () => {
      if (!mqFlow.matches) {
        shell.classList.remove("approach-layout-ready", "approach-titles-reveal-go");
      }
      scheduleLayout();
    };
    mqFlow.addEventListener("change", onMqChange);

    const track = document.querySelector(".section-track");
    const onTrackTransitionEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "transform" || te.target !== track) return;
      if (!mqFlow.matches) {
        runSoon();
        return;
      }
      const frame = shell.closest(".section-frame");
      if (!frame?.classList.contains("is-active")) {
        return;
      }
      runReadySoon();
    };
    track?.addEventListener("transitionend", onTrackTransitionEnd);

    const readyFallbackId = mqFlow.matches
      ? window.setTimeout(() => {
          const frame = shell.closest(".section-frame");
          if (
            activeIndex === SECTION_INDEX.approach &&
            frame?.classList.contains("is-active") &&
            !shell.classList.contains("approach-titles-reveal-go")
          ) {
            markApproachEntryReady();
          }
        }, 900)
      : undefined;

    let activeIo: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      activeIo = new IntersectionObserver(
        (entries) => {
          if (
            !suppressApproachLayout &&
            !isSectionTrackTransitioning() &&
            entries.some((e) => e.isIntersecting && e.intersectionRatio > 0.2) &&
            Date.now() >= titlesRevealLockUntil
          ) {
            runSoon();
          }
        },
        { threshold: [0, 0.2, 0.5] },
      );
      activeIo.observe(shell);
    }

    return () => {
      activeIo?.disconnect();
      ro.disconnect();
      window.clearTimeout(revealUnlockId);
      window.removeEventListener("resize", scheduleLayout);
      mqFlow.removeEventListener("change", onMqChange);
      track?.removeEventListener("transitionend", onTrackTransitionEnd);
      if (readyFallbackId !== undefined) window.clearTimeout(readyFallbackId);
      if (exitResetOnTrackEnd) {
        track?.removeEventListener("transitionend", exitResetOnTrackEnd);
      }
    };
  }, [activeIndex]);

  return (
    <section ref={shellRef} className="section-shell approach-shell">
      <div className="message-titles-stack">
        <div className="message-titles-axis">
          <div className="approach-heading-axis">
            <h2 className="message-heading reveal-item reveal-delay-2">
              Approach
            </h2>
          </div>
          <div className="approach-tagline-axis">
            <h3 className="message-tagline reveal-item reveal-delay-3">
              4つのサービスを横断する、
              <br />
              3つの一貫した姿勢。
            </h3>
          </div>
        </div>
      </div>

      <div className="approach-body">
        <div className="content-grid message-body-grid">
          <div className="col-span-12 md:col-span-9 md:col-start-4 md:row-start-2">
            <div className="approach-chip-grid">
              {approachItems.map((item) => (
                <div
                  key={item.key}
                  data-chip-key={item.key}
                  className={`approach-chip reveal-item reveal-delay-4${openChipKeyOnApproach === item.key ? " is-open" : ""}${dismissedHoverKey === item.key ? " is-hover-dismissed" : ""}`}
                  tabIndex={0}
                  role="button"
                  aria-expanded={openChipKeyOnApproach === item.key}
                  onMouseLeave={() => handleChipMouseLeave(item.key)}
                  onClick={() => toggleChip(item.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleChip(item.key);
                    }
                    if (e.key === "Escape") {
                      setOpenChipKey(null);
                    }
                  }}
                >
                  <div
                    className="approach-chip-head"
                    onClick={(event) => handleChipHeadClick(event, item.key)}
                  >
                    {item.label}
                  </div>
                  <div
                    className="approach-chip-detail"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="approach-chip-body" lang="ja">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
