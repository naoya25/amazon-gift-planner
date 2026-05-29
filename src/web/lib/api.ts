import type {
  SearchRequest,
  SearchResponse,
  SuggestRequest,
  SuggestResponse,
  OptimizeRequest,
  OptimizeResponse,
} from '../../shared/schemas';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError('ネットワークエラー', 0, 'NETWORK_ERROR', e);
  }

  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    // body 空 / 非 JSON のときは null のまま
  }

  if (!res.ok) {
    const obj = (parsed ?? {}) as { error?: string; code?: string };
    throw new ApiError(
      obj.error ?? `HTTP ${res.status}`,
      res.status,
      obj.code,
      parsed,
    );
  }
  return parsed as TRes;
}

export const api = {
  search: (body: SearchRequest): Promise<SearchResponse> =>
    postJson<SearchRequest, SearchResponse>('/api/search', body),
  suggest: (body: SuggestRequest): Promise<SuggestResponse> =>
    postJson<SuggestRequest, SuggestResponse>('/api/suggest', body),
  optimize: (body: OptimizeRequest): Promise<OptimizeResponse> =>
    postJson<OptimizeRequest, OptimizeResponse>('/api/optimize', body),
};
