import type { NextConfig } from "next";

/**
 * 実機（LAN）から dev サーバーにアクセスするとき、Next.js 16 は
 * `/_next/*` の JS/CSS をクロスオリジン扱いでブロックする（403）。
 * ここに Mac の LAN IP を登録しないと、スマホでは HTML だけ表示され JS が動かない。
 *
 * IP が変わったら更新するか、環境変数 LAN_DEV_ORIGINS=10.x.x.x,192.168.x.x を設定。
 */
const lanDevOrigins =
  process.env.LAN_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? ["10.13.88.210", "100.64.1.71"];

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins,
  /* 親 workspace の package-lock.json より本プロジェクトを Turbopack ルートに固定（dev 404 防止） */
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
