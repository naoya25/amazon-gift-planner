# gift-planner

ビンゴ大会・懇親会の景品を「予算ピッタリ」で組み立てるための Web ツール。
必須にしたい景品を指定すると、残予算で穴埋め候補を自動最適化する。

## 現在のステータス

- `docs/prototype/` — HTML プロトタイプ（動作確認可）
- `docs/specs/2026-05-29_gift-planner/` — 仕様書（requirements / design / tasks）
- `src/` — 本実装（未着手、Phase 1 から開始予定）

## 構成（予定）

```
gift-planner/
├── docs/prototype/    HTML/CSS/JS のプロトタイプ
├── specs/             SDD spec（日付ごと）
├── src/
│   ├── shared/        共通スキーマ（Zod）
│   ├── worker/        Cloudflare Workers (Hono)
│   └── web/           React + Vite フロントエンド
├── wrangler.toml      Cloudflare 設定
└── package.json
```

## 技術スタック（予定）

- フロントエンド: React + Vite + TypeScript + zustand + dnd-kit
- バックエンド: Cloudflare Workers + Hono + Zod
- データ: Workers KV（キャッシュ / セッション / レート制限カウンタ）
- 外部 API: Amazon PA-API (paapi5-typescript-sdk) + JapanAI API
- 防御: Cloudflare Turnstile + IP レート制限 + コスト上限カウンタ
- フォント: Playfair Display + Inter + IBM Plex Mono（Google Fonts）

## プロトタイプを動かす

```bash
open docs/prototype/index.html
# または
cd docs/prototype && python3 -m http.server 8080
```

## ロードマップ

詳細は `docs/specs/2026-05-29_gift-planner/tasks.md` を参照。

- Phase 0: 前提準備（Amazon アソシエイト申請、wrangler セットアップ）
- Phase 1: バックエンド API（モック → 本実装）
- Phase 1.5: 防御レイヤー（Turnstile / レート制限 / コスト上限）
- Phase 2: フロントエンド（画面1・2）
- Phase 3: フロントエンド（画面3 + CSV）
- Phase 4: 統合・デプロイ・セキュリティ動作確認
- Phase 5: アフィリエイト3件踏破（PA-API 維持）
