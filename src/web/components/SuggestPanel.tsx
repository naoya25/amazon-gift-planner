import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { usePlannerStore } from '../store/planner';
import type { SuggestCandidate } from '../../shared/schemas';
import { yen } from '../lib/format';

export function SuggestPanel() {
  const state = usePlannerStore();
  const [suggestions, setSuggestions] = useState<SuggestCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const must = state.items.filter((i) => i.lane === 'must');
      const res = await api.suggest({
        budget: state.budget,
        participantCount: state.participantCount,
        must,
      });
      setSuggestions(res.candidates);
      setSource(res.source);
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
          Suggest.
        </span>
        <span className="t-eyebrow">JapanAI</span>
      </header>
      <div className="panel-body">
        <button
          type="button"
          className="btn btn-block btn-sm"
          style={{ marginBottom: 12 }}
          onClick={submit}
          disabled={loading}
        >
          {loading ? '生成中…' : '候補を生成する'}
        </button>

        {error && (
          <p
            className="t-danger"
            style={{ fontSize: 11, margin: '4px 0', letterSpacing: '0.04em' }}
          >
            {error}
          </p>
        )}

        {source && (
          <span
            className="meta-chip-inline"
            style={{ display: 'inline-block', marginBottom: 8 }}
          >
            source: {source}
          </span>
        )}

        {suggestions.length > 0 && (
          <div className="suggest-list">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="search-result flex items-center justify-between gap-2"
              >
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="search-result-title line-clamp-2">
                    {s.name}
                  </div>
                  <div className="search-result-price">{yen(s.unitPrice)}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() =>
                    state.addItem({
                      name: s.name,
                      url: s.url,
                      unitPrice: s.unitPrice,
                      quantity: 1,
                      lane: 'other',
                    })
                  }
                >
                  追加
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
