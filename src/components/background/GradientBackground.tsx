import { useEffect, useRef } from "react";

/** 赤みの強いオレンジと紺青がはっきり分かる彩度（青は一段だけ彩度を上げる） */
const sectionPalettes = [
  ["#c4341c", "#1a43b2", "#a81f18"],
  ["#bc2f18", "#173ea5", "#9e1c16"],
  ["#c4371e", "#1e47b2", "#a82118"],
  ["#b82b16", "#13389d", "#941914"],
  ["#c0331a", "#1c41ae", "#a01e16"],
  ["#b62914", "#153399", "#8e1812"],
  ["#c2371c", "#1840aa", "#9c1c16"],
] as const;

type Props = {
  activeIndex: number;
};

function clamp01(n: number, pad = 0.05) {
  return Math.min(1 - pad, Math.max(pad, n));
}

/** 画面端付近へフォーカルを飛ばし、暖色／寒色の支配域が入れ替わるように見せる */
function randomCornerTarget(): { x: number; y: number } {
  const opts = [
    [0.11, 0.13],
    [0.89, 0.13],
    [0.11, 0.87],
    [0.89, 0.87],
    [0.12, 0.5],
    [0.88, 0.5],
    [0.5, 0.12],
    [0.5, 0.88],
  ] as const;
  const [x, y] = opts[Math.floor(Math.random() * opts.length)];
  return {
    x: clamp01(x + (Math.random() - 0.5) * 0.1, 0.05),
    y: clamp01(y + (Math.random() - 0.5) * 0.1, 0.05),
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function lerpColor(a: string, b: string, t: number): string {
  const u = Math.min(1, Math.max(0, t));
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * u);
  const g = Math.round(ag + (bg - ag) * u);
  const bl = Math.round(ab + (bb - ab) * u);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function pickNextFocal(
  fromX: number,
  fromY: number,
): { x: number; y: number } {
  const roll = Math.random();
  if (roll < 0.62) {
    return randomCornerTarget();
  }
  if (roll < 0.82) {
    return {
      x: clamp01(1 - fromX + (Math.random() - 0.5) * 0.14, 0.05),
      y: clamp01(1 - fromY + (Math.random() - 0.5) * 0.14, 0.05),
    };
  }
  return {
    x: clamp01(0.12 + Math.random() * 0.76, 0.05),
    y: clamp01(0.12 + Math.random() * 0.76, 0.05),
  };
}

/** 1 往復（オレンジ優位 → 青優位 → オレンジ優位）の秒数。長めで露骨な切替感を抑える */
const HUE_CYCLE_MS = 34_000;

export function GradientBackground({ activeIndex }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(activeIndex);

  const state = useRef({
    fromX: 0.5,
    fromY: 0.5,
    toX: 0.5,
    toY: 0.5,
    segmentStart: 0,
    segmentDurationMs: 2800,
    hueAnchorMs: 0,
  });

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const s = state.current;
    s.hueAnchorMs = performance.now() - Math.random() * HUE_CYCLE_MS;

    const applyReduced = () => {
      const palette =
        sectionPalettes[activeIndexRef.current % sectionPalettes.length];
      el.style.setProperty("--mx", "0.5");
      el.style.setProperty("--my", "0.5");
      el.style.setProperty("--grad-a", palette[0]);
      el.style.setProperty("--grad-b", palette[1]);
      el.style.setProperty("--grad-c", palette[2]);
    };

    const first = randomCornerTarget();
    s.fromX = clamp01(0.46 + Math.random() * 0.08, 0.05);
    s.fromY = clamp01(0.46 + Math.random() * 0.08, 0.05);
    s.toX = first.x;
    s.toY = first.y;
    s.segmentStart = performance.now();
    s.segmentDurationMs = 1200 + Math.random() * 2800;

    let raf = 0;

    const tick = (now: number) => {
      if (mq.matches) {
        applyReduced();
      } else {
        const palette =
          sectionPalettes[activeIndexRef.current % sectionPalettes.length];
        const phase =
          (Math.sin(
            ((now - s.hueAnchorMs) / HUE_CYCLE_MS) * Math.PI * 2,
          ) +
            1) /
          2;
        el.style.setProperty(
          "--grad-a",
          lerpColor(palette[0], palette[1], phase),
        );
        el.style.setProperty(
          "--grad-b",
          lerpColor(palette[1], palette[0], phase),
        );
        el.style.setProperty("--grad-c", palette[2]);

        let t = (now - s.segmentStart) / s.segmentDurationMs;
        if (t >= 1) {
          s.fromX = s.toX;
          s.fromY = s.toY;
          const next = pickNextFocal(s.fromX, s.fromY);
          s.toX = next.x;
          s.toY = next.y;
          s.segmentStart = now;
          s.segmentDurationMs = 1100 + Math.random() * 3200;
          t = 0;
        }

        const x = s.fromX + (s.toX - s.fromX) * t;
        const y = s.fromY + (s.toY - s.fromY) * t;

        el.style.setProperty("--mx", x.toFixed(4));
        el.style.setProperty("--my", y.toFixed(4));
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="gradient-bg" aria-hidden>
      <div className="gradient-orb orb-a" />
      <div className="gradient-orb orb-b" />
      <div className="gradient-orb orb-c" />
      <div className="noise-layer" />
    </div>
  );
}
