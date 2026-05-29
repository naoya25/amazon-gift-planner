import { Hono } from 'hono';
import { searchRequestSchema, type SearchResponse } from '../../shared/schemas';
import { mockSearchByKeyword } from '../lib/mockData';

export const searchRoute = new Hono();

/**
 * POST /api/search
 *
 * 現状: モック実装（KEYWORD_DB 参照）
 * 本実装: Amazon PA-API SearchItems + JapanAI 単位正規化（Phase 1.x で差し替え）
 */
searchRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = searchRequestSchema.safeParse(body);
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

  const { keyword } = parsed.data;
  const mock = mockSearchByKeyword(keyword);

  const res: SearchResponse = {
    keyword,
    average: mock.average,
    range: mock.range,
    candidates: mock.candidates,
    source: 'mock',
  };
  return c.json(res);
});
