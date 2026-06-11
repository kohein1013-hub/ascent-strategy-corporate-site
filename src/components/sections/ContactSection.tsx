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
const CONTACT_TITLES_REVEAL_LOCK_MS = 1100;
const CONTACT_ENTRY_READY_CLASS = "contact-entry-ready";

const contactFields = [
  {
    key: "name",
    label: "氏名",
    placeholder: "氏名を入力してください",
    type: "text" as const,
    name: "name",
    autoComplete: "name",
    rowSpan: 1,
  },
  {
    key: "email",
    label: "メールアドレス",
    placeholder: "メールアドレスを入力してください",
    type: "email" as const,
    name: "email",
    autoComplete: "email",
    rowSpan: 1,
  },
  {
    key: "message",
    label: "問い合わせ内容",
    type: "textarea" as const,
    name: "message",
    autoComplete: "off",
    rowSpan: 2,
  },
] as const;

const contactHorizontalLines = [1, 2, 3, 4, 5, 6, 7] as const;
const contactVerticalLines = [1, 3, 7] as const;

type ContactSectionProps = {
  activeIndex?: number;
  /** Hero→Contact 用ループクローン（vi=0）。リビールは本番フレーム（vi=7）のみ */
  isLoopClone?: boolean;
  /** ループ用クローン含め、この Contact が表示中フレームか */
  isFrameActive?: boolean;
};

export function ContactSection({
  activeIndex = 0,
  isLoopClone = false,
  isFrameActive = false,
}: ContactSectionProps) {
  const shellRef = useRef<HTMLElement>(null);
  const titlesRevealArmedRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const shell = shellRef.current;
    if (!shell) return;

    const clearContactTitleRevealState = () => {
      releaseAppViewportSectionFreeze();
      shell.classList.remove(CONTACT_ENTRY_READY_CLASS);
      shell.removeAttribute("data-contact-asm-lock");
      clearSpTitleBandLayoutLock(shell);
      shell
        .querySelectorAll(".contact-unified-asmn, .contact-title-unified")
        .forEach((el) => el.classList.remove("contact-titles-revealed"));
      titlesRevealArmedRef.current = false;
    };

    /* Hero→Contact ループクローン: スライド中の見た目のみ（リビールは本番 vi=7） */
    if (isLoopClone) {
      return () => {
        clearContactTitleRevealState();
      };
    }

    if (!isFrameActive) {
      return;
    }

    const mqFlow = window.matchMedia(mediaQueries.flow);
    let cancelled = false;

    const markContactEntryReady = () => {
      if (cancelled) return;
      if (!mqFlow.matches) {
        clearContactTitleRevealState();
        return;
      }
      const frame = shell.closest(".section-frame");
      if (!frame?.classList.contains("is-active")) {
        return;
      }
      if (
        titlesRevealArmedRef.current ||
        shell.classList.contains(CONTACT_ENTRY_READY_CLASS)
      ) {
        return;
      }

      freezeAppViewportForSection("contact");
      titlesRevealArmedRef.current = true;

      const titleEls = shell.querySelectorAll(
        ".contact-unified-asmn, .contact-title-unified",
      );

      titleEls.forEach((node) => {
        const el = node as HTMLElement;
        el.style.removeProperty("visibility");
        el.style.removeProperty("opacity");
        el.style.removeProperty("pointer-events");
      });
      const onTitleRevealEnd = (e: Event) => {
        const ae = e as AnimationEvent;
        if (ae.animationName !== "contact-titles-unified-reveal") return;
        (ae.currentTarget as HTMLElement).classList.add("contact-titles-revealed");
      };
      titleEls.forEach((el) => {
        (el as HTMLElement).getAnimations().forEach((anim) => anim.cancel());
        el.classList.remove("contact-titles-revealed");
        el.addEventListener("animationend", onTitleRevealEnd, { once: true });
      });

      shell.setAttribute("data-contact-asm-lock", "");
      lockSpTitleBandLayout(shell);
      shell.classList.add(CONTACT_ENTRY_READY_CLASS);
      void shell.offsetHeight;
      window.setTimeout(() => {
        shell.removeAttribute("data-contact-asm-lock");
      }, CONTACT_TITLES_REVEAL_LOCK_MS);
    };

    const resetContactTitleReveal = () => {
      clearContactTitleRevealState();
    };

    const runReadySoon = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) markContactEntryReady();
        });
      });
    };

    let exitResetOnTrackEnd: ((e: Event) => void) | undefined;
    let readyFallbackId: number | undefined;

    if (activeIndex === SECTION_INDEX.contact && mqFlow.matches && isFrameActive) {
      clearContactTitleRevealState();
      if (!isSectionTrackTransitioning()) {
        requestAnimationFrame(() => {
          if (
            !cancelled &&
            !isSectionTrackTransitioning() &&
            !shell.classList.contains(CONTACT_ENTRY_READY_CLASS)
          ) {
            runReadySoon();
          }
        });
      }
    } else if (shell.classList.contains(CONTACT_ENTRY_READY_CLASS)) {
      const trackEl = document.querySelector(".section-track");
      if (trackEl) {
        exitResetOnTrackEnd = (e: Event) => {
          const te = e as TransitionEvent;
          if (te.propertyName !== "transform" || te.target !== trackEl) return;
          trackEl.removeEventListener("transitionend", exitResetOnTrackEnd!);
          exitResetOnTrackEnd = undefined;
          resetContactTitleReveal();
        };
        trackEl.addEventListener("transitionend", exitResetOnTrackEnd);
      } else {
        resetContactTitleReveal();
      }
    }

    const track = document.querySelector(".section-track");
    const onTrackTransitionEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "transform" || te.target !== track) return;
      if (!mqFlow.matches) return;
      if (activeIndex !== SECTION_INDEX.contact || !isFrameActive) return;
      const frame = shell.closest(".section-frame");
      if (!frame?.classList.contains("is-active")) return;
      if (!shell.classList.contains(CONTACT_ENTRY_READY_CLASS)) {
        runReadySoon();
      }
    };
    track?.addEventListener("transitionend", onTrackTransitionEnd);

    if (mqFlow.matches && activeIndex === SECTION_INDEX.contact && isFrameActive) {
      readyFallbackId = window.setTimeout(() => {
        const frame = shell.closest(".section-frame");
        if (
          activeIndex === SECTION_INDEX.contact &&
          isFrameActive &&
          frame?.classList.contains("is-active") &&
          !shell.classList.contains(CONTACT_ENTRY_READY_CLASS)
        ) {
          markContactEntryReady();
        }
      }, 900);
    }

    const mqListener = () => {
      if (!mqFlow.matches) {
        resetContactTitleReveal();
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
  }, [activeIndex, isLoopClone, isFrameActive]);

  return (
    <section
      ref={shellRef}
      className={`section-shell contact-shell${isLoopClone ? " contact-shell--loop-clone" : ""}`}
    >
      <div className="contact-stack">
        <div className="message-titles-stack">
          <div className="message-titles-axis">
            <h2 className="message-heading reveal-item reveal-delay-2 contact-title-unified">
              Contact
            </h2>
            <h3 className="message-tagline reveal-item reveal-delay-3 contact-title-unified">
              問い合わせ
            </h3>
          </div>
        </div>

        <form className="contact-form-wrap" action="#" method="post">
          <div className="contact-form-lines" aria-hidden>
            {contactHorizontalLines.map((lineRow) => (
              <span
                key={`h-${lineRow}`}
                className={`contact-form-line-h${lineRow === 7 ? " is-from-right" : ""}`}
                style={{ "--line-row": lineRow } as CSSProperties}
              />
            ))}
            {contactVerticalLines.map((lineCol, index) => (
              <span
                key={`v-${lineCol}`}
                className={`contact-form-line-v${lineCol === 7 ? " is-from-bottom" : ""}`}
                style={
                  {
                    "--line-col": lineCol,
                    "--line-v-order": index + 1,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="contact-form-intro">
            <div className="contact-form-row contact-form-row--intro">
              <span className="contact-form-label" aria-hidden="true" />
              <p className="contact-form-intro-text" style={{ "--row-index": 0 } as CSSProperties}>
                ご相談・ご依頼につきましては、下記フォームよりお問い合わせください。
                <br />
                内容を確認の上、担当者よりご連絡を差し上げます。
              </p>
            </div>
          </div>

          <div className="contact-form">
            {contactFields.map((field, fieldIndex) => (
              <div
                key={field.key}
                className={`contact-form-row${field.rowSpan === 2 ? " contact-form-row--double contact-form-row--message" : ""}`}
                style={{ "--row-index": fieldIndex + 1 } as CSSProperties}
              >
                {field.type === "textarea" ? (
                  <div className="contact-form-message-grid">
                    <label className="contact-form-label" htmlFor={`contact-${field.key}`}>
                      {field.label}
                    </label>
                    <div className="contact-form-textarea-slot">
                      <textarea
                        id={`contact-${field.key}`}
                        className="contact-form-control contact-form-control--textarea"
                        name={field.name}
                        placeholder=" "
                        autoComplete={field.autoComplete}
                      />
                      <span
                        className="contact-form-placeholder contact-form-placeholder--textarea"
                        aria-hidden="true"
                      >
                        問い合わせ内容を入力してください
                      </span>
                    </div>
                    <a
                      href="/terms"
                      className="contact-form-terms"
                      style={{ "--row-index": fieldIndex + 1 } as CSSProperties}
                    >
                      利用規約
                    </a>
                    <button
                      type="submit"
                      className="contact-form-actions contact-form-send-cell"
                      style={{ "--row-index": fieldIndex + 1 } as CSSProperties}
                      aria-label="送信"
                    >
                      <span className="contact-form-send-label">
                        Send
                        <span className="contact-form-send-arrow" aria-hidden>
                          →
                        </span>
                      </span>
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="contact-form-label" htmlFor={`contact-${field.key}`}>
                      {field.label}
                    </label>
                    <div className="contact-form-field">
                      <input
                        id={`contact-${field.key}`}
                        className="contact-form-control"
                        type={field.type}
                        name={field.name}
                        placeholder=" "
                        autoComplete={field.autoComplete}
                      />
                      <span className="contact-form-placeholder" aria-hidden="true">
                        {field.placeholder}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
}
