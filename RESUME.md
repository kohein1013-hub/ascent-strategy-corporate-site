# Ascent Strategy — 作業再開メモ（New Agent 用）

**ワークスペース**: `projects/ascent-strategy-corporate-site` のみ（`blank` 全体ではない）

**New Agent 開始時はこのファイルと `AGENTS.md` のみ読む。** コード探索・glob・Task サブエージェントは禁止（最初の往復）。

## 現在の作業

- **セクション**：Service SP（FV タイトル帯）
- **目的**：遷移時 ASMN 非表示・見出し／キャッチのリビール不具合
- **触ってよいファイル**：`ServiceSection.tsx`（SP className 分支）、`globals.css` の `@media (max-width: 768px)` Service FV タイトル帯
- **触ってはいけない**：Service PC（`ascent-service-pc-locked.mdc`）、Network 誤修正は revert 済み

## 直近の状態

- **完了（PC Contact）**：フォーム上ホイールでセクション遷移（確定）
- **完了（Service SP FV タイトル帯）**：
  - SP ASMN を `service-unified-asmn` に分離（PC は `hero-bilingual-reveal` のまま）
  - チラつき対策：スライド完了後リビール（Approach 同型）、`is-transitioning` 中は FV 非表示
- **未完了**：ユーザー実機確認（チラつき解消）
- **次の1手**：SP で Message→Service 遷移の録画確認

## SP 作業時の PC 分離（必須）

- CSS は **`@media (max-width: 768px)` 内だけ**変更（`@media (min-width: 769px)`・ベースの PC ブロック禁止）
- JS は **`mediaQueries.flow`（768px 以下）分支のみ**、または既存の `!mq.matches` / `!isPcGrid` ガード内のみ
- 共有 TSX を触る場合も **SP 分支に閉じる**（PC ロック済みファイルは読み取りのみ）
- 詳細：`.cursor/rules/ascent-pc-work-sp-isolation.mdc`

## 起動時の禁止事項（クラッシュ防止）

- `globals.css` 丸ごと読込禁止 → `Grep` + `Read`（offset/limit）
- `.next/` / `node_modules/` 検索・読込禁止
- 全セクション TSX の一括 Read 禁止
- `Task` / `explore` サブエージェント禁止（ユーザーが明示指示するまで）

## 更新ルール

作業終了前にこのファイルを更新してからチャットを閉じる。
