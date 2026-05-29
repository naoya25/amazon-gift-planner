import { describe, it, expect } from 'vitest';
import { optimizePlan, countConstraintLabel } from './dp';
import type { Item } from '../../shared/schemas';

// テスト用のアイテム作成ヘルパー
function mkItem(p: { id: string; price: number; qty?: number; rating?: number | null }): Item {
  return {
    id: p.id,
    name: p.id,
    url: '',
    unitPrice: p.price,
    quantity: p.qty ?? 1,
    rating: p.rating ?? null,
    lane: 'other',
    order: 0,
  };
}

describe('optimizePlan — any モード', () => {
  it('予算内で全候補を取れる場合は全部取る', () => {
    const cands = [
      mkItem({ id: 'a', price: 3000, rating: 8 }),
      mkItem({ id: 'b', price: 5000, rating: 6 }),
      mkItem({ id: 'c', price: 2000, rating: 9 }),
    ];
    const r = optimizePlan(cands, 20000, { mode: 'any' }, 0);
    expect(r.selected.map(s => s.id).sort()).toEqual(['a', 'b', 'c']);
    expect(r.total).toBe(10000);
    expect(r.totalCount).toBe(3);
  });

  it('予算オーバーする組み合わせは選ばれない（スコア優先）', () => {
    const cands = [
      mkItem({ id: 'a', price: 8000, rating: 5 }),
      mkItem({ id: 'b', price: 6000, rating: 9 }),
      mkItem({ id: 'c', price: 5000, rating: 8 }),
    ];
    const r = optimizePlan(cands, 12000, { mode: 'any' }, 0);
    // 全部 19000 → 不可。b+c=11000, score=9+8=17 が最良
    expect(r.selected.map(s => s.id).sort()).toEqual(['b', 'c']);
    expect(r.total).toBe(11000);
  });
});

describe('optimizePlan — fixed モード', () => {
  it('mustCount=0 で fixed 3 なら 3個ピッタリ', () => {
    const cands = [
      mkItem({ id: 'a', price: 1000, rating: 5 }),
      mkItem({ id: 'b', price: 1000, rating: 8 }),
      mkItem({ id: 'c', price: 1000, rating: 3 }),
      mkItem({ id: 'd', price: 1000, rating: 9 }),
    ];
    const r = optimizePlan(cands, 5000, { mode: 'fixed', value: 3 }, 0);
    expect(r.totalCount).toBe(3);
    // スコア優先: 9 + 8 + 5 = 22
    expect(r.selected.map(s => s.id).sort()).toEqual(['a', 'b', 'd']);
  });

  it('mustCount=2、fixed=5 なら残りは 3個', () => {
    const cands = [
      mkItem({ id: 'a', price: 1000, rating: 5 }),
      mkItem({ id: 'b', price: 1000, rating: 8 }),
      mkItem({ id: 'c', price: 1000, rating: 9 }),
    ];
    const r = optimizePlan(cands, 5000, { mode: 'fixed', value: 5 }, 2);
    expect(r.totalCount).toBe(3);
  });

  it('fixed の個数に達せない場合は count-unreachable', () => {
    const cands = [mkItem({ id: 'a', price: 1000, rating: 5 })];
    const r = optimizePlan(cands, 5000, { mode: 'fixed', value: 5 }, 0);
    expect(r.reason).toBe('count-unreachable');
  });
});

describe('optimizePlan — range モード', () => {
  it('min/max 両指定で範囲内に収まる', () => {
    const cands = [
      mkItem({ id: 'a', price: 1000, rating: 8 }),
      mkItem({ id: 'b', price: 1000, rating: 7 }),
      mkItem({ id: 'c', price: 1000, rating: 6 }),
      mkItem({ id: 'd', price: 1000, rating: 5 }),
      mkItem({ id: 'e', price: 1000, rating: 4 }),
    ];
    const r = optimizePlan(cands, 5000, { mode: 'range', min: 2, max: 3 }, 0);
    expect(r.totalCount).toBeGreaterThanOrEqual(2);
    expect(r.totalCount).toBeLessThanOrEqual(3);
    // スコア最大化なら 3個取る (8+7+6=21)
    expect(r.totalCount).toBe(3);
  });

  it('min のみ指定（下限のみ）', () => {
    const cands = [
      mkItem({ id: 'a', price: 1000, rating: 5 }),
      mkItem({ id: 'b', price: 1000, rating: 5 }),
      mkItem({ id: 'c', price: 1000, rating: 5 }),
    ];
    const r = optimizePlan(cands, 5000, { mode: 'range', min: 2, max: null }, 0);
    expect(r.totalCount).toBeGreaterThanOrEqual(2);
  });

  it('max のみ指定（上限のみ）', () => {
    const cands = [
      mkItem({ id: 'a', price: 1000, rating: 5 }),
      mkItem({ id: 'b', price: 1000, rating: 5 }),
      mkItem({ id: 'c', price: 1000, rating: 5 }),
    ];
    const r = optimizePlan(cands, 5000, { mode: 'range', min: null, max: 2 }, 0);
    expect(r.totalCount).toBeLessThanOrEqual(2);
  });
});

describe('optimizePlan — エッジケース', () => {
  it('候補が空なら no-candidates', () => {
    const r = optimizePlan([], 10000, { mode: 'any' }, 0);
    expect(r.reason).toBe('no-candidates');
    expect(r.selected).toEqual([]);
  });

  it('残予算 0 なら budget-exhausted', () => {
    const r = optimizePlan(
      [mkItem({ id: 'a', price: 1000 })],
      0,
      { mode: 'any' },
      0,
    );
    expect(r.reason).toBe('budget-exhausted');
  });

  it('単価 0 のアイテムは無視される', () => {
    const r = optimizePlan(
      [mkItem({ id: 'a', price: 0 })],
      10000,
      { mode: 'any' },
      0,
    );
    expect(r.reason).toBe('no-candidates');
  });

  it('rating が null のときは 5 として扱う', () => {
    const cands = [
      mkItem({ id: 'a', price: 1000, rating: null }),
      mkItem({ id: 'b', price: 1000, rating: 6 }),
    ];
    const r = optimizePlan(cands, 1000, { mode: 'any' }, 0);
    // 1個しか取れない、score: a=5, b=6 → b
    expect(r.selected[0]?.id).toBe('b');
  });

  it('quantity 複数のアイテムは個数も丸ごとカウント', () => {
    const cands = [
      mkItem({ id: 'a', price: 1000, qty: 3, rating: 7 }),
      mkItem({ id: 'b', price: 1000, qty: 1, rating: 8 }),
    ];
    const r = optimizePlan(cands, 5000, { mode: 'any' }, 0);
    // 全部入る: 3*1000 + 1*1000 = 4000
    expect(r.totalCount).toBe(4);
    expect(r.total).toBe(4000);
  });
});

describe('optimizePlan — パフォーマンス', () => {
  it('候補50件 × 残個数20 × 残予算200,000円で 300ms 以内', () => {
    const cands: Item[] = Array.from({ length: 50 }, (_, i) =>
      mkItem({
        id: `i${i}`,
        price: 1000 + (i % 20) * 500,
        qty: 1,
        rating: 1 + (i % 10),
      }),
    );
    const t0 = performance.now();
    const r = optimizePlan(cands, 200_000, { mode: 'range', min: 10, max: 20 }, 0);
    const elapsed = performance.now() - t0;
    expect(r.selected.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(300);
  });
});

describe('countConstraintLabel', () => {
  it('fixed', () => {
    expect(countConstraintLabel({ mode: 'fixed', value: 15 })).toBe('ちょうど 15 個');
  });
  it('any', () => {
    expect(countConstraintLabel({ mode: 'any' })).toBe('指定なし');
  });
  it('range 両方', () => {
    expect(countConstraintLabel({ mode: 'range', min: 10, max: 20 })).toBe('10〜20 個');
  });
  it('range min のみ', () => {
    expect(countConstraintLabel({ mode: 'range', min: 10, max: null })).toBe('10 個以上');
  });
  it('range max のみ', () => {
    expect(countConstraintLabel({ mode: 'range', min: null, max: 20 })).toBe('20 個以下');
  });
});
