"use client";

import { useLayoutEffect, useState } from "react";

import { mediaQueries } from "@/lib/breakpoints";

function detectCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia(mediaQueries.flow).matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

/** タッチ主体デバイス（SP / タブレット）かどうか */
export function useCoarsePointer(): boolean {
  const [isCoarse, setIsCoarse] = useState(detectCoarsePointer);

  useLayoutEffect(() => {
    const flowMq = window.matchMedia(mediaQueries.flow);
    const coarseMq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarse(flowMq.matches || coarseMq.matches);
    update();
    flowMq.addEventListener("change", update);
    coarseMq.addEventListener("change", update);
    return () => {
      flowMq.removeEventListener("change", update);
      coarseMq.removeEventListener("change", update);
    };
  }, []);

  return isCoarse;
}
