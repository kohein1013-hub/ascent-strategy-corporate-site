"use client";

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type Ref,
} from "react";

import { mediaQueries } from "@/lib/breakpoints";
import { readAppViewportHeightPx } from "@/lib/readAppViewportHeight";
import { isSectionTrackTransitioning } from "@/lib/sectionTrackTransition";
import {
  FLOW_MARK_COLS,
  FOCUS_COLS,
  getCrossIntersectionFractions,
  getFocusPoint,
  HERO_CROSS_ANCHOR,
  HERO_EN_FROM_AXIS_OFFSET_X,
  HERO_EN_VERTICAL_AXIS_COL,
} from "@/lib/crossFocus";

type Props = {
  children: React.ReactNode;
  /** オーバーレイのフォーカスが変わったときに再計算する */
  activeIndex?: number;
  className?: string;
  /**
   * ASMN 番号テキストを視覚的に隠す（幅・座標計測のレイアウト責務は維持）。
   * 番号表示はヘッダーメニューへ一本化したため、各セクションでは計測のみ行う。
   */
  hideLabel?: boolean;
};

/**
 * デスクトップ: 十字フォーカス中心 + `--asmn-cross-offset-x/y`。
 * Hero SP: 列1縦軸 + `--hero-en-from-axis-offset-x`、縦は交差点 1/2 基準。
 * Message / Service / Approach SP: コンテンツ基準の直上 + `--message-asmn-above-en-gap`。
 * Hero PC: 英語ブロック（.hero-copy-group）左端に ASMN を左揃え。縦は見出し直上。
 */
export const AsmCrossEyebrow = forwardRef<HTMLParagraphElement, Props>(
  function AsmCrossEyebrow(
    { children, activeIndex = 0, className = "", hideLabel = false },
    forwardedRef: Ref<HTMLParagraphElement>,
  ) {
    const innerRef = useRef<HTMLParagraphElement | null>(null);

    const setRef = useCallback(
      (node: HTMLParagraphElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef],
    );

    useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el || typeof window === "undefined") return;

      const mq = window.matchMedia(mediaQueries.grid);

      const clearStyles = () => {
        el.style.removeProperty("position");
        el.style.removeProperty("left");
        el.style.removeProperty("top");
        el.style.removeProperty("right");
        el.style.removeProperty("width");
        el.style.removeProperty("max-width");
        el.style.removeProperty("z-index");
        el.style.removeProperty("transform");
        el.style.removeProperty("visibility");
        el.style.removeProperty("pointer-events");
        el.style.removeProperty("display");
        el.style.removeProperty("opacity");
      };

      const update = () => {
        const section = el.closest(".section-shell");
        if (!section) {
          clearStyles();
          return;
        }

        const frame = section.closest(".section-frame");
        const isHero = section.classList.contains("section-shell--hero");
        const isMessage = section.classList.contains("section-shell--message");
        const isService = section.classList.contains("service-shell");
        const mqFlow = window.matchMedia(mediaQueries.flow);
        const isApproachShell = section.classList.contains("approach-shell");
        const isNetwork = section.classList.contains("network-shell");
        const networkShell = isNetwork ? (section as HTMLElement) : null;
        const isCompany = section.classList.contains("company-shell");
        const isContact = section.classList.contains("contact-shell");

        /*
         * SP 縦スライド中: 離脱側（is-slide-source）以外の ASMN は即時非表示。
         * is-active の付け替えで inline visible と CSS が競合し点滅するのを防ぐ。
         */
        if (
          !mq.matches &&
          mqFlow.matches &&
          isSectionTrackTransitioning() &&
          frame &&
          !frame.classList.contains("is-slide-source")
        ) {
          el.style.visibility = "hidden";
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          return;
        }

        if (frame && !frame.classList.contains("is-active")) {
          const holdApproachAsmDuringExit =
            isApproachShell &&
            !mq.matches &&
            mqFlow.matches &&
            section.classList.contains("approach-layout-ready");
          const holdNetworkAsmDuringExit =
            isNetwork &&
            !mq.matches &&
            mqFlow.matches &&
            section.classList.contains("network-layout-ready");
          const holdCompanyAsmDuringExit =
            isCompany &&
            !mq.matches &&
            mqFlow.matches &&
            section.classList.contains("company-entry-ready");
          const holdContactAsmDuringExit =
            isContact &&
            !mq.matches &&
            mqFlow.matches &&
            section.classList.contains("contact-entry-ready");
          const holdShellAsmDuringPcExit =
            mq.matches &&
            isSectionTrackTransitioning() &&
            (isMessage || isService || isApproachShell || isNetwork);
          if (
            holdApproachAsmDuringExit ||
            holdNetworkAsmDuringExit ||
            holdCompanyAsmDuringExit ||
            holdContactAsmDuringExit ||
            holdShellAsmDuringPcExit
          ) {
            /* PC: スライド中は座標だけ保持し非表示（いきなり表示防止） */
            if (mq.matches && (isMessage || isService || isApproachShell || isNetwork)) {
              const pcReady =
                (isService && section.classList.contains("service-pc-asm-ready")) ||
                (isApproachShell && section.classList.contains("approach-pc-asm-ready")) ||
                (isNetwork && section.classList.contains("network-pc-asm-ready"));
              if (!pcReady) {
                el.style.opacity = "0";
                el.style.visibility = "hidden";
                el.style.pointerEvents = "none";
              }
            }
            return;
          }
          clearStyles();
          return;
        }
        if (
          isMessage &&
          !mq.matches &&
          mqFlow.matches &&
          !section.classList.contains("message-entry-ready")
        ) {
          clearStyles();
          return;
        }
        const shellEl = section as HTMLElement;
        const serviceShell = isService ? shellEl : null;
        const serviceFinalize =
          isService && serviceShell?.dataset.serviceAsmFinalize === "1";
        if (isService && !mq.matches && mqFlow.matches) {
          if (!section.classList.contains("service-entry-ready") && !serviceFinalize) {
            el.style.visibility = "hidden";
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
            return;
          }
          if (section.hasAttribute("data-service-asm-lock")) {
            if (section.classList.contains("service-fv-reveal-go")) {
              el.style.visibility = "visible";
              el.style.pointerEvents = "";
              el.style.removeProperty("opacity");
            }
            return;
          }
        }
        /* Service PC: 非表示は CSS（:not(.service-pc-asm-ready)）のみ。inline だと ready 後も残る */
        const isApproach = isApproachShell;
        const approachShell = isApproach ? shellEl : null;
        const approachFinalize =
          isApproach && approachShell?.dataset.approachAsmFinalize === "1";
        if (isApproach && !mq.matches && mqFlow.matches) {
          if (!section.classList.contains("approach-layout-ready") && !approachFinalize) {
            el.style.visibility = "hidden";
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
            return;
          }
          if (section.hasAttribute("data-approach-asm-lock")) {
            if (section.classList.contains("approach-titles-reveal-go")) {
              el.style.visibility = "visible";
              el.style.pointerEvents = "";
              el.style.removeProperty("opacity");
            }
            return;
          }
          if (
            isSectionTrackTransitioning() &&
            !frame?.classList.contains("is-slide-source")
          ) {
            return;
          }
        }
        /* Approach PC: 非表示は CSS のみ */
        const networkFinalize =
          isNetwork && networkShell?.dataset.networkAsmFinalize === "1";
        if (isNetwork && !mq.matches && mqFlow.matches) {
          if (!section.classList.contains("network-layout-ready") && !networkFinalize) {
            el.style.visibility = "hidden";
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
            return;
          }
          if (section.hasAttribute("data-network-asm-lock")) {
            if (section.classList.contains("network-titles-reveal-go")) {
              el.style.visibility = "visible";
              el.style.pointerEvents = "";
              el.style.removeProperty("opacity");
            }
            return;
          }
        }
        /* Network PC: 非表示は CSS のみ */
        const isPcShellAsmReady =
          mq.matches &&
          ((isService && section.classList.contains("service-pc-asm-ready")) ||
            (isApproach && section.classList.contains("approach-pc-asm-ready")) ||
            (isNetwork && section.classList.contains("network-pc-asm-ready")));
        const isSpHero = isHero && !mq.matches;
        const isSpContentAnchored =
          (isMessage || isService || isApproach || isNetwork) && !mq.matches;

        /*
         * Company / Contact SP: CSS 固定（--company-asmn-left 等）。inline の visibility は使わない
         * （付与後に update が走らないと ASMN が消えたままになる）。非表示は CSS :not(*-layout-ready) のみ。
         * entry-ready 前後は clearStyles しない（リロード初回のガタつき防止）。
         */
        if (isCompany && !mq.matches && mqFlow.matches) {
          clearStyles();
          return;
        }

        if (isContact && !mq.matches && mqFlow.matches) {
          clearStyles();
          return;
        }

        /* Company / Contact PC: タイトル帯は CSS 固定のため clearStyles のみ */
        if ((isCompany || isContact) && mq.matches) {
          if (
            isCompany &&
            (section.hasAttribute("data-company-asm-lock") ||
              section.classList.contains("company-entry-ready"))
          ) {
            return;
          }
          if (
            isContact &&
            (section.hasAttribute("data-contact-asm-lock") ||
              section.classList.contains("contact-entry-ready"))
          ) {
            return;
          }
          clearStyles();
          return;
        }

        const pinOnCross = mq.matches || isSpHero || isSpContentAnchored;
        if (!pinOnCross) {
          clearStyles();
          return;
        }

        const root = document.documentElement;
        const colCount = mq.matches ? FOCUS_COLS : FLOW_MARK_COLS;

        const crossInsetStr = getComputedStyle(root).getPropertyValue("--cross-inset").trim();
        const crossInset = crossInsetStr ? Number.parseFloat(crossInsetStr) : 30;

        const cs = getComputedStyle(section);
        const oyStr =
          cs.getPropertyValue("--asmn-cross-offset-y").trim() ||
          getComputedStyle(root).getPropertyValue("--asmn-cross-offset-y").trim();
        const offsetY = oyStr ? Number.parseFloat(oyStr) : 15;

        const sRect = section.getBoundingClientRect();
        const crossPlaneWidth = window.innerWidth - 2 * crossInset;
        const crossPlaneHeight =
          (isMessage || isService) && mq.matches
            ? readAppViewportHeightPx(sRect.height) - 2 * crossInset
            : sRect.height - 2 * crossInset;

        let leftViewport: number;
        let topViewport: number;

        if (isSpHero) {
          const { focusX: axisX } = getCrossIntersectionFractions(
            HERO_EN_VERTICAL_AXIS_COL,
            1,
            colCount,
          );
          const { focusY } = getCrossIntersectionFractions(
            HERO_CROSS_ANCHOR.col,
            HERO_CROSS_ANCHOR.row,
            colCount,
          );
          const axisOffsetStr =
            cs.getPropertyValue("--hero-en-from-axis-offset-x").trim() ||
            cs.getPropertyValue("--hero-en-cross-offset-x").trim();
          const axisOffsetX = axisOffsetStr
            ? Number.parseFloat(axisOffsetStr)
            : HERO_EN_FROM_AXIS_OFFSET_X;

          const crossAxisX = crossInset + axisX * crossPlaneWidth;
          const crossCenterY = crossInset + focusY * crossPlaneHeight;
          leftViewport = crossAxisX + axisOffsetX;
          topViewport = crossCenterY - offsetY;
        } else if (isHero && mq.matches) {
          const copyGroup = section.querySelector(".hero-copy-group") as HTMLElement | null;
          if (!copyGroup) {
            clearStyles();
            return;
          }
          const copyRect = copyGroup.getBoundingClientRect();
          const titleEl = section.querySelector(".hero-title") as HTMLElement | null;
          const titleRect = (titleEl ?? copyGroup).getBoundingClientRect();
          const asmHeight = el.offsetHeight || el.getBoundingClientRect().height;
          const gapStr = cs.getPropertyValue("--hero-asmn-above-title-gap").trim();
          const gap = gapStr ? Number.parseFloat(gapStr) : 12;
          const fineXStr = cs.getPropertyValue("--hero-asmn-pc-offset-x").trim();
          const fineOffsetX = fineXStr ? Number.parseFloat(fineXStr) : 0;
          leftViewport = copyRect.left + fineOffsetX;
          topViewport = titleRect.top - gap - asmHeight;
        } else if (isNetwork && mq.matches) {
          const titlesStack = section.querySelector(
            ".network-stack > .message-titles-stack",
          ) as HTMLElement | null;
          const headingAxis = section.querySelector(
            ".network-heading-axis",
          ) as HTMLElement | null;
          if (!titlesStack || !headingAxis) {
            clearStyles();
            return;
          }
          if (networkFinalize) {
            el.style.display = "block";
            el.style.visibility = "visible";
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
          }
          const networkFocus = getFocusPoint(activeIndex);
          const { focusX, focusY } = getCrossIntersectionFractions(
            networkFocus.col,
            networkFocus.row,
            colCount,
          );
          const crossCenterX = crossInset + focusX * crossPlaneWidth;
          const crossCenterY = crossInset + focusY * crossPlaneHeight;
          const asmWidth = el.offsetWidth || el.getBoundingClientRect().width;
          const belowArmStr = cs
            .getPropertyValue("--network-pc-asmn-below-cross-arm")
            .trim();
          const belowArm = belowArmStr ? Number.parseFloat(belowArmStr) : 10;
          const elCs = getComputedStyle(el);
          const offsetXStr = elCs
            .getPropertyValue("--network-pc-asmn-offset-x")
            .trim();
          const offsetX = offsetXStr ? Number.parseFloat(offsetXStr) : 0;
          leftViewport = crossCenterX - asmWidth / 2 + offsetX;
          /* PC Network: 十字アーム（row 5）直下。見出し帯とは独立 */
          topViewport = sRect.top + crossCenterY + belowArm;
        } else if (isSpContentAnchored) {
          const anchorWrap = (
            isMessage
              ? section.querySelector(".message-en-wrap")
              : isService
                ? section.querySelector(".service-fv .message-titles-axis")
                : section.querySelector(".message-titles-stack .message-titles-axis")
          ) as HTMLElement | null;
          const anchorLead = (
            isMessage
              ? section.querySelector(".message-en-lead")
              : isService
                ? section.querySelector(".service-fv .message-tagline")
                : isNetwork
                  ? section.querySelector(".network-heading-axis")
                  : isApproach
                    ? section.querySelector(".approach-heading-axis")
                    : null
          ) as HTMLElement | null;
          if (!anchorWrap && !anchorLead) {
            clearStyles();
            return;
          }
          const gapStr = cs.getPropertyValue("--message-asmn-above-en-gap").trim();
          const gap = gapStr ? Number.parseFloat(gapStr) : 15;
          const liftStr = cs.getPropertyValue("--message-asmn-extra-lift").trim();
          const extraLift = liftStr ? Number.parseFloat(liftStr) : 0;
          const asmnDownStr = isMessage
            ? cs.getPropertyValue("--message-asmn-offset-down").trim()
            : "";
          const asmnOffsetDown = asmnDownStr ? Number.parseFloat(asmnDownStr) : 0;
          const oxStr =
            cs.getPropertyValue("--message-asmn-en-offset-x").trim() ||
            cs.getPropertyValue("--asmn-cross-offset-x").trim();
          const offsetX = oxStr ? Number.parseFloat(oxStr) : 0;

          const wrapRect = (anchorWrap ?? anchorLead)!.getBoundingClientRect();
          const leadRect = (anchorLead ?? anchorWrap)!.getBoundingClientRect();

          if (serviceFinalize || approachFinalize || networkFinalize) {
            el.style.display = "block";
            el.style.visibility = "visible";
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
          }

          const asmHeight = el.offsetHeight || el.getBoundingClientRect().height;
          const asmWidth = el.offsetWidth || el.getBoundingClientRect().width;

          if (isApproach) {
            const headingAxis = section.querySelector(
              ".approach-heading-axis",
            ) as HTMLElement | null;
            const approachFocus = getFocusPoint(activeIndex);
            const { focusX } = getCrossIntersectionFractions(
              approachFocus.col,
              approachFocus.row,
              colCount,
            );
            const crossCenterX = crossInset + focusX * crossPlaneWidth;
            leftViewport = crossCenterX - asmWidth / 2;
            const approachGapStr = cs
              .getPropertyValue("--approach-asmn-above-heading-gap")
              .trim();
            const approachGap = approachGapStr
              ? Number.parseFloat(approachGapStr)
              : 8;
            const headingRect = (headingAxis ?? anchorLead)!.getBoundingClientRect();
            const titlesLiftStr = mq.matches
              ? cs.getPropertyValue("--approach-titles-visual-lift").trim()
              : "";
            const titlesLift =
              mq.matches && titlesLiftStr ? Number.parseFloat(titlesLiftStr) : 0;
            /* ASMN 003: Approach 見出し直上（十字交点の横位置・タイトル帯内） */
            topViewport =
              headingRect.top - approachGap - asmHeight - extraLift + titlesLift;
          } else if (isNetwork) {
            const headingAxis = section.querySelector(
              ".network-heading-axis",
            ) as HTMLElement | null;
            const networkFocus = getFocusPoint(activeIndex);
            const { focusX } = getCrossIntersectionFractions(
              networkFocus.col,
              networkFocus.row,
              colCount,
            );
            const crossCenterX = crossInset + focusX * crossPlaneWidth;
            leftViewport = crossCenterX - asmWidth / 2;
            const networkGapStr = cs
              .getPropertyValue("--network-asmn-above-heading-gap")
              .trim();
            const networkGap = networkGapStr ? Number.parseFloat(networkGapStr) : 8;
            const liftStr = cs.getPropertyValue("--network-asmn-lift").trim();
            const networkLift = liftStr ? Number.parseFloat(liftStr) : 0;
            const headingRect = (headingAxis ?? anchorLead)!.getBoundingClientRect();
            topViewport = headingRect.top - networkGap - asmHeight - extraLift - networkLift;
          } else if (isService) {
            const serviceCenterOffsetStr = cs
              .getPropertyValue("--service-asmn-center-offset-x")
              .trim();
            const serviceCenterOffsetX = serviceCenterOffsetStr
              ? Number.parseFloat(serviceCenterOffsetStr)
              : 0;
            const fineOffsetXStr = cs.getPropertyValue("--service-asmn-fine-offset-x").trim();
            const fineOffsetYStr = cs.getPropertyValue("--service-asmn-fine-offset-y").trim();
            const fineOffsetX = fineOffsetXStr ? Number.parseFloat(fineOffsetXStr) : 0;
            const fineOffsetY = fineOffsetYStr ? Number.parseFloat(fineOffsetYStr) : 0;
            /* Service SP: 見出し＋キャッチブロック中央・上端基準（タグライン単体の transform に依存しない） */
            leftViewport =
              wrapRect.left +
              wrapRect.width / 2 -
              asmWidth / 2 +
              serviceCenterOffsetX +
              fineOffsetX;
            topViewport =
              wrapRect.top - gap - asmHeight - extraLift + asmnOffsetDown + fineOffsetY;
          } else {
            leftViewport = wrapRect.left + offsetX;
            /* ラベル下端がアンカー上端から gap だけ上（transform 不使用・リビール animation と競合しない） */
            topViewport =
              leadRect.top - gap - asmHeight - extraLift + asmnOffsetDown;
          }
        } else {
          const focus = getFocusPoint(activeIndex);
          const { focusX, focusY } = getCrossIntersectionFractions(
            focus.col,
            focus.row,
            colCount,
          );
          const oxStr =
            cs.getPropertyValue("--asmn-cross-offset-x").trim() ||
            getComputedStyle(root).getPropertyValue("--asmn-cross-offset-x").trim();
          const offsetX = oxStr ? Number.parseFloat(oxStr) : 15;

          const crossCenterX = crossInset + focusX * crossPlaneWidth;
          const crossCenterY = crossInset + focusY * crossPlaneHeight;
          leftViewport = crossCenterX + offsetX;
          topViewport = crossCenterY - offsetY;
          if (isService && mq.matches) {
            const approachLiftStr = cs
              .getPropertyValue("--service-pc-asmn-approach-entry-lift")
              .trim();
            const approachEntryLift = approachLiftStr
              ? Number.parseFloat(approachLiftStr)
              : 0;
            topViewport -= approachEntryLift;
          }
        }

        const titlesStackEl =
          (isApproach || isNetwork) && isSpContentAnchored
            ? (section.querySelector(".message-titles-stack") as HTMLElement | null)
            : null;
        const networkPcTitlesStackEl =
          isNetwork && mq.matches
            ? (section.querySelector(
                ".network-stack > .message-titles-stack",
              ) as HTMLElement | null)
            : null;
        const isPcHero = isHero && mq.matches;

        el.style.position = "absolute";
        el.style.left = "0px";
        el.style.top = "0px";
        el.style.right = "auto";
        el.style.width = "max-content";
        el.style.maxWidth = mq.matches ? "min(42vw, 18rem)" : "min(46vw, 11rem)";
        el.style.zIndex = isNetwork && mq.matches ? "12" : "4";

        const offsetParentEl = el.offsetParent as HTMLElement | null;
        const anchorRect =
          offsetParentEl?.getBoundingClientRect() ??
          networkPcTitlesStackEl?.getBoundingClientRect() ??
          titlesStackEl?.getBoundingClientRect() ??
          sRect;

        let left = Math.round(leftViewport - anchorRect.left);
        const top = Math.round(topViewport - anchorRect.top);

        if (isSpHero) {
          const syncLeftStr = cs.getPropertyValue("--hero-asmn-aligned-left").trim();
          if (syncLeftStr) {
            const syncLeft = Number.parseFloat(syncLeftStr);
            if (!Number.isNaN(syncLeft)) {
              left = Math.round(syncLeft);
            }
          }
        }

        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        /*
         * Service / Approach SP: transform は見出し・キャッチと同型の reveal-item（translateY）に任せる。
         * 他 SP アンカー配置は translate と競合するため none。
         */
        if (isSpContentAnchored && !isService && !isApproach && !isNetwork) {
          el.style.transform = "none";
        } else {
          el.style.removeProperty("transform");
        }

        if (isService && !mq.matches && mqFlow.matches) {
          el.style.display = "block";
          if (section.classList.contains("service-fv-reveal-go")) {
            el.style.visibility = "visible";
            el.style.pointerEvents = "";
            /* 計測用 opacity:0 を残さない（CSS リビールと競合して非表示のままになる） */
            if (
              !serviceFinalize ||
              section.classList.contains("service-entry-ready")
            ) {
              el.style.removeProperty("opacity");
            }
          } else {
            el.style.visibility = "hidden";
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
          }
        }

        if (isApproach && !mq.matches && mqFlow.matches) {
          el.style.display = "block";
          el.style.visibility = "visible";
          el.style.pointerEvents = "";
          if (
            !approachFinalize ||
            section.classList.contains("approach-layout-ready")
          ) {
            el.style.removeProperty("opacity");
          }
        }

        if (isNetwork && !mq.matches && mqFlow.matches) {
          el.style.display = "block";
          el.style.visibility = "visible";
          el.style.pointerEvents = "";
          if (
            !networkFinalize ||
            section.classList.contains("network-layout-ready")
          ) {
            el.style.removeProperty("opacity");
          }
        }

        /* PC: inline opacity / visibility は hero-asmn-reveal と競合するため外す */
        if (mq.matches && (isMessage || isService || isApproach || isNetwork)) {
          el.style.removeProperty("opacity");
          el.style.removeProperty("visibility");
          el.style.removeProperty("pointer-events");
          if (isPcShellAsmReady) {
            el.style.removeProperty("display");
          }
        }
      };

      const sectionEl = innerRef.current?.closest(".section-shell");

      const isPcAsmLayoutFrozen = () => {
        if (!sectionEl || !mq.matches) return false;
        return (
          sectionEl.hasAttribute("data-message-asm-lock") ||
          sectionEl.hasAttribute("data-service-pc-asm-lock") ||
          sectionEl.hasAttribute("data-approach-pc-asm-lock") ||
          sectionEl.hasAttribute("data-network-pc-asm-lock")
        );
      };

      const runUpdateSoon = () => {
        if (isPcAsmLayoutFrozen()) return;
        requestAnimationFrame(() => {
          requestAnimationFrame(update);
        });
      };

      const onWindowResize = () => {
        if (!sectionEl || !mq.matches) {
          runUpdateSoon();
          return;
        }
        if (
          sectionEl.hasAttribute("data-message-asm-lock") ||
          sectionEl.hasAttribute("data-service-pc-asm-lock") ||
          sectionEl.hasAttribute("data-approach-pc-asm-lock") ||
          sectionEl.hasAttribute("data-network-pc-asm-lock")
        ) {
          update();
          return;
        }
        runUpdateSoon();
      };

      update();
      const ro = new ResizeObserver(runUpdateSoon);
      if (sectionEl) ro.observe(sectionEl);
      if (innerRef.current) ro.observe(innerRef.current);
      const enLeadEl = sectionEl?.querySelector(".message-en-lead");
      if (enLeadEl) ro.observe(enLeadEl);
      const enWrapEl = sectionEl?.querySelector(".message-en-wrap");
      if (enWrapEl) ro.observe(enWrapEl);
      const serviceTaglineEl = sectionEl?.querySelector(".service-fv .message-tagline");
      if (serviceTaglineEl) ro.observe(serviceTaglineEl);
      const serviceTitlesAxisEl = sectionEl?.querySelector(
        ".service-fv .message-titles-axis",
      );
      if (serviceTitlesAxisEl) ro.observe(serviceTitlesAxisEl);
      const titlesStackForAsmEl =
        sectionEl?.classList.contains("approach-shell") ||
        sectionEl?.classList.contains("network-shell")
          ? sectionEl.querySelector(".message-titles-stack")
          : null;
      if (titlesStackForAsmEl) ro.observe(titlesStackForAsmEl);
      const approachTaglineAxisEl = sectionEl?.classList.contains("approach-shell")
        ? sectionEl.querySelector(".approach-tagline-axis")
        : null;
      if (approachTaglineAxisEl) ro.observe(approachTaglineAxisEl);
      const approachHeadingAxisEl = sectionEl?.classList.contains("approach-shell")
        ? sectionEl.querySelector(".approach-heading-axis")
        : null;
      if (approachHeadingAxisEl) ro.observe(approachHeadingAxisEl);
      const networkHeadingAxisEl = sectionEl?.classList.contains("network-shell")
        ? sectionEl.querySelector(".network-heading-axis")
        : null;
      if (networkHeadingAxisEl) ro.observe(networkHeadingAxisEl);
      const approachTitlesAxisEl = sectionEl?.classList.contains("approach-shell")
        ? sectionEl.querySelector(".message-titles-stack .message-titles-axis")
        : null;
      if (approachTitlesAxisEl) ro.observe(approachTitlesAxisEl);
      const companyLabelEl = sectionEl?.classList.contains("company-shell")
        ? sectionEl.querySelector(".company-table-label")
        : null;
      if (companyLabelEl) ro.observe(companyLabelEl);
      window.addEventListener("resize", onWindowResize);
      mq.addEventListener("change", runUpdateSoon);

      let io: IntersectionObserver | undefined;
      if (sectionEl && typeof IntersectionObserver !== "undefined") {
        io = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              runUpdateSoon();
            }
          },
          { threshold: [0, 0.02, 0.1] },
        );
        io.observe(sectionEl);
      }

      const track = typeof document !== "undefined" ? document.querySelector(".section-track") : null;
      const onTrackTransitionEnd = (e: Event) => {
        const te = e as TransitionEvent;
        if (te.propertyName !== "transform") return;
        if (te.target !== track) return;
        if (isPcAsmLayoutFrozen()) return;
        runUpdateSoon();
      };
      track?.addEventListener("transitionend", onTrackTransitionEnd);

      const onAnchorLayout = (e: Event) => {
        const isSyncLayout =
          (e.type === "service-fv-layout" ||
            e.type === "approach-titles-layout" ||
            e.type === "network-titles-layout" ||
            e.type === "message-pc-layout") &&
          (e as CustomEvent<{ sync?: boolean }>).detail?.sync;
        if (isSyncLayout) {
          update();
          return;
        }
        if (isPcAsmLayoutFrozen()) return;
        runUpdateSoon();
      };
      sectionEl?.addEventListener("message-en-layout", onAnchorLayout);
      sectionEl?.addEventListener("message-pc-layout", onAnchorLayout);
      sectionEl?.addEventListener("service-fv-layout", onAnchorLayout);
      sectionEl?.addEventListener("approach-titles-layout", onAnchorLayout);
      sectionEl?.addEventListener("network-titles-layout", onAnchorLayout);
      const serviceScrollEl = sectionEl?.querySelector(".service-scroll-area");
      const onServiceScroll = () => {
        if (!serviceScrollEl) return;
        if (serviceScrollEl.scrollTop < 2) runUpdateSoon();
      };
      serviceScrollEl?.addEventListener("scroll", onServiceScroll, { passive: true });

      return () => {
        ro.disconnect();
        io?.disconnect();
        window.removeEventListener("resize", onWindowResize);
        mq.removeEventListener("change", runUpdateSoon);
        track?.removeEventListener("transitionend", onTrackTransitionEnd);
        sectionEl?.removeEventListener("message-en-layout", onAnchorLayout);
        sectionEl?.removeEventListener("message-pc-layout", onAnchorLayout);
        sectionEl?.removeEventListener("service-fv-layout", onAnchorLayout);
        sectionEl?.removeEventListener("approach-titles-layout", onAnchorLayout);
        sectionEl?.removeEventListener("network-titles-layout", onAnchorLayout);
        serviceScrollEl?.removeEventListener("scroll", onServiceScroll);
      };
    }, [activeIndex]);

    return (
      <p
        ref={setRef}
        className={`eyebrow asm-cross-eyebrow ${className}`.trim()}
        aria-hidden={hideLabel ? true : undefined}
        style={
          hideLabel
            ? { color: "transparent", userSelect: "none" }
            : undefined
        }
      >
        {children}
      </p>
    );
  },
);
