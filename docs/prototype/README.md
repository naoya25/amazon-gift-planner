# gift-planner プロトタイプ

ビンゴ景品プランナーの HTML プロトタイプ。Tailwind CDN + Sortable.js + LocalStorage で完全クライアント完結。

## 起動

```bash
# どちらでも OK
open index.html
# or
python3 -m http.server 8080 -d .
# → http://localhost:8080/
```

## 画面構成

| ファイル | 役割 |
|---|---|
| `index.html` | スタート画面（予算・個数・人数入力） |
| `board.html` | 仕分けボード（絶対 / それ以外、D&D、検索、AI提案） |
| `plan.html` | 最終プラン（自動最適化、編集、CSV ダウンロード） |
| `app.js` | 共通ロジック（State / モックデータ / 最適化 / CSV） |

## モック仕様

| 機能 | 実装 |
|---|---|
| Amazon 検索 | `app.js > KEYWORD_DB`（Switch / ダイソン / スターバックス / お米 / コーヒー）+ 未マッチはダミー生成 |
| AI 提案 | `app.js > MOCK_SUGGESTIONS` の固定 15 件 → シャッフル |
| 最適化 | greedy（評価値 / 単価 が高い順） |
| 永続化 | LocalStorage `gift-planner-state` |

## 既知の差分（本実装で変える）

- 検索・提案は本物の API（Amazon PA-API / JapanAI）に置換
- 最適化は **DP 部分和** に置換し「予算ピッタリ ±1%」を実現
- 単位正規化（1個あたり価格）の LLM パイプラインを追加
- 別案は 2〜3 件タブ切替に拡張

## キーボードショートカット / 操作

- カード内のすべてのフィールド（名前 / 価格 / 個数 / URL）はクリックで直接編集
- 評価バーは 1〜10 のボタン、もう一度押すと未評価に戻る
- カードのドラッグでレーン間移動 + レーン内並べ替え
- スタート画面の「保存データをリセット」で LocalStorage クリア
