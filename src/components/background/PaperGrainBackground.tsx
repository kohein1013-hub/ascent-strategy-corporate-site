"use client";

import type { CSSProperties } from "react";

import { ShaderMount } from "@paper-design/shaders-react";
import {
  GrainGradientShapes,
  ShaderFitOptions,
  defaultObjectSizing,
  getShaderColorFromString,
  getShaderNoiseTexture,
  grainGradientFragmentShader,
  isPaperShaderElement,
  type PaperShaderElement,
} from "@paper-design/shaders";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCoarsePointer } from "@/lib/useCoarsePointer";
import { grainColorBack, sectionPalettes } from "./section-palettes";

const SPHERE_SCALE_MIN = 1.7;
const SPHERE_SCALE_MAX = 2.15;
const SPHERE_SCALE_DEFAULT = (SPHERE_SCALE_MIN + SPHERE_SCALE_MAX) / 2;
const INITIAL_GRAIN_FRAME_MS = 4_200;
const NOISE_CAP = 0.014;
const NOISE_BASE = 0.008;
/** ブルーのハイライトが画面を横切る幅（小さすぎると画面外に出る） */
const OFFSET_RANGE = 0.22;
const SPEED_SCALE = 0.72;
/**
 * 背面色がロイヤルブルーになったため、オレンジのスフィアを画面の約 70% に
 * 広げ、ロイヤルブルーが縁の約 30% に収まるよう中央やや右下に寄せる。
 * 値を大きくしすぎるとオレンジが画面外へ寄り、ブルーが増える。
 */
const BLUE_OFFSET_BIAS_X = 0.08;
const BLUE_OFFSET_BIAS_Y = 0.06;

type Props = {
  activeIndex: number;
};

type Motion = {
  intensity: number;
  noise: number;
  softness: number;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  speed: number;
};

function pickMotionTargets(): Motion {
  return {
    // ブルーの広がりを抑えめにし、オレンジ優勢（約 70%）を保つ
    intensity: 0.1 + Math.random() * 0.2,
    noise: Math.random() * 0.012,
    softness: 0.05 + Math.random() * 0.22,
    scale: SPHERE_SCALE_MIN + Math.random() * (SPHERE_SCALE_MAX - SPHERE_SCALE_MIN),
    rotation: Math.random() * 360,
    // ブルーのスフィアを常に右下寄りにバイアスして画面占有を約 30% に収める
    offsetX: BLUE_OFFSET_BIAS_X + (Math.random() - 0.5) * OFFSET_RANGE,
    offsetY: BLUE_OFFSET_BIAS_Y + (Math.random() - 0.5) * OFFSET_RANGE,
    speed: 0.18 + Math.random() * 0.72,
  };
}

function pickInitialMotionTargets(): Motion {
  const r = pickMotionTargets();
  return {
    ...r,
    offsetX: BLUE_OFFSET_BIAS_X + (Math.random() - 0.5) * 0.12,
    offsetY: BLUE_OFFSET_BIAS_Y + (Math.random() - 0.5) * 0.12,
    rotation: 88 + Math.random() * 84,
    softness: Math.min(0.3, r.softness),
    intensity: Math.min(0.24, Math.max(0.12, r.intensity * 0.68)),
    noise: Math.min(r.noise, NOISE_CAP),
  };
}

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngleDeg(from: number, to: number, t: number): number {
  const d = ((to - from + 540) % 360) - 180;
  return from + d * t;
}

function buildUniforms(palette: readonly string[]) {
  return {
    u_colorBack: getShaderColorFromString(grainColorBack),
    u_colors: palette.map(getShaderColorFromString),
    u_colorsCount: palette.length,
    u_softness: 0.2,
    u_intensity: 0.14,
    u_noise: NOISE_BASE,
    u_shape: GrainGradientShapes.sphere,
    u_noiseTexture: getShaderNoiseTexture(),
    u_fit: ShaderFitOptions.cover,
    u_scale: SPHERE_SCALE_DEFAULT,
    u_rotation: 0,
    u_offsetX: defaultObjectSizing.offsetX,
    u_offsetY: defaultObjectSizing.offsetY,
    u_originX: defaultObjectSizing.originX,
    u_originY: defaultObjectSizing.originY,
    u_worldWidth: defaultObjectSizing.worldWidth,
    u_worldHeight: defaultObjectSizing.worldHeight,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** "#rrggbb" → [r, g, b]（0..255） */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** 2 つのパレット間を t（0..1）で線形補間し、shader 用の色配列を返す */
function lerpPalette(
  from: readonly string[],
  to: readonly string[],
  t: number,
): string[] {
  const count = Math.max(from.length, to.length);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = hexToRgb(from[Math.min(i, from.length - 1)]);
    const b = hexToRgb(to[Math.min(i, to.length - 1)]);
    out.push(
      rgbToHex(
        lerp(a[0], b[0], t),
        lerp(a[1], b[1], t),
        lerp(a[2], b[2], t),
      ),
    );
  }
  return out;
}

/** セクション遷移に合わせた背景パレットのクロスフェード時間 */
const PALETTE_FADE_MS = 850;

function CssGrainBackground({
  activeIndex,
}: {
  activeIndex: number;
}) {
  const palette = sectionPalettes[activeIndex % sectionPalettes.length];
  const orange = palette[0];
  const blue = palette[palette.length - 1];
  const c1 = hexToRgba(orange, 0.62);
  const c2 = hexToRgba(blue, 0.55);

  return (
    <div className="paper-grain-bg paper-grain-bg--css" aria-hidden>
      <div
        className="paper-grain-bg__blob paper-grain-bg__blob--a"
        style={
          {
            background: `radial-gradient(circle at 38% 50%, ${c1}, transparent 78%)`,
          } as CSSProperties
        }
      />
      <div
        className="paper-grain-bg__blob paper-grain-bg__blob--b"
        style={
          {
            background: `radial-gradient(circle at 84% 78%, ${c2}, transparent 52%)`,
          } as CSSProperties
        }
      />
    </div>
  );
}

function WebGlGrainBackground({
  activeIndex,
  onWebGlFailed,
}: Props & { onWebGlFailed?: () => void }) {
  const isCoarse = useCoarsePointer();
  const hostRef = useRef<PaperShaderElement | null>(null);
  const palette = sectionPalettes[activeIndex % sectionPalettes.length];
  const uniforms = useMemo(() => buildUniforms(palette), [palette]);

  const motionFrom = useRef<Motion | null>(null);
  const motionTo = useRef<Motion | null>(null);
  const segmentStart = useRef(0);
  const segmentMs = useRef(4000);
  /** 現在画面に表示中のパレット（クロスフェードの起点） */
  const displayedPalette = useRef<readonly string[] | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    motionFrom.current = pickInitialMotionTargets();
    motionTo.current = pickMotionTargets();
    segmentMs.current = 3000 + Math.random() * 4800;

    let raf = 0;
    let mountCheckTimer = 0;
    let mountReady = false;

    mountCheckTimer = window.setTimeout(() => {
      if (!mountReady && onWebGlFailed) {
        onWebGlFailed();
      }
    }, 2800);

    const tick = (now: number) => {
      if (!el.isConnected) return;
      if (!isPaperShaderElement(el) || !el.paperShaderMount) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (!mountReady) {
        mountReady = true;
        window.clearTimeout(mountCheckTimer);
      }
      const mount = el.paperShaderMount;

      if (mq.matches) {
        mount.setSpeed(0.05);
        mount.setUniforms({
          u_intensity: 0.14,
          u_noise: 0.006,
          u_softness: 0.22,
          u_scale: SPHERE_SCALE_DEFAULT,
          u_rotation: 0,
          u_offsetX: 0,
          u_offsetY: 0,
        });
        raf = requestAnimationFrame(tick);
        return;
      }

      let m0 = motionFrom.current;
      let m1 = motionTo.current;
      if (!m0 || !m1) {
        raf = requestAnimationFrame(tick);
        return;
      }

      let u = (now - segmentStart.current) / segmentMs.current;
      if (u >= 1) {
        motionFrom.current = { ...m1 };
        motionTo.current = pickMotionTargets();
        segmentStart.current = now;
        segmentMs.current = 2800 + Math.random() * 6800;
        u = 0;
        m0 = motionFrom.current;
        m1 = motionTo.current;
        if (!m0 || !m1) {
          raf = requestAnimationFrame(tick);
          return;
        }
      }

      const t = smoothstep01(u);
      const wiggle = Math.sin(now * 0.00062) * 0.002;

      mount.setUniforms({
        u_intensity: lerp(m0.intensity, m1.intensity, t) + wiggle,
        u_noise: Math.min(NOISE_CAP, lerp(m0.noise, m1.noise, t)),
        u_softness: Math.min(0.34, lerp(m0.softness, m1.softness, t)),
        u_scale: Math.min(
          SPHERE_SCALE_MAX,
          Math.max(SPHERE_SCALE_MIN, lerp(m0.scale, m1.scale, t)),
        ),
        u_rotation: lerpAngleDeg(m0.rotation, m1.rotation, t),
        u_offsetX: lerp(m0.offsetX, m1.offsetX, t),
        u_offsetY: lerp(m0.offsetY, m1.offsetY, t),
      });
      mount.setSpeed(lerp(m0.speed, m1.speed, t) * SPEED_SCALE);

      raf = requestAnimationFrame(tick);
    };

    segmentStart.current = performance.now();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(mountCheckTimer);
    };
  }, [onWebGlFailed]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !isPaperShaderElement(el)) return;
    const mount = el.paperShaderMount;
    if (!mount) return;

    // 現在表示中のパレット（前回の色）から新パレットへ滑らかにクロスフェード。
    // パッと切り替わらないよう、PALETTE_FADE_MS かけて色を線形補間する。
    const fromPalette = displayedPalette.current ?? palette;
    const toPalette = palette;
    displayedPalette.current = toPalette;

    // 初回はフェード不要（同色 or 初期化）
    const isSame = fromPalette.every((c, i) => c === toPalette[i]);
    if (isSame) {
      mount.setUniforms({
        u_colors: toPalette.map(getShaderColorFromString),
        u_colorsCount: toPalette.length,
      });
      return;
    }

    const start = performance.now();
    let raf = 0;
    const animate = (now: number) => {
      const t = smoothstep01((now - start) / PALETTE_FADE_MS);
      const blended = lerpPalette(fromPalette, toPalette, t);
      mount.setUniforms({
        u_colorBack: getShaderColorFromString(grainColorBack),
        u_colors: blended.map(getShaderColorFromString),
        u_colorsCount: blended.length,
      });
      if (t < 1) {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(raf);
  }, [palette]);

  return (
    <div className="paper-grain-bg" aria-hidden>
      <ShaderMount
        ref={hostRef}
        className="paper-grain-bg__shader"
        fragmentShader={grainGradientFragmentShader}
        uniforms={uniforms}
        frame={INITIAL_GRAIN_FRAME_MS}
        speed={0.32}
        minPixelRatio={isCoarse ? 1 : 2}
        maxPixelCount={isCoarse ? 1280 * 720 : 2560 * 1440}
        webGlContextAttributes={{
          powerPreference: "low-power",
          failIfMajorPerformanceCaveat: false,
        }}
      />
    </div>
  );
}

export function PaperGrainBackground({ activeIndex }: Props) {
  const [useCssFallback, setUseCssFallback] = useState(false);

  if (useCssFallback) {
    return <CssGrainBackground activeIndex={activeIndex} />;
  }

  return (
    <WebGlGrainBackground
      activeIndex={activeIndex}
      onWebGlFailed={() => setUseCssFallback(true)}
    />
  );
}
