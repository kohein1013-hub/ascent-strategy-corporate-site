"use client";

import { useCallback, useState } from "react";

import { PaperGrainBackground } from "@/components/background/PaperGrainBackground";
import { GridOverlay } from "@/components/background/GridOverlay";
import { SectionNavigator } from "@/components/navigation/SectionNavigator";

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const handleSectionChange = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  return (
    <div className="site-viewport relative min-h-dvh text-[var(--text-primary)]">
      <PaperGrainBackground activeIndex={activeIndex} />
      <GridOverlay activeIndex={activeIndex} />
      <SectionNavigator onActiveIndexChange={handleSectionChange} />
    </div>
  );
}
