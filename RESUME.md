# Ascent Strategy — 作業再開メモ（New Agent 用）

**ワークスペース**: `projects/ascent-strategy-corporate-site` のみ（`blank` 全体ではない）

**New Agent 開始時はこのファイルと `AGENTS.md` のみ読む。** コード探索・glob・Task サブエージェントは禁止（最初の往復）。

## 現在の作業

- **フェーズ**：クライアントプレビュー公開済み → **Vercel URL 上で見つけた調整**（下記リストに追記しながら進行）
- **プレビュー URL**：https://ascent-strategy-corporate-site-ozj2.vercel.app/
- **GitHub**：`kohein1013-hub/ascent-strategy-corporate-site`（Public）
- **Vercel**：`kohein1013-7091s-projects` / Framework **Next.js**（`Other`+`public` 出力だと 404 になるので注意）
- **運用方針**：**Vercel のみ運用**（ローカル `npm run dev` は使わない・クラッシュ防止）
- **デプロイ**：同じ URL を維持（`main` push → 自動デプロイ 1〜3 分）
- **触ってはいけない**：各 PC ロック済みセクション（明示指示まで）

## Vercel 調整リスト

形式：`セクション / PC|SP / 現象 / 期待する見え方`

**記入ルール**

- Vercel で気づいたら 1 行 1 件で追記
- セクション単位でまとめて修正 → push
- 「Vercel のみ再現」「ローカル dev のみ再現」等の環境メモも追記可
- 完了した行は `[x]` に変更

### top（Hero）

- [ ] _（未記入 — Vercel 確認後に追記）_

### message

- [ ] _（未記入）_

### service

- [ ] _（未記入）_

### approach

- [ ] _（未記入）_

### network

- [ ] _（未記入）_

### company

- [ ] _（未記入）_

### contact

- [ ] _（未記入）_

### 横断（ナビ・グローバル UI 等）

- [ ] _（未記入）_

---

## 調整〜確認の流れ（Vercel のみ運用）

**ローカルサーバーは起動しない。** Cursor で編集 → push → Vercel URL で確認。

### Step 1 — リストに追記

Vercel で気づいたら上記「Vercel 調整リスト」に 1 行追加。

### Step 2 — Cursor で編集

- セクション単位・1〜2 ファイルずつ
- Agent への依頼例：`service / PC / 見出しが2行になる / 1行のまま`

### Step 3 — push（任意で軽いチェック）

```bash
npm run typecheck   # 任意・サーバー不要・軽い
git add .
git commit -m "fix: （内容）"
git push origin main
```

### Step 4 — Vercel で確認（1〜3 分待つ）

1. Vercel Dashboard で Deployment が **Success**
2. https://ascent-strategy-corporate-site-ozj2.vercel.app/
3. **PC ブラウザ** + **スマホ実機**（同じ URL）で確認
4. **ハードリロード**（Cmd+Shift+R）またはシークレットウィンドウ
5. OK → リストを `[x]` / NG → Step 2 に戻る

**push 単位の目安**：1 セクション分、または関連 2〜3 件まとめ

---

## ローカル dev 運用（現在は未使用）

メモリ不足でクラッシュするため **当面オフ**。再開する場合のみ下記を参照。

- 起動前: `npm run dev:status` / 停止: `npm run dev:stop`
- PC: `npm run dev` / SP: `npm run dev:lan`
- push 前: `npm run preview:prod`

---

## ローカル vs Vercel の乖離（想定内）

| 要因 | ローカル `dev` | Vercel |
|------|----------------|--------|
| バンドラー | Turbopack | 本番ビルド |
| 最適化 | 未最適化 | minify 済み |
| SP 実機 | `dev:lan` 必須 | URL 直アクセス |
| キャッシュ | ほぼなし | ブラウザ + CDN |

`npm run dev` だけでは Vercel と完全一致しない。**push 前は必ず `preview:prod`**（内部で `dev:stop` 実行）。

---

## 開発サーバー運用（クラッシュ防止）

**原因（2026-06-09 調査）**: Cursor 単体 ~3.5GB + Next dev ~1GB + build ~1.5GB を**同時起動**するとメモリ枯渇 → Cursor クラッシュ。前セッションで dev(3000) + start(3001) を同時起動していた。

| やること | コマンド |
|----------|----------|
| 起動前チェック | `npm run dev:status` |
| 日常（PC） | `npm run dev` |
| SP 実機 | `npm run dev:lan` |
| **停止** | `npm run dev:stop` |
| push 前確認 | `npm run preview:prod`（dev 停止 → build → start） |

**鉄則**

1. **dev と start/build を同時に走らせない**
2. **Agent にサーバー起動を任せない** — 自分の Terminal.app で起動
3. CSS 編集時は globals.css（5773 行）の HMR が重い → 1 セクションずつ
4. Cursor が重いとき（8GB 超）は Cursor 再起動 → `dev:stop` → dev だけ起動

---

## SP 作業時の PC 分離（必須）

- CSS は **`@media (max-width: 768px)` 内だけ**変更（`@media (min-width: 769px)`・ベースの PC ブロック禁止）
- JS は **`mediaQueries.flow`（768px 以下）分支のみ**、または既存の `!mq.matches` / `!isPcGrid` ガード内のみ
- 共有 TSX を触る場合も **SP 分支に閉じる**（PC ロック済みファイルは読み取りのみ）
- 詳細：`.cursor/rules/ascent-pc-work-sp-isolation.mdc`

## 直近の状態（2026-06-09 セッション）

- **完了（クラッシュ対策）**：
  - 原因特定：Cursor ~3.5GB + サーバー二重起動（dev + start 同時）→ メモリ枯渇
  - `scripts/dev-server.sh` + `npm run dev:status` / `dev:stop` 追加
  - `preview:prod` を dev 停止込みに変更
  - `.cursor/rules/ascent-cursor-stability.mdc` にサーバー運用ルール追記
- **完了（ワークフロー整備）**：
  - RESUME に Vercel 調整リスト（セクション別）と 3 Phase フローを追記
  - `npm run preview:prod` 追加（push 前本番同等確認用）
  - Vercel URL 表示確認（全セクション DOM 到達・2026-06-09）
- **完了（プレビュー共有・2026-06-07）**：
  - 初回コミット `cc16fb9` → GitHub push 済み
  - Vercel デプロイ成功（Framework Preset を Next.js に修正）
  - Deployment Protection オフ・URL 表示確認済み
  - ビルド修正：`SectionNavigator.tsx` の `querySelector<HTMLElement>` 型
- **完了（Service SP FV タイトル帯・前セッション）**：ASMN 分離・スライド後リビール・`is-transitioning` 中 FV 非表示
- **運用切替（2026-06-09）**：**Vercel のみ運用**を採用（ローカル dev は使わない）
- **完了（日本語フォント）**：明朝統一を適用（`src/lib/japaneseFontMode.ts` → `"mincho"`）。戻すときは `"gothic"` に変更して push
- **次の1手**：Vercel URL でフォント確認 → 問題なければ push / 調整リストの次項目へ

## 起動時の禁止事項（クラッシュ防止）

- `globals.css` 丸ごと読込禁止 → `Grep` + `Read`（offset/limit）
- `.next/` / `node_modules/` 検索・読込禁止
- 全セクション TSX の一括 Read 禁止
- `Task` / `explore` サブエージェント禁止（ユーザーが明示指示するまで）

## 更新ルール

作業終了前にこのファイルを更新してからチャットを閉じる。
