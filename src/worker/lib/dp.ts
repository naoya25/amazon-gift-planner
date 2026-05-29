import type { Item, ItemCountConstraint } from '../../shared/schemas';

// ============================================================
// DP 部分和ソルバー
//
// 入力:
//   - candidates: 「候補（other レーン）」のアイテム配列。各アイテムは
//     unitPrice / quantity / rating を持ち、0/1 ナップサック的に
//     「丸ごと取るか・取らないか」で選ぶ
//   - remainingBudget: 必須を引いた残予算（円）
//   - constraint: 個数制約（fixed / range / any）
//   - mustCount: 必須レーンで既に使った個数
//
// 制約:
//   - fixed:  個数 = N に厳密に一致
//   - range:  min ≤ 個数 ≤ max（片方 null は無制限）
//   - any:    個数制約なし
//
// 目的:
//   - Σ(rating × quantity) を最大化（rating null は 5 扱い）
//   - 同じスコアなら「合計予算が予算により近い（残額少ない）」が優先
//
// 計算量: O(|candidates| × maxRemain × budget/100)
//   - 100円単位丸めで爆発を抑える
//   - 想定: 50 × 20 × 2000 = 2M セル → 100ms 以内
// ============================================================

const PRICE_GRANULARITY = 100;
const MAX_REMAIN_DEFAULT = 999;

export type DpResult = {
  selected: Item[];
  total: number;
  totalCount: number;
  /** 制約を満たせなかった場合の理由 */
  reason?: 'no-candidates' | 'budget-exhausted' | 'count-unreachable';
};

export function optimizePlan(
  candidates: Item[],
  remainingBudget: number,
  constraint: ItemCountConstraint,
  mustCount: number,
): DpResult {
  // ---- 個数制約を「残個数」の min/max に変換 ----
  let minRemain: number;
  let maxRemain: number;
  if (constraint.mode === 'fixed') {
    const target = Math.max(0, constraint.value - mustCount);
    minRemain = target;
    maxRemain = target;
  } else if (constraint.mode === 'range') {
    const lo = constraint.min ?? 0;
    const hi = constraint.max ?? MAX_REMAIN_DEFAULT;
    minRemain = Math.max(0, lo - mustCount);
    maxRemain = Math.max(0, hi - mustCount);
  } else {
    minRemain = 0;
    maxRemain = MAX_REMAIN_DEFAULT;
  }

  // ---- 候補の事前フィルタ ----
  const usable = candidates.filter((c) => c.unitPrice > 0 && c.quantity > 0);
  if (usable.length === 0) {
    return { selected: [], total: 0, totalCount: 0, reason: 'no-candidates' };
  }
  if (remainingBudget <= 0 || maxRemain === 0) {
    return { selected: [], total: 0, totalCount: 0, reason: 'budget-exhausted' };
  }

  // ---- 100円単位に丸めて DP の枠を作る ----
  const R = Math.floor(remainingBudget / PRICE_GRANULARITY);

  type Candidate = { item: Item; cost: number; score: number; count: number };
  const cands: Candidate[] = usable.map((item) => ({
    item,
    cost: Math.floor((item.unitPrice * item.quantity) / PRICE_GRANULARITY),
    score: (item.rating ?? 5) * item.quantity,
    count: item.quantity,
  }));

  const N = cands.length;
  const maxN = Math.min(maxRemain, cands.reduce((s, c) => s + c.count, 0));
  if (maxN < minRemain) {
    return { selected: [], total: 0, totalCount: 0, reason: 'count-unreachable' };
  }

  const W = R + 1;
  const H = maxN + 1;

  // dp[n][r] = 最大スコア（届かない場合は -1）
  // メモリ削減のため Int32Array をフラット化
  const dp = new Int32Array(H * W).fill(-1);
  dp[0] = 0;

  // pick[i][n][r] = 候補 i を選んだか（復元用）
  const pick = new Uint8Array(N * H * W);
  const pickIdx = (i: number, n: number, r: number) => i * H * W + n * W + r;

  for (let i = 0; i < N; i++) {
    const c = cands[i];
    if (c.count > maxN || c.cost > R) continue;
    // 0/1 ナップサックは後ろから走査
    for (let n = maxN; n >= c.count; n--) {
      for (let r = R; r >= c.cost; r--) {
        const prev = dp[(n - c.count) * W + (r - c.cost)];
        if (prev < 0) continue;
        const cur = prev + c.score;
        const idxNR = n * W + r;
        if (cur > dp[idxNR]) {
          dp[idxNR] = cur;
          pick[pickIdx(i, n, r)] = 1;
        }
      }
    }
  }

  // ---- 制約を満たす最良 (n, r) を探す ----
  // 同スコアなら r が大きい方（予算消化が多い方）を採用
  let bestN = -1;
  let bestR = -1;
  let bestScore = -1;
  for (let n = minRemain; n <= maxN; n++) {
    for (let r = 0; r <= R; r++) {
      const s = dp[n * W + r];
      if (s < 0) continue;
      if (s > bestScore || (s === bestScore && r > bestR)) {
        bestScore = s;
        bestN = n;
        bestR = r;
      }
    }
  }

  if (bestN < 0) {
    return { selected: [], total: 0, totalCount: 0, reason: 'count-unreachable' };
  }

  // ---- 復元 ----
  const selected: Item[] = [];
  let curN = bestN;
  let curR = bestR;
  for (let i = N - 1; i >= 0; i--) {
    if (pick[pickIdx(i, curN, curR)] === 1) {
      selected.push(cands[i].item);
      curN -= cands[i].count;
      curR -= cands[i].cost;
    }
  }
  selected.reverse();

  const total = selected.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const totalCount = selected.reduce((s, it) => s + it.quantity, 0);
  return { selected, total, totalCount };
}

// ============================================================
// 表示用ラベル
// ============================================================
export function countConstraintLabel(c: ItemCountConstraint): string {
  if (c.mode === 'fixed') return `ちょうど ${c.value} 個`;
  if (c.mode === 'any') return '指定なし';
  const hasMin = c.min != null && c.min > 0;
  const hasMax = c.max != null;
  if (hasMin && hasMax) return `${c.min}〜${c.max} 個`;
  if (hasMin) return `${c.min} 個以上`;
  if (hasMax) return `${c.max} 個以下`;
  return '指定なし';
}
