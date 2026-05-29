import { z } from 'zod';

// ============================================================
// 共通の上限（NFR-Sec-3 入力長制限）
// ============================================================
const MAX_KEYWORD = 100;
const MAX_NAME = 200;
const MAX_BUDGET = 10_000_000;
const MAX_QUANTITY = 999;
const MAX_ITEM_COUNT_TARGET = 999;
const MAX_PARTICIPANTS = 10_000;
const MAX_ITEMS_IN_REQUEST = 200;
const MAX_MUST_IN_SUGGEST = 20;

// ============================================================
// Item — カード1枚
// ============================================================
export const laneSchema = z.enum(['must', 'other']);
export type Lane = z.infer<typeof laneSchema>;

export const itemSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(MAX_NAME),
  url: z.string().max(2048).optional().default(''),
  unitPrice: z.number().int().min(0).max(MAX_BUDGET),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
  rating: z.number().int().min(1).max(10).nullable().default(null),
  lane: laneSchema,
  order: z.number().int().min(0).default(0),
});
export type Item = z.infer<typeof itemSchema>;

// ============================================================
// 個数制約（fixed / range / any のユニオン）
// ============================================================
export const itemCountConstraintSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('fixed'),
    value: z.number().int().min(1).max(MAX_ITEM_COUNT_TARGET),
  }),
  z.object({
    mode: z.literal('range'),
    min: z.number().int().min(0).max(MAX_ITEM_COUNT_TARGET).nullable(),
    max: z.number().int().min(1).max(MAX_ITEM_COUNT_TARGET).nullable(),
  }),
  z.object({
    mode: z.literal('any'),
  }),
]);
export type ItemCountConstraint = z.infer<typeof itemCountConstraintSchema>;

// ============================================================
// /api/search
// ============================================================
export const searchRequestSchema = z.object({
  keyword: z.string().min(1).max(MAX_KEYWORD).trim(),
});
export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const searchCandidateSchema = z.object({
  title: z.string().max(MAX_NAME),
  price: z.number().int().min(0).max(MAX_BUDGET),
  url: z.string().max(2048),
});
export type SearchCandidate = z.infer<typeof searchCandidateSchema>;

export const searchResponseSchema = z.object({
  keyword: z.string(),
  average: z.number().int().min(0),
  range: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  candidates: z.array(searchCandidateSchema),
  source: z.enum(['mock', 'paapi', 'cache']),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

// ============================================================
// /api/suggest
// ============================================================
export const suggestRequestSchema = z.object({
  budget: z.number().int().min(0).max(MAX_BUDGET),
  participantCount: z.number().int().min(1).max(MAX_PARTICIPANTS),
  must: z.array(itemSchema).max(MAX_MUST_IN_SUGGEST).optional(),
});
export type SuggestRequest = z.infer<typeof suggestRequestSchema>;

export const suggestCandidateSchema = z.object({
  name: z.string().max(MAX_NAME),
  unitPrice: z.number().int().min(0).max(MAX_BUDGET),
  url: z.string().max(2048),
});
export type SuggestCandidate = z.infer<typeof suggestCandidateSchema>;

export const suggestResponseSchema = z.object({
  candidates: z.array(suggestCandidateSchema),
  source: z.enum(['mock', 'japanai', 'cache']),
});
export type SuggestResponse = z.infer<typeof suggestResponseSchema>;

// ============================================================
// /api/optimize
// ============================================================
export const optimizeRequestSchema = z.object({
  budget: z.number().int().min(0).max(MAX_BUDGET),
  constraint: itemCountConstraintSchema,
  items: z.array(itemSchema).max(MAX_ITEMS_IN_REQUEST),
});
export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;

export const optimizeResponseSchema = z.object({
  must: z.array(itemSchema),
  selected: z.array(itemSchema),
  total: z.number().int(),
  diff: z.number().int(),
  totalCount: z.number().int().min(0),
  constraintLabel: z.string(),
  warnings: z.array(z.string()),
});
export type OptimizeResponse = z.infer<typeof optimizeResponseSchema>;

// ============================================================
// エラー応答
// ============================================================
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.enum([
    'INVALID_INPUT',
    'RATE_LIMITED',
    'COST_LIMITED',
    'TURNSTILE_REQUIRED',
    'FORBIDDEN_ORIGIN',
    'UPSTREAM_ERROR',
    'INTERNAL_ERROR',
  ]).optional(),
  retryAfterSec: z.number().int().min(0).optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
