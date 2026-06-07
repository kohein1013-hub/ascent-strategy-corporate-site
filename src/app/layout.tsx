import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import {
  Barlow_Condensed,
  Noto_Sans_JP,
  Noto_Serif_JP,
} from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerif = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

/**
 * ロゴ用。DIN 2014 に近い無料ウェブフォントとして Barlow Condensed Bold（Google Fonts / SIL OFL）。
 */
const brandLogo = Barlow_Condensed({
  weight: "700",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-din-2014",
});

export const metadata: Metadata = {
  title: "Ascent strategy",
  description: "Financial strategy for every stage of corporate growth.",
};

/** 入力フォーカス時の iOS 自動ズーム抑止 + キーボードはレイアウトをリサイズしない */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "overlays-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSans.variable} ${notoSerif.variable} ${brandLogo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
