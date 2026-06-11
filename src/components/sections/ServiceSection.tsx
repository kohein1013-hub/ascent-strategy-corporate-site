"use client";

import { RefObject, useCallback, useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { mediaQueries } from "@/lib/breakpoints";
import { SECTION_INDEX } from "@/lib/sectionNavigation";
import { isSectionTrackTransitioning } from "@/lib/sectionTrackTransition";
import { usePcShellAsmHeroReveal } from "@/lib/usePcShellAsmHeroReveal";
type LineSection = {
  title: string;
  items: string[];
};

type ServiceItem = {
  key: string;
  headline: string;
  tagline: string;
  body: string;
  /** Capital / Grants / Sales */
  serviceLines?: string[];
  /** M&A など複数ブロック */
  lineSections?: LineSection[];
  note?: string;
};

const services: ServiceItem[] = [
  {
    key: "Capital",
    headline: "Ascent Capital ｜ 資金調達コンサルティング",
    tagline: "必要な資金を、最適な構造で。",
    body: "企業の資金調達戦略を、財務コンサルティングの観点からご支援します。事業計画の策定、資金繰り改善、金融機関・投資家向けドキュメンテーションの整備支援等を通じて、企業の資金調達力そのものを高めることを目的としています。",
    serviceLines: [
      "事業計画書・資金繰り表・財務モデルの作成支援",
      "金融機関への提出書類の整備支援",
      "投資家向け事業計画書のブラッシュアップ",
      "資本政策に関する一般的な財務コンサルティング",
    ],
    note: "※当社は金融商品取引業の登録を受けた事業者ではなく、特定の有価証券・金融商品に関する個別の投資判断助言、投資勧誘、媒介・代理業務は行いません。",
  },
  {
    key: "Grants",
    headline: "Ascent Grants ｜ 補助金の活用支援",
    tagline: "制度を、戦略に変える。",
    body: "ものづくり補助金、事業再構築補助金、IT導入補助金、小規模事業者持続化補助金など、経済産業省系を中心とした補助金制度を対象に、補助金活用に必要な情報提供、制度診断、事業計画書のブラッシュアップ、採択後対応に関するアドバイザリーまで、コンサルティング業務としてご支援します。",
    serviceLines: [
      "活用可能な補助金の制度診断",
      "補助金申請に向けた事業計画のブラッシュアップ・コンサルティング",
      "加点項目取得に関するアドバイザリー（経営革新計画・事業継続力強化計画など）",
      "採択後の実績報告および精算手続きに関するアドバイザリー",
    ],
    note: "※当社は行政書士・社会保険労務士ではありません。官公署への申請書類の作成代行業務は行わず、お客様による申請に向けたコンサルティング・アドバイザリー業務をご提供します。",
  },
  {
    key: "M&A",
    headline: "Ascent M&A ｜ M&Aアドバイザリー",
    tagline: "事業譲渡も、事業買収も。その先の未来を共に描く。",
    body: "中小企業のスモールM&A領域に特化し、売却（事業承継・選択と集中）と買収（成長戦略・連続買収）の両サイドを支援します。売り手・買い手のいずれの立場でも、中立かつ専門的な視点から、納得感のあるディール成立を目指します。",
    lineSections: [
      {
        title: "Sell-Side Advisory（売り手支援）",
        items: [
          "企業概要書・ノンネームシートの作成支援",
          "買い手候補のソーシング・マッチング",
          "基本合意・最終契約に向けた条件整理",
          "弁護士・税理士・公認会計士による各種デューデリジェンスのアレンジメント",
          "ストラクチャー検討に関する一般的なアドバイザリー",
        ],
      },
      {
        title: "Buy-Side Advisory（買い手支援）",
        items: [
          "買収戦略の策定・ターゲット業界の検討",
          "売却案件のソーシング",
          "各種専門家による財務・税務・法務デューデリジェンスのコーディネーション",
          "買収後統合（PMI）に関する一般的なアドバイザリー",
        ],
      },
    ],
    note: "※当社は弁護士・税理士・公認会計士の独占業務（法務デューデリジェンス、税務申告書作成、会計監査等）を直接提供することはありません。これらの業務については、提携の各専門家をアサインのうえご支援いたします。",
  },
  {
    key: "Sales",
    headline: "Ascent Sales ｜ 営業戦略支援",
    tagline: "持続可能な収益エンジンを、共に構築する。",
    body: "持続的な企業成長は、確かな収益基盤から始まります。Ascent Salesは、営業戦略の設計から実行支援までを通じて、企業の収益基盤の構築をご支援します。BtoBの新規顧客開拓、インサイドセールスチームの構築、営業組織のKPI設計までを一貫して支援します。",
    serviceLines: [
      "BtoB新規開拓代行",
      "インサイドセールスチームの構築・運用代行",
      "営業戦略・KPI設計",
      "営業資料・トークスクリプト・提案書の制作",
      "CRM/SFA（Salesforce・HubSpot等）の導入支援",
    ],
    note: "※当社の営業支援業務においては、特定電子メール法・特定商取引法その他関連法令を遵守し、適正な営業活動を行います。",
  },
];

type Props = {
  scrollRef: RefObject<HTMLDivElement | null>;
  activeIndex?: number;
};

const getServicePcEntryLiftPx = (prev: number) =>
  prev === SECTION_INDEX.approach ? 10 : 0;

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

export function ServiceSection({ scrollRef, activeIndex = 0 }: Props) {
  const shellRef = useRef<HTMLElement>(null);
  const getPcEntryLiftPx = useCallback(getServicePcEntryLiftPx, []);
  const isPcGrid = useSyncExternalStore(subscribePcGrid, getPcGridSnapshot, () => false);

  usePcShellAsmHeroReveal({
    shellRef,
    activeIndex,
    sectionIndex: SECTION_INDEX.service,
    readyClass: "service-pc-asm-ready",
    lockAttr: "data-service-pc-asm-lock",
    visitedClass: "service-pc-asm-visited",
    layoutEventName: "service-fv-layout",
    finalizeDatasetKey: "serviceAsmFinalize",
    getPcEntryLiftPx,
    entryLiftCssVar: "--service-pc-asmn-approach-entry-lift",
  });

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const scrollArea = scrollRef.current;
    if (!shell || !scrollArea || typeof window === "undefined") return;

    const mqFlow = window.matchMedia(mediaQueries.flow);
    /** ASMN リビール中は座標を固定（ms） */
    const SERVICE_ASM_LAYOUT_LOCK_MS = 1000;
    let layoutRevealLockUntil = 0;

    const isServiceFrameActive = () => {
      const frame = shell.closest(".section-frame");
      return frame?.classList.contains("is-active") ?? false;
    };

    const isTrackAnimating = () =>
      document
        .querySelector(".section-track")
        ?.getAnimations()
        .some((anim) => anim.playState === "running") ?? false;

    const notifyLayout = (force = false) => {
      if (!mqFlow.matches) {
        shell.classList.remove("service-entry-ready", "service-fv-reveal-go");
        shell.removeAttribute("data-service-asm-lock");
        return;
      }

      if (!isServiceFrameActive()) return;

      /* 表示前・リビール中は再配置しない（1回だけ確定） */
      if (
        !force &&
        (!shell.classList.contains("service-entry-ready") ||
          shell.hasAttribute("data-service-asm-lock") ||
          Date.now() < layoutRevealLockUntil)
      ) {
        return;
      }

      shell.dispatchEvent(
        new CustomEvent("service-fv-layout", { detail: { sync: force } }),
      );
    };

    const canStartSpReveal = () =>
      mqFlow.matches &&
      activeIndex === SECTION_INDEX.service &&
      isServiceFrameActive() &&
      !isSectionTrackTransitioning() &&
      !isTrackAnimating();

    const markEntryReady = () => {
      if (!canStartSpReveal()) return;

      const alreadyReady = shell.classList.contains("service-entry-ready");
      if (!alreadyReady) {
        /* 計測用フラグ → AsmCrossEyebrow で幅を取ってから座標確定 */
        shell.dataset.serviceAsmFinalize = "1";
        notifyLayout(true);
        delete shell.dataset.serviceAsmFinalize;
        shell.classList.add("service-entry-ready");
        /* 確定座標のままインライン opacity を外し、CSS リビールへ委譲 */
        notifyLayout(true);
        /* 18px 初期姿勢を1フレーム描画してから transition（opacity のみに見えるのを防ぐ） */
        void shell.offsetHeight;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            shell.classList.add("service-fv-reveal-go");
            shell.classList.remove("service-fv-pending");
            shell.setAttribute("data-service-asm-lock", "");
            layoutRevealLockUntil = Date.now() + SERVICE_ASM_LAYOUT_LOCK_MS;
            notifyLayout(true);
            window.setTimeout(() => {
              shell.removeAttribute("data-service-asm-lock");
            }, SERVICE_ASM_LAYOUT_LOCK_MS);
          });
        });
      } else if (
        !shell.classList.contains("service-fv-reveal-go") &&
        !shell.hasAttribute("data-service-asm-lock")
      ) {
        void shell.offsetHeight;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            shell.classList.add("service-fv-reveal-go");
            shell.classList.remove("service-fv-pending");
            shell.setAttribute("data-service-asm-lock", "");
            layoutRevealLockUntil = Date.now() + SERVICE_ASM_LAYOUT_LOCK_MS;
            notifyLayout(true);
            window.setTimeout(() => {
              shell.removeAttribute("data-service-asm-lock");
            }, SERVICE_ASM_LAYOUT_LOCK_MS);
          });
        });
      } else if (!shell.hasAttribute("data-service-asm-lock")) {
        notifyLayout(true);
      }
    };

    const runLayoutSoon = (force = false) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => notifyLayout(force));
      });
    };

    const runReadySoon = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(markEntryReady);
      });
    };

    const runReadyAfterSlideEnd = () => {
      const tick = () => {
        if (
          isSectionTrackTransitioning() ||
          isTrackAnimating() ||
          !isServiceFrameActive()
        ) {
          requestAnimationFrame(tick);
          return;
        }
        runReadySoon();
      };
      requestAnimationFrame(tick);
    };

    let exitResetOnTrackEnd: ((e: Event) => void) | undefined;

    const resetServiceVisualState = () => {
      shell.classList.remove(
        "service-entry-ready",
        "service-fv-reveal-go",
        "service-fv-pending",
      );
      shell.removeAttribute("data-service-asm-lock");
      delete shell.dataset.serviceAsmFinalize;
      layoutRevealLockUntil = 0;
    };

    const syncServiceFvPending = () => {
      const shouldPending =
        mqFlow.matches &&
        activeIndex === SECTION_INDEX.service &&
        (isSectionTrackTransitioning() ||
          !isServiceFrameActive() ||
          !shell.classList.contains("service-fv-reveal-go"));
      shell.classList.toggle("service-fv-pending", shouldPending);
    };

    syncServiceFvPending();

    if (activeIndex === SECTION_INDEX.service) {
      if (!shell.classList.contains("service-entry-ready")) {
        shell.classList.remove("service-fv-reveal-go");
      }
      if (!isSectionTrackTransitioning()) {
        shell.removeAttribute("data-service-asm-lock");
        delete shell.dataset.serviceAsmFinalize;
      }
    } else if (
      shell.classList.contains("service-entry-ready") ||
      shell.classList.contains("service-fv-reveal-go")
    ) {
      const trackEl = document.querySelector(".section-track");
      if (trackEl) {
        exitResetOnTrackEnd = (e: Event) => {
          const te = e as TransitionEvent;
          if (te.propertyName !== "transform" || te.target !== trackEl) return;
          trackEl.removeEventListener("transitionend", exitResetOnTrackEnd!);
          exitResetOnTrackEnd = undefined;
          resetServiceVisualState();
        };
        trackEl.addEventListener("transitionend", exitResetOnTrackEnd);
      } else {
        resetServiceVisualState();
      }
    }

    const ro = new ResizeObserver(() => {
      if (!shell.classList.contains("service-entry-ready")) return;
      runLayoutSoon(false);
    });
    ro.observe(scrollArea);
    const tagline = scrollArea.querySelector(".service-fv .message-tagline");
    if (tagline) ro.observe(tagline);
    const titlesAxis = scrollArea.querySelector(".service-fv .message-titles-axis");
    if (titlesAxis) ro.observe(titlesAxis);
    const onResize = () => {
      if (!shell.classList.contains("service-entry-ready")) return;
      runLayoutSoon(true);
    };
    const onMqChange = () => {
      shell.classList.remove("service-entry-ready", "service-fv-reveal-go");
      shell.removeAttribute("data-service-asm-lock");
      delete shell.dataset.serviceAsmFinalize;
      if (mqFlow.matches) {
        requestAnimationFrame(() => {
          if (!isTrackAnimating()) runReadySoon();
        });
      }
    };

    window.addEventListener("resize", onResize);
    mqFlow.addEventListener("change", onMqChange);

    const track = document.querySelector(".section-track");
    const onTrackTransitionEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "transform" || te.target !== track) return;
      if (!mqFlow.matches) {
        runLayoutSoon(true);
        return;
      }
      if (activeIndex !== SECTION_INDEX.service) return;
      if (!shell.classList.contains("service-fv-reveal-go")) {
        runReadyAfterSlideEnd();
      }
    };
    track?.addEventListener("transitionend", onTrackTransitionEnd);
    const onTrackTransitionMaybeEnd = () => syncServiceFvPending();
    track?.addEventListener("transitionend", onTrackTransitionMaybeEnd);

    const readyFallbackId = mqFlow.matches
      ? window.setTimeout(() => {
          if (!shell.classList.contains("service-entry-ready")) {
            runReadyAfterSlideEnd();
          }
        }, 900)
      : undefined;

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      mqFlow.removeEventListener("change", onMqChange);
      track?.removeEventListener("transitionend", onTrackTransitionEnd);
      track?.removeEventListener("transitionend", onTrackTransitionMaybeEnd);
      if (readyFallbackId !== undefined) window.clearTimeout(readyFallbackId);
      if (exitResetOnTrackEnd) {
        track?.removeEventListener("transitionend", exitResetOnTrackEnd);
      }
    };
  }, [scrollRef, activeIndex]);

  return (
    <section ref={shellRef} className="section-shell service-shell">
      <div ref={scrollRef} className="service-scroll-area">
        <div className="service-fv">
          <div className="service-fv-main">
            <div className="message-titles-stack">
              <div className="message-titles-axis">
                <h2 className="message-heading reveal-item reveal-delay-2 service-fv-unified-reveal">
                  SERVICE
                </h2>
                <h3 className="message-tagline reveal-item reveal-delay-3 service-fv-unified-reveal">
                  4つの専門領域で、
                  <br />
                  企業価値の最大化を支援する。
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="service-body-stack">
          <div className="content-grid message-body-grid service-cards-grid pb-28 md:pb-28">
            <div className="col-span-12 flex flex-col gap-8 md:gap-10">
              {services.map((service) => (
                <article
                  key={service.key}
                  className="service-card reveal-item reveal-delay-4"
                >
                  <p className="service-key">{service.key}</p>
                  <h3 className="service-headline">{service.headline}</h3>
                  <p className="service-tagline">{service.tagline}</p>
                  <p className="service-body">{service.body}</p>

                  {service.lineSections?.map((section) => (
                    <div key={section.title} className="service-line-block">
                      <p className="service-lines-label">{section.title}</p>
                      <ul className="service-lines">
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {service.serviceLines ? (
                    <div className="service-line-block">
                      <p className="service-lines-label">Service Lines</p>
                      <ul className="service-lines">
                        {service.serviceLines.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {service.note ? (
                    <p className="service-note">{service.note}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
