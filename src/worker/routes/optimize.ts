import { Hono } from 'hono';
import { optimizeRequestSchema, type OptimizeResponse } from '../../shared/schemas';
import { optimizePlan, countConstraintLabel } from '../lib/dp';

export const optimizeRoute = new Hono();

/**
 * POST /api/optimize
 *
 * 入力: budget, constraint, items
 * 出力: must（全投入）, selected（穴埋め）, total, diff, totalCount, warnings
 */
optimizeRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = optimizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: 'invalid input',
        code: 'INVALID_INPUT',
        issues: parsed.error.flatten(),
      },
      400,
    );
  }

  const { budget, constraint, items } = parsed.data;
  const must = items.filter((i) => i.lane === 'must');
  const others = items.filter((i) => i.lane === 'other');
  const mustTotal = must.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const mustCount = must.reduce((s, i) => s + i.quantity, 0);
  const remainingBudget = budget - mustTotal;

  const warnings: string[] = [];
  if (remainingBudget < 0) {
    warnings.push(`必須レーンの合計 (¥${mustTotal.toLocaleString('ja-JP')}) が予算を超えています。`);
  }
  if (constraint.mode === 'range' && constraint.max != null && mustCount > constraint.max) {
    warnings.push(
      `必須レーンの個数 (${mustCount}) が指定上限 (${constraint.max}) を超えています。`,
    );
  }
  if (constraint.mode === 'fixed' && mustCount > constraint.value) {
    warnings.push(
      `必須レーンの個数 (${mustCount}) が固定指定 (${constraint.value}) を超えています。`,
    );
  }

  const dpResult = optimizePlan(
    others,
    Math.max(0, remainingBudget),
    constraint,
    mustCount,
  );

  if (dpResult.reason === 'count-unreachable') {
    warnings.push('個数制約に到達できる候補が足りません。候補レーンに追加してください。');
  }

  const total = mustTotal + dpResult.total;
  const totalCount = mustCount + dpResult.totalCount;

  if (constraint.mode === 'fixed' && totalCount !== constraint.value) {
    warnings.push(
      `固定指定 ${constraint.value} 個に対し、現在 ${totalCount} 個です。`,
    );
  }
  if (constraint.mode === 'range') {
    const lo = constraint.min ?? 0;
    if (totalCount < lo) {
      warnings.push(
        `最小個数 (${lo}) に届きませんでした（現在 ${totalCount} 個）。`,
      );
    }
  }

  const res: OptimizeResponse = {
    must,
    selected: dpResult.selected,
    total,
    diff: budget - total,
    totalCount,
    constraintLabel: countConstraintLabel(constraint),
    warnings,
  };
  return c.json(res);
});
