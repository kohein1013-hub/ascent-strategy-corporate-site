"use client";

import {
  type MouseEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { AsmCrossEyebrow } from "@/components/ui/AsmCrossEyebrow";
import { mediaQueries } from "@/lib/breakpoints";
import {
  FLOW_MARK_COLS,
  FOCUS_ROWS,
  getCrossBoundsBox,
  NETWORK_CONTENT_BOUNDS_PC,
  NETWORK_CONTENT_BOUNDS_SP,
} from "@/lib/crossFocus";
import { SECTION_INDEX } from "@/lib/sectionNavigation";
import { isSectionTrackTransitioning } from "@/lib/sectionTrackTransition";
import { usePcShellAsmHeroReveal } from "@/lib/usePcShellAsmHeroReveal";

function subscribePcGrid(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const mq = window.matchMedia(mediaQueries.grid);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getPcGridSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(mediaQueries.grid).matches;
}

/** タイトル帯リビール（keyframes 0.7s）+ 余裕 */
const NETWORK_TITLES_REVEAL_LOCK_MS = 1100;
/** Approach チップと同型（reveal-delay-4 = 0.38s） */
const NETWORK_PC_LEFT_REVEAL_DELAY_MS = 380;

const networkIntro =
  "Ascent strategyは、以下の専門家と業務提携体制を整えています。法務・税務・労務・知財などの個別具体的なご相談は、提携専門家を通じて適切に対応します。";

const networkItems = [
  {
    key: "lawyer",
    label: "弁護士事務所",
    body: "契約書レビュー・法務デューデリジェンス・紛争対応",
  },
  {
    key: "tax",
    label: "税理士事務所",
    body: "税務申告・税務デューデリジェンス・税務ストラクチャー検討",
  },
  {
    key: "cpa",
    label: "公認会計士",
    body: "財務デューデリジェンス・企業価値評価",
  },
  {
    key: "social-labor",
    label: "社会保険労務士事務所",
    body: "雇用関係助成金・労務管理",
  },
  {
    key: "judicial-scrivener",
    label: "司法書士",
    body: "登記・株式関連手続き",
  },
  {
    key: "administrative",
    label: "行政書士",
    body: "許認可・官公署提出書類",
  },
] as const;

export function NetworkSection({ activeIndex = 0 }: { activeIndex?: number }) {
  const shellRef = useRef<HTMLElement>(null);
  const isPcGrid = useSyncExternalStore(subscribePcGrid, getPcGridSnapshot, () => false);

  usePcShellAsmHeroReveal({
    shellRef,
    activeIndex,
    sectionIndex: SECTION_INDEX.network,
    readyClass: "network-pc-asm-ready",
    lockAttr: "data-network-pc-asm-lock",
    visitedClass: "network-pc-asm-visited",
    layoutEventName: "network-titles-layout",
    finalizeDatasetKey: "networkAsmFinalize",
  });

  const contentColumnRef = useRef<HTMLDivElement>(null);
  const [openChipKey, setOpenChipKey] = useState<string | null>(null);
  const [dismissedHoverKey, setDismissedHoverKey] = useState<string | null>(null);

  const openChipKeyOnNetwork =
    activeIndex === SECTION_INDEX.network ? openChipKey : null;

  const toggleChip = useCallback((key: string) => {
    setDismissedHoverKey(null);
    setOpenChipKey((prev) => (prev === key ? null : key));
  }, []);

  const handleChipHeadClick = useCallback(
    (event: MouseEvent<HTMLDivElement>, key: string) => {
      const chip = event.currentTarget.closest(".network-chip") as HTMLElement | null;
      const isOpen = openChipKeyOnNetwork === key;

      if (isOpen) {
        event.stopPropagation();
        setOpenChipKey(null);
        setDismissedHoverKey(key);
        chip?.blur();
        return;
      }

      const canFineHover =
        typeof window !== "undefined" &&
        window.matchMedia(mediaQueries.fineHover).matches;
      if (canFineHover && event.currentTarget.matches(":hover")) {
        event.stopPropagation();
        setDismissedHoverKey(key);
        chip?.blur();
      }
    },
    [openChipKeyOnNetwork],
  );

  const handleChipMouseLeave = useCallback((key: string) => {
    setDismissedHoverKey((prev) => (prev === key ? null : prev));
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const shell = shellRef.current;
    const contentCol = contentColumnRef.current;
    if (!shell || !contentCol) return;

    const mqFlow = window.matchMedia(mediaQueries.flow);
    const mqGrid = window.matchMedia(mediaQueries.grid);
    let layoutRevealLockUntil = 0;
    let titlesRevealArmed = false;
    let networkPcEntryAt = 0;
    let pcLeftRevealDelayId: number | undefined;

    const isNetworkFrameActive = () => {
      const frame = shell.closest(".section-frame");
      return frame?.classList.contains("is-active") ?? false;
    };

    const clearContentStyles = () => {
      contentCol.style.removeProperty("position");
      contentCol.style.removeProperty("left");
      contentCol.style.removeProperty("top");
      contentCol.style.removeProperty("width");
      contentCol.style.removeProperty("height");
      contentCol.style.removeProperty("max-height");
      contentCol.style.removeProperty("right");
      contentCol.style.removeProperty("bottom");
      contentCol.style.removeProperty("max-width");
      contentCol.style.removeProperty("transform");
      shell.style.removeProperty("--network-body-base-margin-down");
      const body = shell.querySelector(".network-body") as HTMLElement | null;
      body?.style.removeProperty("margin-top");
    };

    const syncPcContentBounds = () => {
      const { leftFrac, topFrac, widthFrac, heightFrac } = getCrossBoundsBox(
        NETWORK_CONTENT_BOUNDS_PC,
        FLOW_MARK_COLS,
        FOCUS_ROWS - 1,
      );

      const root = document.documentElement;
      const crossInsetStr = getComputedStyle(root).getPropertyValue("--cross-inset").trim();
      const crossInset = crossInsetStr ? Number.parseFloat(crossInsetStr) : 30;

      const shellRect = shell.getBoundingClientRect();
      const viewportH =
        window.visualViewport?.height ??
        document.documentElement.clientHeight ??
        window.innerHeight;
      const planeW = window.innerWidth - 2 * crossInset;
      const planeH = Math.max(shellRect.height, viewportH) - 2 * crossInset;

      const gridLeft = crossInset + leftFrac * planeW;
      const gridRight = crossInset + (leftFrac + widthFrac) * planeW;
      const gridTopV = crossInset + topFrac * planeH;
      const gridBottomV = crossInset + (topFrac + heightFrac) * planeH;
      const centerX = (gridLeft + gridRight) / 2;
      const centerY = (gridTopV + gridBottomV) / 2;

      const offsetParent = contentCol.offsetParent as HTMLElement | null;
      const anchorRect = offsetParent?.getBoundingClientRect() ?? shellRect;
      const colW = contentCol.offsetWidth;
      const colH = contentCol.offsetHeight;

      contentCol.style.position = "absolute";
      contentCol.style.left = `${Math.round(centerX - anchorRect.left - colW / 2)}px`;
      contentCol.style.top = `${Math.round(centerY - anchorRect.top - colH / 2)}px`;
      contentCol.style.right = "auto";
      contentCol.style.bottom = "auto";
      contentCol.style.removeProperty("width");
      contentCol.style.removeProperty("max-width");
      contentCol.style.removeProperty("max-height");
      contentCol.style.removeProperty("height");
      contentCol.style.removeProperty("transform");
    };

    const tryMarkPcContentReady = () => {
      if (!mqGrid.matches || activeIndex !== SECTION_INDEX.network || !isNetworkFrameActive()) {
        return;
      }
      if (isSectionTrackTransitioning() || isTrackAnimating()) {
        return;
      }
      const topPx = Number.parseFloat(contentCol.style.top);
      if (
        contentCol.style.position !== "absolute" ||
        Number.isNaN(topPx) ||
        topPx < -200
      ) {
        return;
      }
      if (
        shell.classList.contains("network-pc-content-ready") &&
        shell.classList.contains("network-pc-reveal-go")
      ) {
        return;
      }

      void contentCol.offsetHeight;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (activeIndex !== SECTION_INDEX.network || !isNetworkFrameActive()) return;
          if (isSectionTrackTransitioning() || isTrackAnimating()) return;
          const top = Number.parseFloat(contentCol.style.top);
          if (contentCol.style.position !== "absolute" || Number.isNaN(top) || top < -200) {
            return;
          }
          shell.classList.add("network-pc-content-ready");
          shell.classList.remove("network-pc-reveal-go");
          void shell.offsetHeight;
          const elapsed = Date.now() - networkPcEntryAt;
          const remaining = Math.max(0, NETWORK_PC_LEFT_REVEAL_DELAY_MS - elapsed);
          if (pcLeftRevealDelayId !== undefined) {
            window.clearTimeout(pcLeftRevealDelayId);
          }
          pcLeftRevealDelayId = window.setTimeout(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (activeIndex !== SECTION_INDEX.network || !isNetworkFrameActive()) return;
                shell.classList.add("network-pc-reveal-go");
              });
            });
          }, remaining);
        });
      });
    };

    const syncContentBounds = (force = false) => {
      const frame = shell.closest(".section-frame");
      if (!frame?.classList.contains("is-active")) return;

      if (mqGrid.matches) {
        if (activeIndex !== SECTION_INDEX.network) {
          clearContentStyles();
          return;
        }
        syncPcContentBounds();
        tryMarkPcContentReady();
        return;
      }

      if (!mqFlow.matches) {
        clearContentStyles();
        return;
      }

      if (!force && Date.now() < layoutRevealLockUntil) return;

      const { leftFrac, topFrac, widthFrac, heightFrac } = getCrossBoundsBox(
        NETWORK_CONTENT_BOUNDS_SP,
        FLOW_MARK_COLS,
        FOCUS_ROWS - 1,
      );

      const root = document.documentElement;
      const crossInsetStr = getComputedStyle(root).getPropertyValue("--cross-inset").trim();
      const crossInset = crossInsetStr ? Number.parseFloat(crossInsetStr) : 30;

      const cs = getComputedStyle(shell);
      const padStr = cs.getPropertyValue("--network-content-cross-pad").trim();
      const pad = padStr ? Number.parseFloat(padStr) : 4;
      const widthScaleStr = cs.getPropertyValue("--network-content-width-scale").trim();
      const widthScale = widthScaleStr ? Number.parseFloat(widthScaleStr) : 1.2;
      const offsetDownStr = cs.getPropertyValue("--network-content-offset-down").trim();
      const offsetDown = offsetDownStr ? Number.parseFloat(offsetDownStr) : 0;
      const insetRightStr = cs.getPropertyValue("--network-content-inset-right").trim();
      const insetRight = insetRightStr ? Number.parseFloat(insetRightStr) : 0;

      const shellRect = shell.getBoundingClientRect();
      const viewportH =
        window.visualViewport?.height ??
        document.documentElement.clientHeight ??
        window.innerHeight;
      const planeW = window.innerWidth - 2 * crossInset;
      const planeH = Math.max(shellRect.height, viewportH) - 2 * crossInset;

      const gridLeft = crossInset + leftFrac * planeW + pad;
      const gridRight = crossInset + (leftFrac + widthFrac) * planeW - pad - insetRight;
      const gridTopV = crossInset + topFrac * planeH + pad + offsetDown;
      const gridBottomV = crossInset + (topFrac + heightFrac) * planeH - pad;
      const viewportBottomV = viewportH - crossInset - pad;

      const topV = gridTopV;

      const reserveStr = cs.getPropertyValue("--network-content-bottom-reserve").trim();
      const reserve = reserveStr ? Number.parseFloat(reserveStr) : 0;
      const bottomV = Math.min(
        gridBottomV,
        viewportBottomV - (Number.isNaN(reserve) ? 0 : reserve),
      );

      const baseWidth = Math.max(0, gridRight - gridLeft);
      const widthV = baseWidth * widthScale;
      const maxHeight = Math.max(0, bottomV - topV);

      const offsetParent = contentCol.offsetParent as HTMLElement | null;
      const anchorRect = offsetParent?.getBoundingClientRect() ?? shellRect;

      contentCol.style.position = "absolute";
      contentCol.style.left = `${Math.round(gridLeft - anchorRect.left)}px`;
      contentCol.style.top = `${Math.round(topV - anchorRect.top)}px`;
      contentCol.style.width = `${Math.round(widthV)}px`;
      contentCol.style.maxWidth = "none";
      contentCol.style.maxHeight = `${Math.round(maxHeight)}px`;
      contentCol.style.right = "auto";
      contentCol.style.bottom = "auto";
      contentCol.style.removeProperty("transform");

      shell.style.setProperty("--network-body-base-margin-down", "0px");
    };

    const armRevealLayoutLock = () => {
      layoutRevealLockUntil = Date.now() + NETWORK_TITLES_REVEAL_LOCK_MS;
    };

    const notifyTitlesLayout = (sync = false) => {
      if (!mqFlow.matches) return;
      shell.dispatchEvent(
        new CustomEvent("network-titles-layout", { detail: { sync } }),
      );
    };

    const markNetworkEntryReady = () => {
      if (!mqFlow.matches) {
        shell.classList.remove("network-layout-ready", "network-titles-reveal-go");
        shell.removeAttribute("data-network-asm-lock");
        delete shell.dataset.networkAsmFinalize;
        titlesRevealArmed = false;
        return;
      }
      if (titlesRevealArmed || shell.classList.contains("network-titles-reveal-go")) {
        return;
      }

      syncContentBounds(true);

      /* 計測用フラグ → AsmCrossEyebrow で幅を取ってから座標確定（Approach 同型） */
      shell.dataset.networkAsmFinalize = "1";
      notifyTitlesLayout(true);
      delete shell.dataset.networkAsmFinalize;

      shell.classList.add("network-layout-ready");
      notifyTitlesLayout(true);

      titlesRevealArmed = true;
      void shell.offsetHeight;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          shell.classList.add("network-titles-reveal-go");
          shell.setAttribute("data-network-asm-lock", "");
          notifyTitlesLayout(true);
          armRevealLayoutLock();
          window.setTimeout(() => {
            shell.removeAttribute("data-network-asm-lock");
          }, NETWORK_TITLES_REVEAL_LOCK_MS);
        });
      });
    };

    const runReadySoon = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(markNetworkEntryReady);
      });
    };

    const runSoon = (options?: { markEntryReady?: boolean }) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (options?.markEntryReady) {
            markNetworkEntryReady();
          } else {
            syncContentBounds(false);
          }
        });
      });
    };

    const isTrackAnimating = () =>
      document
        .querySelector(".section-track")
        ?.getAnimations()
        .some((anim) => anim.playState === "running") ?? false;

    const resetNetworkVisualState = () => {
      clearContentStyles();
      shell.classList.remove(
        "network-layout-ready",
        "network-titles-reveal-go",
        "network-pc-content-ready",
        "network-pc-reveal-go",
      );
      shell.removeAttribute("data-network-asm-lock");
      delete shell.dataset.networkAsmFinalize;
      titlesRevealArmed = false;
    };

    let exitResetOnTrackEnd: ((e: Event) => void) | undefined;
    const track = document.querySelector(".section-track");

    if (activeIndex === SECTION_INDEX.network) {
      if (mqGrid.matches) {
        networkPcEntryAt = Date.now();
        shell.classList.remove("network-pc-content-ready", "network-pc-reveal-go");
      }
      /* 再表示防止: 確定済みなら reveal-go を外さない（消えてから入り直す見え方を防ぐ） */
      if (!shell.classList.contains("network-layout-ready")) {
        shell.classList.remove("network-titles-reveal-go");
        titlesRevealArmed = false;
      }
    } else if (
      shell.classList.contains("network-layout-ready") ||
      shell.classList.contains("network-titles-reveal-go")
    ) {
      const trackEl = document.querySelector(".section-track");
      if (trackEl) {
        exitResetOnTrackEnd = (e: Event) => {
          const te = e as TransitionEvent;
          if (te.propertyName !== "transform" || te.target !== trackEl) return;
          trackEl.removeEventListener("transitionend", exitResetOnTrackEnd!);
          exitResetOnTrackEnd = undefined;
          resetNetworkVisualState();
        };
        trackEl.addEventListener("transitionend", exitResetOnTrackEnd);
      } else {
        resetNetworkVisualState();
      }
    }

    const suppressNetworkLayout = activeIndex !== SECTION_INDEX.network;

    if (activeIndex === SECTION_INDEX.network && mqFlow.matches) {
      /* 侵入直後の runSoon は本文計測のみ先行し ASMN が揺れるため、初回リビールは markEntryReady に一本化 */
      if (!shell.classList.contains("network-layout-ready")) {
        requestAnimationFrame(() => {
          if (!isTrackAnimating() && !shell.classList.contains("network-titles-reveal-go")) {
            runReadySoon();
          }
        });
      }
    }

    if (activeIndex === SECTION_INDEX.network && mqGrid.matches) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncContentBounds(true);
        });
      });
    }

    const networkBody = shell.querySelector(".network-body");
    const intro = shell.querySelector(".network-intro");
    const chipGrid = shell.querySelector(".network-chip-grid");
    const firstChip = shell.querySelector(
      '.network-chip-grid .network-chip[data-chip-key="lawyer"]',
    );

    const scheduleLayout = () => {
      if (suppressNetworkLayout || isSectionTrackTransitioning()) return;
      if (mqGrid.matches) {
        if (activeIndex === SECTION_INDEX.network) {
          runSoon();
        }
        return;
      }
      if (shell.hasAttribute("data-network-asm-lock")) return;
      if (Date.now() < layoutRevealLockUntil) return;
      if (
        activeIndex === SECTION_INDEX.network &&
        !shell.classList.contains("network-titles-reveal-go")
      ) {
        return;
      }
      runSoon();
    };

    const ro = new ResizeObserver(scheduleLayout);
    ro.observe(contentCol);
    if (networkBody) ro.observe(networkBody);
    if (intro) ro.observe(intro);
    if (chipGrid) ro.observe(chipGrid);
    if (firstChip) ro.observe(firstChip);
    const onMqChange = () => {
      if (!mqFlow.matches) {
        shell.classList.remove("network-layout-ready", "network-titles-reveal-go");
        if (!mqGrid.matches) {
          clearContentStyles();
        }
      }
      scheduleLayout();
    };

    window.addEventListener("resize", scheduleLayout);
    mqFlow.addEventListener("change", onMqChange);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", scheduleLayout);
    vv?.addEventListener("scroll", scheduleLayout);

    const onTrackTransitionEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "transform" || te.target !== track) return;
      if (!mqFlow.matches) {
        runSoon();
        tryMarkPcContentReady();
        return;
      }
      const frame = shell.closest(".section-frame");
      if (!frame?.classList.contains("is-active")) {
        return;
      }
      if (!shell.classList.contains("network-titles-reveal-go")) {
        runReadySoon();
      }
    };
    track?.addEventListener("transitionend", onTrackTransitionEnd);

    const readyFallbackId = mqFlow.matches
      ? window.setTimeout(() => {
          const frame = shell.closest(".section-frame");
          if (
            activeIndex === SECTION_INDEX.network &&
            frame?.classList.contains("is-active") &&
            !shell.classList.contains("network-titles-reveal-go")
          ) {
            markNetworkEntryReady();
          }
        }, 900)
      : undefined;

    let activeIo: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      activeIo = new IntersectionObserver(
        (entries) => {
          if (
            !suppressNetworkLayout &&
            !isSectionTrackTransitioning() &&
            entries.some((e) => e.isIntersecting && e.intersectionRatio > 0.2)
          ) {
            scheduleLayout();
          }
        },
        { threshold: [0, 0.2, 0.5] },
      );
      activeIo.observe(shell);
    }

    return () => {
      activeIo?.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", scheduleLayout);
      mqFlow.removeEventListener("change", onMqChange);
      vv?.removeEventListener("resize", scheduleLayout);
      vv?.removeEventListener("scroll", scheduleLayout);
      track?.removeEventListener("transitionend", onTrackTransitionEnd);
      if (pcLeftRevealDelayId !== undefined) {
        window.clearTimeout(pcLeftRevealDelayId);
      }
      if (readyFallbackId !== undefined) window.clearTimeout(readyFallbackId);
      if (exitResetOnTrackEnd) {
        track?.removeEventListener("transitionend", exitResetOnTrackEnd);
      }
    };
  }, [activeIndex]);

  return (
    <section ref={shellRef} className="section-shell network-shell">
      <div className="network-stack">
        <div className="message-titles-stack">
          <div className="asm-cross-eyebrow-slot network-asmn-slot col-span-12 md:col-span-3 md:col-start-1 md:row-start-1">
            <AsmCrossEyebrow
              activeIndex={activeIndex}
              className={
                isPcGrid
                  ? "reveal-item hero-bilingual-reveal"
                  : "reveal-item network-unified-asmn"
              }
            >
              ASMN 004.
            </AsmCrossEyebrow>
          </div>
          <div className="message-titles-axis">
            <div className="network-heading-axis">
              <h2 className="message-heading reveal-item reveal-delay-2">Network</h2>
            </div>
            <div className="network-tagline-axis">
              <h3 className="message-tagline reveal-item reveal-delay-3">
                各分野の専門家と連携し、
                <br className="network-tagline-break-sp" />
                企業の課題に総合的に対応します。
              </h3>
            </div>
          </div>
        </div>

        <div className="network-body">
          <div className="content-grid message-body-grid network-body-grid">
            <div
              ref={contentColumnRef}
              className="network-content-column col-span-12 md:col-span-12 md:col-start-1 md:row-start-1"
            >
              <p className="lead network-intro reveal-item reveal-delay-4">
                {networkIntro}
              </p>

              <p className="network-list-kicker reveal-item reveal-delay-4">→ 提携専門家</p>

              <ul className="network-list reveal-item reveal-delay-4" role="list">
                {networkItems.map((item) => (
                  <li
                    key={`pc-${item.key}`}
                    data-network-key={item.key}
                    className="network-list-row"
                    tabIndex={0}
                  >
                    <span className="network-list-label">{item.label}</span>
                    <p className="network-list-detail">{item.body}</p>
                  </li>
                ))}
              </ul>

              <div className="network-chip-grid">
                {networkItems.map((item) => (
                  <div
                    key={item.key}
                    data-chip-key={item.key}
                    className={`network-chip reveal-item reveal-delay-4${openChipKeyOnNetwork === item.key ? " is-open" : ""}${dismissedHoverKey === item.key ? " is-hover-dismissed" : ""}`}
                    tabIndex={0}
                    role="button"
                    aria-expanded={openChipKeyOnNetwork === item.key}
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
                      className="network-chip-head"
                      onMouseLeave={() => handleChipMouseLeave(item.key)}
                      onClick={(event) => handleChipHeadClick(event, item.key)}
                    >
                      {item.label}
                    </div>
                    <div
                      className="network-chip-detail"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="network-chip-body" lang="ja">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
