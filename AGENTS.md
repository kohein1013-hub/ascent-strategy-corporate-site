<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor 安定化のための自動実行ルール

長時間セッションでの Cursor クラッシュ（メモリ・トークン枯渇）を防ぐ。詳細は `.cursor/rules/ascent-cursor-stability.mdc` を参照。

### 要点

1. **20往復**で新チャット開始を提案（25・30往復で再提案）
2. セッション開始時・**1時間ごと**に `clear` でターミナル履歴をクリア
3. **30分ごと**に Cursor メモリを確認、**8GB超**で再起動を提案（最大3回/セッション）
4. 作業終了キーワードでセッションサマリー記録を提案
5. **`globals.css` は部分読み**、`.next/` / `node_modules/` は触らない

### New Agent 再開手順

1. **`RESUME.md` を最初に読む**（このファイルより優先）
2. コード探索は**2往復目以降**、指定ファイルのみ
3. 作業終了前に `RESUME.md` を更新

### セッション引き継ぎメモ（エージェント用）

<!-- 新チャット開始時にここへ前回の続きを追記。詳細は RESUME.md へ -->

