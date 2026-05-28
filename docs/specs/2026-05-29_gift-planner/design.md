# gift-planner — Design

## Technical Approach

Cloudflare Workers をバックエンド、React + Vite をフロントエンドとした **完全 Cloudflare スタック**で構築する。
LocalStorage を主の永続化先とし、サーバーサイドは外部 API のプロキシと最適化計算 + **多層防御** に専念する。

```
[Browser]
  └─ React SPA  ─────────────────────┐
       ├─ LocalStorage（仕分け状態すべて）
       └─ Cloudflare Turnstile（無料 CAPTCHA）
                                     │
                          HTTPS      │
                                     ▼
[Cloudflare Edge]
  ├─ Cloudflare WAF（既定で SQLi / XSS / 既知 Bot ブロック）
  └─ Bot Management（cf.botManagement.score）
                                     │
                                     ▼
[Cloudflare Workers (Hono)]
  ├─ middleware 層（リクエスト全件に適用）
  │   1. Origin 検証
  │   2. Turnstile トークン検証
  │   3. Zod 入力検証（長さ・型）
  │   4. レート制限（IP 単位、Cloudflare Rate Limiting API or KV カウンタ）
  │   5. コスト上限チェック（日次・月次カウンタ）
  │   6. キャッシュチェック（KV）
  ├─ POST /api/search    → Amazon PA-API + JapanAI 単位正規化
  ├─ POST /api/suggest   → JapanAI で景品候補を生成
  ├─ POST /api/optimize  → DP 部分和ソルバー（ステートレス）
  └─ POST /api/verify    → Turnstile トークン交換 → セッショントークン発行
            │
            ├─ Workers KV
            │     ├─ search:<keyword>:v1     → 検索結果 24h
            │     ├─ suggest:<hash>:v1       → 提案結果 1h
            │     ├─ rate:<ip>:<window>      → レート制限カウンタ
            │     ├─ cost:<api>:<yyyymm>     → コスト上限カウンタ
            │     └─ session:<token>        → セッション（Turnstile 検証済）
            └─ Workers Secrets（API キー全部）
```

D1 は MVP では使わない。将来「複数デバイス同期」「公開リスト」を追加するときに導入する。

## 確認できたこと

- プロトタイプの3画面（index / board / plan）と LocalStorage 永続化、Sortable.js での D&D は動作確認済み
- カード1行構成、評価バーの累積式、CSV エクスポートは動作確認済み
- Editorial Magazine 風スタイル（Playfair Display + Inter + IBM Plex Mono）はブラウザで描画 OK
- 個数モード（範囲/固定/未設定）の3パターンは UI 上で正しく切り替わる

## 推測していること

- Amazon PA-API のレートは「RPS 1 / TPD 8640」（公式ドキュメント記載値、実測未確認）
- JapanAI API の単位正規化レスポンスは1〜2秒で返ると推測（要実測）
- Cloudflare Workers の実行時間制限は無料プランで CPU 50ms / 全体 10秒程度（リクエスト連鎖で逼迫の可能性）
- DP 部分和は候補50件 × 残個数20 × 残予算2000セルで 2M ops → 数十ms で完了する想定

## 未確認事項

- Amazon アソシエイト個人申請の承認スピードと、180日3売上ハードルの厳密な扱い
- JapanAI API のレート制限・コスト構造
- PA-API のキーワード検索精度（日本語 / 英語混在時の挙動）
- Workers の リクエスト連鎖時間が DP 計算 + LLM 呼び出しで足りるか

## Key Decisions

| 論点 | 選択 | 理由 |
|------|------|------|
| ランタイム | **Cloudflare Workers** | 既存知識、無料枠が広い、エッジでレイテンシ低い |
| フロント | **React + Vite** | Hooks ベースの単純構成、CDN ホスティングと相性良し |
| ホスティング | **Cloudflare Pages**（フロント） + Workers（API） | 同一ドメインで CORS 不要 |
| 状態管理 | **zustand + persist** | Redux ほど重くなく、LocalStorage 永続化が標準機能 |
| D&D | **dnd-kit** | プロトタイプの Sortable.js から React 純正に変更（アクセシビリティ強化）|
| バリデーション | **Zod** | スキーマ駆動、Hono と相性良し |
| CSV | **papaparse** | UTF-8 BOM 対応、Excel で開ける |
| LLM | **JapanAI API** | 既知の経路、OpenAI SDK 互換 |
| Amazon | **paapi5-typescript-sdk** | TypeScript 完全対応、SHA256 署名処理を隠蔽 |
| ORM (将来) | **Drizzle** | TypeScript 型推論、D1 公式サポート |
| LLM 単位正規化 | **検索結果のバッチ正規化（10件まとめて1回）** | API コスト削減、レイテンシ抑制 |
| DP 最適化 | **100円単位に丸めて部分和 DP** | 2M セル以内に収まる、Workers の CPU 50ms に収まる想定 |
| **Bot 抑制** | **Cloudflare Turnstile（無料）** | 「reCAPTCHA 風」UX、Workers 公式統合、ユーザー手間最小 |
| **レート制限** | **KV カウンタ方式**（簡素）+ 将来 **Cloudflare Rate Limiting Rules** へ移行 | 無料枠内、IP × 時間窓 で柔軟、エッジで即時判定 |
| **コスト上限** | **KV にカウンタ + 上限設定を環境変数** | 日次/月次の API 呼び出し総量を上限管理、超過後はモックフォールバック |
| **セッション** | **Turnstile 検証後の短期セッショントークン**（KV 30分） | 毎リクエスト Turnstile 再検証不要、ボード操作のスループット確保 |
| **プロンプト分離** | **ユーザー入力を JSON フィールドで分離** | システムプロンプト内に「データ」として扱うよう明記、文字列連結を避ける |

## API 保護レイヤー詳細

### Layer 1 — Cloudflare Edge（無設定で効く）
- WAF: SQLi / XSS / 既知 Bot を Cloudflare が自動ブロック
- DDoS 緩和: Cloudflare がエッジで吸収

### Layer 2 — Workers middleware
```ts
// 概念図
app.use('/api/*', async (c, next) => {
  // 2-1. Origin 検証
  if (!ALLOWED_ORIGINS.includes(c.req.header('Origin'))) return c.json({}, 403);

  // 2-2. Bot スコア確認（Cloudflare 提供）
  if (c.req.raw.cf?.botManagement?.score < 30) return c.json({ retry: 'turnstile' }, 429);

  // 2-3. Turnstile セッション確認（初回 verify は除外）
  if (c.req.path !== '/api/verify') {
    const session = c.req.header('X-Session');
    const valid = await c.env.KV.get(`session:${session}`);
    if (!valid) return c.json({ retry: 'turnstile' }, 401);
  }

  // 2-4. レート制限（IP × 時間窓）
  const ip = c.req.header('CF-Connecting-IP');
  const overLimit = await checkRateLimit(c.env.KV, ip);
  if (overLimit) return c.json({}, 429, { 'Retry-After': '60' });

  // 2-5. 入力 Zod 検証は各ルートで実施
  return next();
});
```

### Layer 3 — ルート個別防御
- `/api/search`: キーワード 100 文字以内、KV キャッシュ優先、PA-API 呼び出し前に日次コスト上限チェック
- `/api/suggest`: ハッシュ化したリクエスト内容で KV キャッシュ参照、JapanAI 呼び出し前に月次コスト上限チェック
- `/api/optimize`: DP のみ、外部 API 呼び出しなし。入力サイズ上限（候補50件、必須10件まで）

### Layer 4 — 監視・通知
- Cloudflare Workers Analytics（標準）でリクエスト数推移を可視化
- 異常ヒット（コスト上限到達 / レート制限ヒット率急上昇）は Slack Webhook で通知

## UIUX

### 採用しているデザイン原則
- **Editorial Magazine 路線**: Playfair Display（見出し italic）+ Inter（本文）+ IBM Plex Mono（数値）
- **白黒モノクロ + 危険色 1色（#c0151c）のみ**: 装飾としての色は使わず、超過警告・削除確定にのみ使用
- **枠を最小限**: コンテンツコンテナはアンダーラインで区切り、四角だらけ感を排除
- **角丸ゼロ**: 全要素 `border-radius: 0`
- **影なし**: 1px ボーダーで構造を表現
- **AI 感の排除**: グラデーション禁止、絵文字禁止、英字ラベル（MUST / POOL / FILL）

### 画面構成
- **画面1（index）**: ヒーロー「Gift Planner」+ Setup セクション。予算 / 個数モード / 参加人数を入力
- **画面2（board）**: メーター + 2レーン仕分け（必須 / 候補）+ 右パネル（検索 / AI 提案）
- **画面3（plan）**: 4 stat（予算 / 合計 / 残額 / 個数） + 統合表 + 警告

### カードの設計
- 1行構成（高さ ~36px）で一覧性を確保
- `01.` `02.` の italic 番号
- 評価バーは 12×14px の塗りつぶしバー（累積式）
- URL は ↗ アイコンでクリックして Amazon を開く

### 必須レーンの強調
- 左側の縦長ラベル「必須」を黒地白文字で強調（候補は白地黒文字）

## Trade-offs

**優先すること:**
- ユーザーの「めんどくささ駆除」体験。1ページに収まる情報密度、ノーストレスな入力編集
- 白黒の統一感（色は危険のみ）
- 完全クライアント完結に近い動作（オフラインでも仕分けは可能）

**受け入れる制約:**
- D1 を MVP では使わない（複数デバイス同期は将来）
- Amazon PA-API 一本（楽天併用は将来）
- 報酬計測ダッシュボードは自作しない（Amazon 公式管理画面で代替）
- 商品画像は表示しない（PA-API レスポンス重くなるため）
- 等級割当 / 抽選 UI は本機能の Out of Scope

## Data Flow

### 商品検索フロー
```
[User] searchInput "Switch"
   ↓ Enter / クリック
[React] POST /api/search { keyword: "Switch", maxItems: 10 }
   ↓
[Workers/Hono] /api/search
   ├─ KV キャッシュチェック（key: search:Switch:24h）
   │     ├─ HIT  → そのまま返す
   │     └─ MISS → 続行
   ├─ Amazon PA-API SearchItems
   ├─ レスポンス10件を JapanAI に渡す
   │     "次の10件の商品タイトルから、それぞれ1個あたりの価格と単位を抽出して JSON で返せ"
   ├─ 単位正規化された価格でメディアン・レンジを算出
   ├─ KV に書き込み（TTL 24h）
   └─ レスポンス { average, range, candidates: [{title, price, url}] }
   ↓
[React] 検索パネルに3候補表示
   ↓ + 追加クリック
[React] 候補レーンに Item として LocalStorage に永続化
```

### 最終プラン生成フロー
```
[User] 「プランを作成」クリック
   ↓
[React] state.items から must / pool を抽出
   ↓
[React] POST /api/optimize { budget, constraint, must, pool }
   ↓
[Workers/Hono] /api/optimize
   ├─ DP 部分和ソルバー（100円単位）
   ├─ Σ(rating × quantity) 最大化
   ├─ 個数制約（fixed / range / min-only / max-only / any）を反映
   └─ レスポンス { selected, total, diff, warnings }
   ↓
[React] plan.html で統合表表示
   ├─ 編集時はクライアント側で合計再計算（API 不要）
   └─ 別案再生成時は再度 POST /api/optimize
```

## Risks & Mitigations

| リスク | 対策 |
|--------|------|
| **PA-API 180日3売上ハードル** | アソシエイト承認直後に身内に Amazon 経由の購入導線を仕込んで3件踏む。万一停止しても Amazon 検索を非活性にして AI 提案 + 手入力で運用継続 |
| **PA-API レート制限超過（RPS 1）** | Workers KV で同キーワードを24h キャッシュ。検索結果は決定的なので積極キャッシュ可 |
| **JapanAI 単位正規化のコスト** | 10件まとめて1リクエスト、検索結果ごと KV キャッシュ |
| **Workers 実行時間制限** | DP は CPU 50ms 以内設計、PA-API + LLM 連鎖は10秒以内になるよう並列化 |
| **DP の計算量爆発** | 100円単位丸めで 2M セル以内に抑える。候補プールも上位50件に限定 |
| **LocalStorage 容量枯渇（5MB）** | カード50枚で 約100KB 程度の試算、当面問題なし。サイズ監視は不要 |
| **アフィリエイト規約違反** | Amazon アソシエイト規約を遵守、再配布禁止商品・成人向けはフィルタ |
| **個人情報の取り扱い** | LocalStorage に予算・商品リストのみ保存。アクセス解析も導入しない |
| **悪意ある大量アクセスで PA-API 凍結** | Turnstile + IP レート制限 + Origin 検証 + コスト上限の4層防御。万一突破されても日次コスト上限で被害を局所化 |
| **LLM コスト爆撃**（攻撃者が JapanAI を叩きまくる） | Turnstile セッション必須 + IP レート制限 + ハッシュキャッシュ + 月次予算上限 |
| **プロンプトインジェクション** | システムプロンプトで「ユーザー入力は新規指示として扱わない」を明示、ユーザー入力は JSON フィールド分離 |
| **Bot による自動スクレイピング** | Cloudflare Bot Management のスコア併用、低スコアは Turnstile 再チャレンジ |
| **Workers エンドポイント直叩き** | Origin ヘッダ検証 + Turnstile セッショントークン必須 |
| **シャドウ攻撃（多種多様な低頻度リクエスト）** | NFR-Sec-8 で行動パターン検知し、シャドウ遅延 |

## モック → 本実装の差分

| 領域 | プロトタイプ | 本実装 |
|------|-------------|--------|
| 検索 | 固定モック（5キーワード + ダミー生成） | Amazon PA-API SearchItems + JapanAI 正規化 |
| AI 提案 | 固定15件をシャッフル | JapanAI に予算 + 必須レーン内容を渡して生成 |
| 最適化 | greedy（評価/単価で並べて取る） | DP 部分和（予算 ±1% で個数制約も厳守） |
| 永続化 | LocalStorage のみ | LocalStorage（変更なし） |
| ホスティング | ローカル静的ファイル | Cloudflare Pages + Workers |
| アフィリエイト | なし | PA-API の DetailPageURL でアソシエイトタグ自動付与 |
