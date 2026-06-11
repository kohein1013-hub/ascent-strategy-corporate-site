"use client";

import { useLayoutEffect, useRef } from "react";

import { mediaQueries } from "@/lib/breakpoints";
import { SECTION_INDEX } from "@/lib/sectionNavigation";
import { isSectionTrackTransitioning } from "@/lib/sectionTrackTransition";
import {
  FLOW_MARK_COLS,
  FOCUS_ROWS,
  getCrossBoundsBox,
  MESSAGE_EN_CROSS_BOUNDS_SP,
} from "@/lib/crossFocus";

type Props = {
  activeIndex?: number;
};

export function MessageSection({ activeIndex = 0 }: Props) {
  const shellRef = useRef<HTMLElement>(null);
  const enWrapRef = useRef<HTMLDivElement>(null);
  const wasMessageSectionRef = useRef(false);
  const prevActiveIndexRef = useRef(activeIndex);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const enWrap = enWrapRef.current;
    if (!shell || !enWrap || typeof window === "undefined") return;

    const mqFlow = window.matchMedia(mediaQueries.flow);
    let layoutRevealLockUntil = 0;

    const clearStyles = () => {
      enWrap.style.removeProperty("position");
      enWrap.style.removeProperty("left");
      enWrap.style.removeProperty("top");
      enWrap.style.removeProperty("width");
      enWrap.style.removeProperty("height");
      enWrap.style.removeProperty("right");
      enWrap.style.removeProperty("bottom");
      enWrap.style.removeProperty("margin-top");
      enWrap.style.removeProperty("max-width");
      enWrap.style.removeProperty("transform");
      enWrap.style.removeProperty("min-height");
    };

    const isMessageFrameActive = () => {
      const frame = shell.closest(".section-frame");
      return frame?.classList.contains("is-active") ?? false;
    };

    const isTrackAnimating = () =>
      document
        .querySelector(".section-track")
        ?.getAnimations()
        .some((anim) => anim.playState === "running") ?? false;

    const mqGrid = window.matchMedia(mediaQueries.grid);

    const sync = (force = false) => {
      if (!mqFlow.matches) {
        /* PC では message-entry-ready を維持（Hero 同型 ASMN リビール用） */
        if (!mqGrid.matches) {
          shell.classList.remove("message-entry-ready");
        }
        clearStyles();
        return;
      }

      if (!isMessageFrameActive()) {
        clearStyles();
        return;
      }

      if (!force && (Date.now() < layoutRevealLockUntil || isTrackAnimating())) return;

      const layoutShell = enWrap.closest(".section-shell--message") as HTMLElement | null;
      if (!layoutShell) {
        clearStyles();
        return;
      }

      const colCount = FLOW_MARK_COLS;
      const { leftFrac, topFrac, widthFrac, heightFrac } = getCrossBoundsBox(
        MESSAGE_EN_CROSS_BOUNDS_SP,
        colCount,
        FOCUS_ROWS - 1,
      );

      const root = document.documentElement;
      const crossInsetStr = getComputedStyle(root).getPropertyValue("--cross-inset").trim();
      const crossInset = crossInsetStr ? Number.parseFloat(crossInsetStr) : 30;
      const padStr = getComputedStyle(layoutShell).getPropertyValue("--message-en-cross-pad").trim();
      const pad = padStr ? Number.parseFloat(padStr) : 5;
      const offsetRightStr = getComputedStyle(layoutShell)
        .getPropertyValue("--message-en-sp-offset-right")
        .trim();
      const offsetRight = offsetRightStr ? Number.parseFloat(offsetRightStr) : 0;
      const offsetDownStr = getComputedStyle(layoutShell)
        .getPropertyValue("--message-en-sp-offset-down")
        .trim();
      const offsetDown = offsetDownStr ? Number.parseFloat(offsetDownStr) : 0;
      const insetRightStr = getComputedStyle(layoutShell)
        .getPropertyValue("--message-en-sp-inset-right")
        .trim();
      const insetRight = insetRightStr ? Number.parseFloat(insetRightStr) : 12;
      const sRect = layoutShell.getBoundingClientRect();
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const planeW = window.innerWidth - 2 * crossInset;
      const planeH = viewportH - 2 * crossInset;

      const gridLeft = crossInset + leftFrac * planeW + pad;
      const gridRight = crossInset + (leftFrac + widthFrac) * planeW - pad;
      /* 位置オフセットは左右まとめてずらし、横幅はグリッド幅を維持 */
      const leftV = gridLeft + offsetRight;
      const topV = crossInset + topFrac * planeH + pad + offsetDown;
      const rightV = gridRight - insetRight + offsetRight;
      const bottomV = crossInset + (topFrac + heightFrac) * planeH - pad;

      const offsetParent = enWrap.offsetParent as HTMLElement | null;
      const anchorRect = offsetParent?.getBoundingClientRect() ?? sRect;

      enWrap.style.position = "absolute";
      enWrap.style.left = `${Math.round(leftV - anchorRect.left)}px`;
      enWrap.style.top = `${Math.round(topV - anchorRect.top)}px`;
      enWrap.style.width = `${Math.round(Math.max(0, rightV - leftV))}px`;
      enWrap.style.height = `${Math.round(Math.max(0, bottomV - topV))}px`;
      enWrap.style.right = "auto";
      enWrap.style.bottom = "auto";
      enWrap.style.removeProperty("margin-top");
      enWrap.style.maxWidth = "none";

      layoutShell.dispatchEvent(new CustomEvent("message-en-layout"));
    };

    const markEntryReady = () => {
      sync(true);
      /* 英語配置 → ASMN 座標更新 → リビール（ガタつき防止） */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          shell.classList.add("message-entry-ready");
        });
      });
    };

    const runSyncSoon = (force = false) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => sync(force));
      });
    };

    const runReadySoon = () => {
      requestAnimationFrame(markEntryReady);
    };

    let exitResetOnTrackEnd: ((e: Event) => void) | undefined;

    if (mqFlow.matches && activeIndex === SECTION_INDEX.message) {
      shell.classList.remove("message-entry-ready");
    } else if (
      mqFlow.matches &&
      activeIndex !== SECTION_INDEX.message &&
      shell.classList.contains("message-entry-ready")
    ) {
      const trackEl = document.querySelector(".section-track");
      if (trackEl) {
        exitResetOnTrackEnd = (e: Event) => {
          const te = e as TransitionEvent;
          if (te.propertyName !== "transform" || te.target !== trackEl) return;
          trackEl.removeEventListener("transitionend", exitResetOnTrackEnd!);
          exitResetOnTrackEnd = undefined;
          shell.classList.remove("message-entry-ready");
          clearStyles();
        };
        trackEl.addEventListener("transitionend", exitResetOnTrackEnd);
      } else {
        shell.classList.remove("message-entry-ready");
        clearStyles();
      }
    }

    sync(true);

    const shellNode = enWrap.closest(".section-shell--message");
    const ro = new ResizeObserver(() => runSyncSoon(false));
    if (shellNode) ro.observe(shellNode);
    ro.observe(enWrap);
    const onResize = () => runSyncSoon(true);
    const onMqChange = () => {
      shell.classList.remove("message-entry-ready");
      runSyncSoon(true);
      if (mqFlow.matches) {
        requestAnimationFrame(() => {
          const running =
            track?.getAnimations().some((anim) => anim.playState === "running") ?? false;
          if (!running) runReadySoon();
        });
      }
    };

    window.addEventListener("resize", onResize);
    mqFlow.addEventListener("change", onMqChange);

    let io: IntersectionObserver | undefined;
    if (shellNode && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            runSyncSoon(false);
          }
        },
        { threshold: [0, 0.05, 0.15] },
      );
      io.observe(shellNode);
    }

    const track = document.querySelector(".section-track");

    const onTrackTransitionEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "transform" || te.target !== track) return;
      if (!mqFlow.matches) return;
      layoutRevealLockUntil = Date.now() + 500;
      runReadySoon();
    };

    track?.addEventListener("transitionend", onTrackTransitionEnd);

    if (mqFlow.matches) {
      requestAnimationFrame(() => {
        const running =
          track?.getAnimations().some((anim) => anim.playState === "running") ?? false;
        if (!running) runReadySoon();
      });
    }

    const readyFallbackId = mqFlow.matches
      ? window.setTimeout(() => {
          if (!shell.classList.contains("message-entry-ready")) runReadySoon();
        }, 780)
      : undefined;

    return () => {
      ro.disconnect();
      io?.disconnect();
      window.removeEventListener("resize", onResize);
      mqFlow.removeEventListener("change", onMqChange);
      track?.removeEventListener("transitionend", onTrackTransitionEnd);
      if (readyFallbackId !== undefined) window.clearTimeout(readyFallbackId);
      if (exitResetOnTrackEnd) {
        track?.removeEventListener("transitionend", exitResetOnTrackEnd);
      }
      /* スライド中は message-entry-ready を維持（離脱フラッシュ防止） */
      if (!mqGrid.matches && !isSectionTrackTransitioning()) {
        shell.classList.remove("message-entry-ready");
      }
      if (!isSectionTrackTransitioning()) {
        clearStyles();
      }
    };
  }, [activeIndex]);

  /*
   * PC Message: Hero と同型（hero-entry-ready 相当 → hero-asmn-reveal・opacity のみ 0.4s）。
   */
  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof window === "undefined") return;

    const mqGrid = window.matchMedia(mediaQueries.grid);
    const isMessageSection = activeIndex === SECTION_INDEX.message;
    const track = document.querySelector(".section-track");

    const isTrackAnimating = () =>
      track?.getAnimations().some((anim) => anim.playState === "running") ?? false;

    /* .section-track の transform 1.02s より少し早くリビール開始 */
    const SECTION_SLIDE_MS = 1020;
    /**
     * Hero / SERVICE とも同一リード（Hero 侵入時の縦位置に統一）。
     * 途中すぎると縦ズレのため transitionend より短めのみ。
     */
    const MESSAGE_ASM_REVEAL_LEAD_MS = 140;

    const notifyPcLayout = () => {
      shell.dispatchEvent(
        new CustomEvent("message-pc-layout", { detail: { sync: true } }),
      );
    };

    /* 座標は非表示のうちに1回だけ確定 → フェード（途中の再配置でガタつき防止） */
    const beginAsmReveal = () => {
      if (shell.classList.contains("message-entry-ready")) return;

      /*
       * 縦位置は Hero 侵入時と同型の計測（再訪問でも measure-visited でレイアウトを確定してから lock）。
       */
      shell.classList.add("message-pc-measure-visited");
      notifyPcLayout();
      void shell.offsetHeight;
      shell.classList.remove("message-pc-measure-visited");
      /* 座標確定後は MESSAGE 離脱まで再配置しない */
      shell.setAttribute("data-message-asm-lock", "");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (activeIndex !== SECTION_INDEX.message) return;
          shell.classList.add("message-entry-ready");
        });
      });
    };

    const runReadySoon = () => {
      beginAsmReveal();
    };

    const scheduleRevealIfStable = () => {
      requestAnimationFrame(() => {
        if (shell.classList.contains("message-entry-ready")) return;
        /* Hero / SERVICE ともスライド静止後のみ（途中計測で縦ズレ） */
        if (!isTrackAnimating()) {
          runReadySoon();
        }
      });
    };

    const onTrackTransitionEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "transform" || te.target !== track) return;
      if (!isMessageSection || !mqGrid.matches) return;
      if (shell.classList.contains("message-entry-ready")) return;
      runReadySoon();
    };

    if (!mqGrid.matches) {
      wasMessageSectionRef.current = false;
      return;
    }

    if (isMessageSection) {
      const enteredFromHero = prevActiveIndexRef.current === SECTION_INDEX.top;
      prevActiveIndexRef.current = activeIndex;

      /* Hero→MESSAGE は毎回フェード（visited スキップしない） */
      if (enteredFromHero) {
        shell.classList.remove("message-pc-visited");
      }

      shell.classList.remove("message-entry-ready");
      shell.classList.remove("message-pc-measure-visited");
      shell.removeAttribute("data-message-asm-lock");

      const asmRevealLeadMs = MESSAGE_ASM_REVEAL_LEAD_MS;

      scheduleRevealIfStable();

      /*
       * Hero→MESSAGE: スライド終了直前まで待つと約 1s 空白になるため、侵入直後（140ms）にリビール開始。
       * 他セクションからは従来どおりスライド後半で計測（縦ズレ防止）。
       */
      const revealDelayMs = enteredFromHero
        ? asmRevealLeadMs
        : Math.max(0, SECTION_SLIDE_MS - asmRevealLeadMs);

      const revealLeadId = window.setTimeout(() => {
        if (
          activeIndex === SECTION_INDEX.message &&
          !shell.classList.contains("message-entry-ready")
        ) {
          runReadySoon();
        }
      }, revealDelayMs);

      track?.addEventListener("transitionend", onTrackTransitionEnd);

      const readyFallbackId = window.setTimeout(() => {
        if (
          activeIndex === SECTION_INDEX.message &&
          !shell.classList.contains("message-entry-ready")
        ) {
          runReadySoon();
        }
      }, SECTION_SLIDE_MS + 120);

      wasMessageSectionRef.current = true;

      return () => {
        track?.removeEventListener("transitionend", onTrackTransitionEnd);
        window.clearTimeout(revealLeadId);
        window.clearTimeout(readyFallbackId);
        shell.removeAttribute("data-message-asm-lock");
        shell.classList.remove("message-pc-measure-visited");
      };
    }

    track?.removeEventListener("transitionend", onTrackTransitionEnd);

    prevActiveIndexRef.current = activeIndex;

    if (wasMessageSectionRef.current) {
      shell.classList.add("message-pc-visited");
    }
    shell.classList.remove("message-entry-ready");
    shell.classList.remove("message-pc-measure-visited");
    shell.removeAttribute("data-message-asm-lock");
    wasMessageSectionRef.current = false;

    return undefined;
  }, [activeIndex]);

  return (
    <section ref={shellRef} className="section-shell section-shell--message">
      <div className="message-titles-stack">
        <div className="message-titles-axis">
          <h2 className="message-heading reveal-item reveal-delay-2 message-unified-reveal">
            Message
          </h2>
          <h3 className="message-tagline reveal-item reveal-delay-3 message-unified-reveal">
            「財務戦略」を、経営の中心に。
          </h3>
        </div>
      </div>

      <div className="message-body">
        <div className="content-grid message-body-grid">
          <div className="message-col message-col--jp col-span-12 md:row-start-2 reveal-item reveal-delay-4 message-unified-reveal">
            <div className="message-jp-axis">
              <p className="lead message-jp-text">
                すべての経営判断の起点には、財務の意思決定があります。私たちAscent strategyは、外部のコンサルティングパートナーとして、こうした意思決定に確かな根拠と複数の選択肢をご提供します。創業期の小さな挑戦から、世代を超えた事業承継まで、すべての「上昇」に寄り添い、確かな戦略をお届けしてまいります。
              </p>
              <p className="message-signature reveal-item">
                代表取締役 加藤 美沙
              </p>
            </div>
          </div>

          <div
            ref={enWrapRef}
            className="message-col message-col--en message-en-wrap col-span-12 md:col-span-4 md:col-start-9 md:row-start-3 reveal-item reveal-delay-4"
            lang="en"
          >
            <div className="message-en-reveal reveal-item reveal-delay-4 message-unified-reveal">
              <p className="message-en-lead">
                Putting financial strategy at the heart of management.
              </p>
              <p className="message-en-body">
                Every management decision begins with a financial decision.
              </p>
              <p className="message-en-body message-en-body--support">
                As your external consulting partner, Ascent strategy provides sound
                evidence and multiple options for these decisions. From early-stage
                ventures to succession across generations, we stand by every
                &quot;ascent&quot; and deliver strategies you can rely on.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
