import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { SearchResponse } from '../../shared/schemas';
import { usePlannerStore } from '../store/planner';
import { yen } from '../lib/format';

export function SearchPanel() {
  const addItem = usePlannerStore((s) => s.addItem);
  const [keyword, setKeyword] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.search({ keyword: trimmed });
      setResult(res);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(`${e.message}${e.code ? ` (${e.code})` : ''}`);
      } else {
        setError('不明なエラー');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel-section">
      <header className="panel-head">
        <span className="t-serif-italic" style={{ fontSize: 18 }}>
          Search.
        </span>
        <span className="t-eyebrow">Amazon</span>
      </header>
      <div className="panel-body">
        <div className="search-row">
          <input
            type="text"
            value={keyword}
            placeholder="例: Switch、ダイソン、お米"
            className="input"
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <button
            type="button"
            className="btn btn-sm"
            onClick={submit}
            disabled={loading}
          >
            {loading ? '…' : '検索'}
          </button>
        </div>

        {error && (
          <p
            className="t-danger"
            style={{ fontSize: 11, margin: '8px 0 0', letterSpacing: '0.04em' }}
          >
            {error}
          </p>
        )}

        {result && (
          <>
            <div className="meta-row" style={{ marginTop: 8 }}>
              <span className="meta-chip-inline">
                平均 {yen(result.average)}
              </span>
              <span className="meta-chip-inline">
                {yen(result.range[0])} 〜 {yen(result.range[1])}
              </span>
              <span className="meta-chip-inline">source: {result.source}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              {result.candidates.map((c, i) => (
                <div className="search-result" key={i}>
                  <div
                    className="flex items-center justify-between gap-2"
                    style={{ marginBottom: 6 }}
                  >
                    <div className="search-result-title line-clamp-2 flex-1">
                      {c.title}
                    </div>
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() =>
                        addItem({
                          name: c.title,
                          url: c.url,
                          unitPrice: c.price,
                          quantity: 1,
                          lane: 'other',
                        })
                      }
                    >
                      追加
                    </button>
                  </div>
                  <div className="search-result-price">{yen(c.price)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
