import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { searchRoute } from './routes/search';
import { suggestRoute } from './routes/suggest';
import { optimizeRoute } from './routes/optimize';

type Bindings = {
  ALLOWED_ORIGINS: string;
  // KV / Secrets は Phase 1.5 で追加
};

const app = new Hono<{ Bindings: Bindings }>();

// ---- CORS（dev 用、本実装では Origin 検証 middleware で厳格化）----
app.use('*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const corsMiddleware = cors({
    origin: allowed.length > 0 ? allowed : '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Session'],
    maxAge: 600,
  });
  return corsMiddleware(c, next);
});

// ---- ヘルスチェック ----
app.get('/api/health', (c) =>
  c.json({ ok: true, service: 'gift-planner-api', version: '0.1.0' }),
);

// ---- ルート登録 ----
app.route('/api/search', searchRoute);
app.route('/api/suggest', suggestRoute);
app.route('/api/optimize', optimizeRoute);

// ---- 404 ----
app.notFound((c) => c.json({ error: 'not found' }, 404));

// ---- エラーハンドラ ----
app.onError((err, c) => {
  console.error('[worker error]', err);
  return c.json({ error: 'internal error', code: 'INTERNAL_ERROR' }, 500);
});

export default app;
