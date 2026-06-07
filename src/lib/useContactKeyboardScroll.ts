"use client";

import { useEffect } from "react";

import { mediaQueries } from "@/lib/breakpoints";
import { SECTION_INDEX } from "@/lib/sectionNavigation";

const KEYBOARD_SCROLL_CLASS = "contact-shell--keyboard-scroll";

function readLayoutViewportHeight(): number {
  const fromCss = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--app-viewport-h"),
  );
  if (!Number.isNaN(fromCss) && fromCss > 0) return fromCss;
  return window.innerHeight;
}

function isSoftKeyboardOpen(layoutHeight: number): boolean {
  const visual = window.visualViewport?.height ?? window.innerHeight;
  const inner = window.innerHeight;
  return layoutHeight > 0 && visual < layoutHeight * 0.85 && inner >= layoutHeight * 0.92;
}

function getActiveContactShell(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    ".section-frame.is-active .section-shell.contact-shell",
  );
}

function scrollFieldIntoKeyboardViewport(field: HTMLElement) {
  const shell = field.closest<HTMLElement>(`.contact-shell.${KEYBOARD_SCROLL_CLASS}`);
  if (!shell) return;

  requestAnimationFrame(() => {
    const margin = 12;
    const shellRect = shell.getBoundingClientRect();
    const rect = field.getBoundingClientRect();

    if (rect.bottom > shellRect.bottom - margin) {
      shell.scrollTop += rect.bottom - shellRect.bottom + margin;
    } else if (rect.top < shellRect.top + margin) {
      shell.scrollTop -= shellRect.top + margin - rect.top;
    }
  });
}

/**
 * SP Contact のみ: キーボード表示中はセクション内スクロールを有効化（レイアウト寸法は固定のまま）。
 */
export function useContactKeyboardScroll(activeIndex: number) {
  useEffect(() => {
    if (activeIndex !== SECTION_INDEX.contact) return undefined;

    const mq = window.matchMedia(mediaQueries.flow);
    let layoutHeight = 0;

    const setKeyboardScroll = (enabled: boolean) => {
      const shell = getActiveContactShell();
      if (!shell) return;

      if (enabled) {
        const visualH = window.visualViewport?.height ?? window.innerHeight;
        shell.classList.add(KEYBOARD_SCROLL_CLASS);
        shell.style.setProperty("--contact-keyboard-viewport-h", `${Math.round(visualH)}px`);
      } else {
        shell.classList.remove(KEYBOARD_SCROLL_CLASS);
        shell.style.removeProperty("--contact-keyboard-viewport-h");
        shell.scrollTop = 0;
      }
    };

    const sync = () => {
      if (!mq.matches) {
        setKeyboardScroll(false);
        return;
      }

      if (layoutHeight <= 0) {
        layoutHeight = readLayoutViewportHeight();
      }

      const keyboardOpen = isSoftKeyboardOpen(layoutHeight);
      const focusedField = document.activeElement?.closest<HTMLElement>(
        ".contact-shell .contact-form-wrap input, .contact-shell .contact-form-wrap textarea",
      );

      if (keyboardOpen && focusedField) {
        setKeyboardScroll(true);
        scrollFieldIntoKeyboardViewport(focusedField);
        return;
      }

      if (!keyboardOpen) {
        setKeyboardScroll(false);
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest(".contact-shell .contact-form-wrap")) return;
      requestAnimationFrame(sync);
    };

    const onFocusOut = (event: FocusEvent) => {
      const related = event.relatedTarget;
      if (related instanceof Element && related.closest(".contact-shell .contact-form-wrap")) {
        return;
      }
      window.setTimeout(sync, 80);
    };

    layoutHeight = readLayoutViewportHeight();
    sync();

    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);

    return () => {
      setKeyboardScroll(false);
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, [activeIndex]);
}
