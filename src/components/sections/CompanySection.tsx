"use client";

import { type CSSProperties, useLayoutEffect, useRef } from "react";

import { mediaQueries } from "@/lib/breakpoints";
import {
  freezeAppViewportForSection,
  releaseAppViewportSectionFreeze,
} from "@/lib/appViewportHeightFreeze";
import {
  clearSpTitleBandLayoutLock,
  lockSpTitleBandLayout,
} from "@/lib/lockSpTitleBandLayout";
import { SECTION_INDEX } from "@/lib/sectionNavigation";
import { isSectionTrackTransitioning } from "@/lib/sectionTrackTransition";

/** タイトル帯リビール（keyframes 0.7s）+ 余裕 */
const COMPANY_TITLES_REVEAL_LOCK_MS = 1100;
const COMPANY_ENTRY_READY_CLASS = "company-entry-ready";

const companyRows = [
  {
    key: "name",
    label: "会社名",
    value: "株式会社 Ascent strategy",
  },
  {
    key: "representative",
    label: "代表者",
    value: "加藤　美沙",
  },
  {
    key: "address",
    label: "所在地",
    value: "〒103-0022 東京都中央区日本橋室町1丁目11番12号　日本橋水野ビル7階",
  },
  {
    key: "business",
    label: "事業内容",
    value: "財務コンサルティング / 補助金活用支援 / M&Aアドバイザリー / 営業戦略・営業支援",
  },
  {
    key: "partners",
    label: "提携専門家",
    value: "弁護士 / 税理士 / 公認会計士 / 社会保険労務士 / 司法書士 / 行政書士",
  },
] as const;

export function CompanySection({ activeIndex = 0 }: { activeIndex?: number }) {
  const shellRef = useRef<HTMLElement>(null);
  const titlesRevealArmedRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const shell = shellRef.current;
    if (!shell) return;

    const mqFlow = window.matchMedia(mediaQueries.flow);
    let cancelled = false;

    const clearCompanyTitleRevealState = () => {
      releaseAppViewportSectionFreeze();
      shell.classList.remove(COMPANY_ENTRY_READY_CLASS);
      shell.removeAttribute("data-company-asm-lock");
      clearSpTitleBandLayoutLock(shell);
      shell
        .querySelectorAll(".company-unified-asmn, .company-title-unified")
        .forEach((el) => el.classList.remove("company-titles-revealed"));
      titlesRevealArmedRef.current = false;
    };

    const markCompanyEntryReady = () => {
      if (cancelled) return;
      if (!mqFlow.matches) {
        clearCompanyTitleRevealState();
        return;
      }
      const frame = shell.closest(".section-frame");
      if (!frame?.classList.contains("is-active")) {
        return;
      }
      if (
        titlesRevealArmedRef.current ||
        shell.classList.contains(COMPANY_ENTRY_READY_CLASS)
      ) {
        return;
      }

      freezeAppViewportForSection("company");
      titlesRevealArmedRef.current = true;

      const titleEls = shell.querySelectorAll(
        ".company-unified-asmn, .company-title-unified",
      );

      titleEls.forEach((node) => {
        const el = node as HTMLElement;
        el.style.removeProperty("visibility");
        el.style.removeProperty("opacity");
        el.style.removeProperty("pointer-events");
      });
      const onTitleRevealEnd = (e: Event) => {
        const ae = e as AnimationEvent;
        if (ae.animationName !== "company-titles-unified-reveal") return;
        (ae.currentTarget as HTMLElement).classList.add("company-titles-revealed");
      };
      titleEls.forEach((el) => {
        (el as HTMLElement).getAnimations().forEach((anim) => anim.cancel());
        el.classList.remove("company-titles-revealed");
        el.addEventListener("animationend", onTitleRevealEnd, { once: true });
      });

      shell.setAttribute("data-company-asm-lock", "");
      lockSpTitleBandLayout(shell);
      shell.classList.add(COMPANY_ENTRY_READY_CLASS);
      void shell.offsetHeight;
      window.setTimeout(() => {
        shell.removeAttribute("data-company-asm-lock");
      }, COMPANY_TITLES_REVEAL_LOCK_MS);
    };

    const resetCompanyTitleReveal = () => {
      clearCompanyTitleRevealState();
    };

    const runReadySoon = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) markCompanyEntryReady();
        });
      });
    };

    let exitResetOnTrackEnd: ((e: Event) => void) | undefined;
    let readyFallbackId: number | undefined;

    if (activeIndex === SECTION_INDEX.company && mqFlow.matches) {
      clearCompanyTitleRevealState();
      if (!isSectionTrackTransitioning()) {
        requestAnimationFrame(() => {
          if (
            !cancelled &&
            !isSectionTrackTransitioning() &&
            !shell.classList.contains(COMPANY_ENTRY_READY_CLASS)
          ) {
            runReadySoon();
          }
        });
      }
    } else if (shell.classList.contains(COMPANY_ENTRY_READY_CLASS)) {
      const trackEl = document.querySelector(".section-track");
      if (trackEl) {
        exitResetOnTrackEnd = (e: Event) => {
          const te = e as TransitionEvent;
          if (te.propertyName !== "transform" || te.target !== trackEl) return;
          trackEl.removeEventListener("transitionend", exitResetOnTrackEnd!);
          exitResetOnTrackEnd = undefined;
          resetCompanyTitleReveal();
        };
        trackEl.addEventListener("transitionend", exitResetOnTrackEnd);
      } else {
        resetCompanyTitleReveal();
      }
    }

    const track = document.querySelector(".section-track");
    const onTrackTransitionEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "transform" || te.target !== track) return;
      if (!mqFlow.matches) return;
      if (activeIndex !== SECTION_INDEX.company) return;
      const frame = shell.closest(".section-frame");
      if (!frame?.classList.contains("is-active")) return;
      if (!shell.classList.contains(COMPANY_ENTRY_READY_CLASS)) {
        runReadySoon();
      }
    };
    track?.addEventListener("transitionend", onTrackTransitionEnd);

    if (mqFlow.matches && activeIndex === SECTION_INDEX.company) {
      readyFallbackId = window.setTimeout(() => {
        const frame = shell.closest(".section-frame");
        if (
          activeIndex === SECTION_INDEX.company &&
          frame?.classList.contains("is-active") &&
          !shell.classList.contains(COMPANY_ENTRY_READY_CLASS)
        ) {
          markCompanyEntryReady();
        }
      }, 900);
    }

    const mqListener = () => {
      if (!mqFlow.matches) {
        resetCompanyTitleReveal();
      }
    };
    mqFlow.addEventListener("change", mqListener);

    return () => {
      cancelled = true;
      if (readyFallbackId !== undefined) window.clearTimeout(readyFallbackId);
      track?.removeEventListener("transitionend", onTrackTransitionEnd);
      mqFlow.removeEventListener("change", mqListener);
      if (exitResetOnTrackEnd) {
        track?.removeEventListener("transitionend", exitResetOnTrackEnd);
      }
    };
  }, [activeIndex]);

  return (
    <section ref={shellRef} className="section-shell company-shell">
      <div className="company-stack">
        <div className="message-titles-stack">
          <div className="message-titles-axis">
            <h2 className="message-heading reveal-item reveal-delay-2 company-title-unified">
              Company
            </h2>
            <h3 className="message-tagline reveal-item reveal-delay-3 company-title-unified">
              会社情報
            </h3>
          </div>
        </div>

        <div className="company-body">
          <div className="company-table-wrap">
            <div className="company-table-lines" aria-hidden>
              {[1, 2, 3, 4, 5, 6, 7].map((lineRow) => (
                <span
                  key={`h-${lineRow}`}
                  className={`company-table-line-h${lineRow === 7 ? " is-from-right" : ""}`}
                  style={{ "--line-row": lineRow } as CSSProperties}
                />
              ))}
              {[1, 3, 7].map((lineCol, index) => (
                <span
                  key={`v-${lineCol}`}
                  className={`company-table-line-v${lineCol === 7 ? " is-from-bottom" : ""}`}
                  style={
                    {
                      "--line-col": lineCol,
                      "--line-v-order": index + 1,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <dl className="company-table">
              {companyRows.map((row, rowIndex) => (
                <div
                  key={row.key}
                  className="company-table-row"
                  style={{ "--row-index": rowIndex } as CSSProperties}
                >
                  <dt className="company-table-label">{row.label}</dt>
                  <dd className="company-table-value">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
