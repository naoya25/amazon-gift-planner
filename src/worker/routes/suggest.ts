import { Hono } from 'hono';
import { suggestRequestSchema, type SuggestResponse } from '../../shared/schemas';
import { mockSuggest } from '../lib/mockData';

export const suggestRoute = new Hono();

/**
 * POST /api/suggest
 *
 * 現状: モック実装（固定15件をシャッフル）
 * 本実装: JapanAI に予算/必須レーン内容を渡して動的生成（Phase 1.x）
 */
suggestRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = suggestRequestSchema.safeParse(body);
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

  const candidates = mockSuggest();
  const res: SuggestResponse = {
    candidates,
    source: 'mock',
  };
  return c.json(res);
});
