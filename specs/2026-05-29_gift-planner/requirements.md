# gift-planner — ビンゴ景品プランナー

**優先度:** High（自分の趣味プロジェクト・将来のアフィリエイト収益化候補）
**対象ユーザー:** 社内イベント幹事、忘年会・新年会幹事、総務・人事担当者、営業企画・マーケティング担当者
**対象モジュール:** 新規プロジェクト（Cloudflare Workers + React）

## Problem

### 現在起きていること
ビンゴ大会や懇親会の景品選定は、現状 **以下の手作業の連続**:
1. Amazon で「ビンゴ 景品 おすすめ」を検索し、まとめ記事を5本くらい読み比べる
2. 候補商品を1点ずつ Amazon で検索 → 価格コピペ → Excel に記録
3. 予算20万円に対して、Excel で電卓を叩きながら「あと残り◯円」を計算
4. 「家電ばっか」「全部男向け」になりがちで、バランスを取り直す
5. 上長への稟議用に表を整形し直す
6. 当日のオペレーション用に「1等」「2等」を別途決める

幹事は「あといくら残ってる？」「これ入れたら超える？」を頭の中で計算し続けることになる。
本来やりたい「楽しい景品を選ぶ」体験ではなく、**予算という数字パズルとの戦い**になっている。

### なぜ問題なのか
- 幹事は本業の合間にやる業務外作業で、心理的負担が大きい
- 「絶対入れたい目玉景品 + 残予算で穴埋め」の調整は人間には難しく、何度も組み直しが発生
- 結果として「無難な詰め合わせセット ×10」のような単調な景品リストになりがち（盛り上がらない）
- 景品ロジックを自動化するアプリは現状少なく、Excel テンプレ程度しかない

**Why Now:** 個人プロジェクト + 将来の Amazon アフィリエイト収益化検証として手応えのある題材。社内の bootcamp チーム研修2 でも同種の要件が出る可能性あり、研修前に経験値を積みたい。

**Expected Impact:**
- 1リスト作成にかかる時間: 60-90分 → 10-15分（推定）
- 「予算ピッタリ調整」の認知負荷をゼロに
- リリース後に Amazon アフィ収益が発生すれば、180日3売上ハードルを越えて PA-API 継続利用が可能になる

## Functional Requirements

### User Story
**As a** 社内イベントの幹事
**I want** 予算と参加人数を入力するだけで、必須にしたい景品と AI 提案を組み合わせて予算ピッタリのリストを作りたい
**So that** Excel で電卓を叩く時間を消し、本業の合間でも10分で稟議資料が出せる

### Requirements

#### Requirement 1 — スタート画面の入力
WHEN ユーザーがスタート画面で予算・個数・参加人数を入力する
THE SYSTEM SHALL 入力値を LocalStorage に保存し、仕分けボードに遷移する。

#### Requirement 2 — 個数モードの選択
WHEN ユーザーが個数を「範囲指定 / 固定 / 指定しない」の3モードから選ぶ
THE SYSTEM SHALL 選択モードに応じて入力欄を切り替え、最適化アルゴリズムに反映する。

#### Requirement 3 — 範囲モードの柔軟性
WHEN ユーザーが範囲モードで最小だけ入力した場合
THE SYSTEM SHALL 「下限のみ」制約として扱い、上限なしで最適化する。

#### Requirement 4 — Amazon 検索
WHEN ユーザーがボード画面で商品名を入力し検索ボタンを押す
THE SYSTEM SHALL Amazon PA-API で商品を検索し、上位候補3件と平均価格・価格レンジを表示する。

#### Requirement 5 — LLM による単位正規化
WHEN Amazon PA-API から複数の商品が返ってきた場合
THE SYSTEM SHALL JapanAI API で各商品の単位（個 / kg / 本 / セット数 など）を抽出し、1個あたり価格に正規化した上で平均・レンジを算出する。

#### Requirement 6 — AI 提案
WHEN ユーザーが「候補を生成」ボタンを押す
THE SYSTEM SHALL JapanAI API に予算・参加人数・既存の必須レーンの内容を渡し、定番景品の候補リストを返す。

#### Requirement 7 — 2レーン仕分け
WHEN ユーザーが検索結果や AI 提案から商品を追加する
THE SYSTEM SHALL カードを「候補」レーンに追加し、ドラッグで「必須 / 候補」を移動でき、レーン内で並べ替えできる。

#### Requirement 8 — 10段階評価
WHEN ユーザーがカード上の評価バー（1〜10）をクリックする
THE SYSTEM SHALL その値を累積式で表示し、最適化のスコアリングに利用する。

#### Requirement 9 — 予算メーター
WHEN レーンの合計が変化する
THE SYSTEM SHALL ヘッダーの予算メーターをリアルタイム更新し、超過時にバーと数値を危険色（#c0151c）に変える。

#### Requirement 10 — LocalStorage 自動永続化
WHEN ユーザーがカードを追加・編集・削除・並べ替えする
THE SYSTEM SHALL 即座に LocalStorage へ書き込み、ブラウザを閉じても次回起動時に復元する。

#### Requirement 11 — 最終プランの自動生成
WHEN ユーザーが「プランを作成」ボタンを押す
THE SYSTEM SHALL 必須レーンを全投入し、候補レーンから「予算 ≤ R」「個数制約を満たす」「Σ(rating × quantity) 最大化」となる組み合わせを **DP 部分和** で計算し、結果を表示する。

#### Requirement 12 — 統合表での編集
WHEN ユーザーが最終プラン画面で商品名・単価・個数・URL を編集する
THE SYSTEM SHALL その場で合計を再計算し、メーターと統計を更新する。

#### Requirement 13 — 別案の再生成
WHEN ユーザーが「別案で再生成」を押す
THE SYSTEM SHALL 候補プールの並び順をシャッフルして DP を再実行し、異なる組み合わせを提示する。

#### Requirement 14 — CSV エクスポート
WHEN ユーザーが「CSV で出力」を押す
THE SYSTEM SHALL 必須・穴埋を統合した CSV（UTF-8 BOM付き）をブラウザにダウンロードさせる。

#### Requirement 15 — アフィリエイト URL
WHERE Amazon アソシエイトのタグが設定されている場合
THE SYSTEM SHALL 商品 URL に自動でアソシエイトタグを付与する。

### Edge Cases

#### Edge Case 1 — 必須レーンが予算超過
WHEN 必須レーンの合計が予算を超えている状態でプラン作成を押された
THE SYSTEM SHALL 警告メッセージを表示し、穴埋を実行しない。

#### Edge Case 2 — 個数制約を満たせない
WHEN 最小個数 ≤ 必須の個数 + 候補プールの個数 とならない場合
THE SYSTEM SHALL 警告メッセージで「候補レーンに追加が必要」と通知する。

#### Edge Case 3 — Amazon PA-API のレート制限超過
WHEN PA-API のレート制限（RPS 1 / TPD 8640）に達した
THE SYSTEM SHALL 直近24時間の Workers KV キャッシュからレスポンスを返し、新規呼び出しは抑制する。

#### Edge Case 4 — PA-API が凍結された
WHEN PA-API のアクセスが停止されている
THE SYSTEM SHALL Amazon 検索機能を非活性にし、AI 提案と手入力でのみ運用継続できるようにする。

#### Edge Case 5 — JapanAI のタイムアウト
WHEN JapanAI API が10秒以上応答しない
THE SYSTEM SHALL タイムアウトエラーを表示し、単位正規化なしの平均値で代替する。

## Non-Functional Requirements

### Performance
- [ ] 最終プランの DP 計算は **300ms 以内**（候補50件 × 残個数20 × 残予算20万円 / 100円単位 = 2M セル）
- [ ] ボードの再描画は **100ms 以内**（カード50枚まで）
- [ ] Amazon 検索は **3秒以内**（PA-API + LLM 単位正規化込み）

### Security
- [ ] PA-API キー / JapanAI API キーは Workers の secret に保存し、フロントに露出させない
- [ ] LocalStorage には個人情報を保存しない（予算・商品リストのみ）
- [ ] XSS 対策として、商品名・URL は `escapeHtml` を通してから DOM に挿入する

### Usability
- [ ] AI 感を排除した Editorial Magazine 風 UI（Playfair Display + Inter + IBM Plex Mono）
- [ ] 色は危険色 #c0151c の1色のみ、それ以外完全モノクロ
- [ ] 全 input は LocalStorage の自動保存（保存ボタン不要）

## Success Metrics

### Technical
- [ ] DP 最適化で「予算誤差 ≤ 1%」を達成できる
- [ ] Workers + Pages にデプロイされ、独自ドメインで公開されている
- [ ] LocalStorage で完全クライアント完結のオフライン動作も可（API 呼び出しがない範囲）

### Business
- [ ] 個人で1回は実際にビンゴ大会の景品選定に使う
- [ ] Amazon アソシエイト経由で初回3件の売上が発生し、PA-API ハードルをクリア
- [ ] 同期や bootcamp チームに紹介して「使ってみた」フィードバックを2件以上得る

## Dependencies
- Amazon アソシエイト個人申請の承認（1〜3日）
- Amazon PA-API（paapi5-typescript-sdk）
- JapanAI API キー（既存）
- Cloudflare アカウント（Workers + Pages + D1 + KV）
- Sortable.js（D&D ライブラリ、CDN）
- Playfair Display / Inter / IBM Plex Mono（Google Fonts CDN）

## Out of Scope

- 複数デバイス間の同期（LocalStorage で完結、D1 同期は将来）
- ユーザーアカウント / 認証（個人ツールとして開始）
- 楽天 / Yahoo ショッピングの併用検索（Amazon PA-API 一本で開始）
- ビンゴ大会の当日オペレーション機能（等級割当・抽選 UI・参加者管理）
- iOS / Android ネイティブアプリ
- 自前のクリック計測ダッシュボード（Amazon アソシエイト公式管理画面で代替）
- 商品画像の表示（PA-API のレスポンス重くなるため、リンクのみ）
