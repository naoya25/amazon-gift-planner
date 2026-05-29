import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlannerStore, selectCountConstraint } from '../store/planner';
import { api, ApiError } from '../lib/api';
import type { Item, OptimizeResponse } from '../../shared/schemas';
import { yen, num } from '../lib/format';
import { NumericInput } from '../components/NumericInput';
import { exportCsv } from '../lib/csv';

type EditedPlan = {
  must: Item[];
  selected: Item[];
};

export function PlanPage() {
  const navigate = useNavigate();
  const state = usePlannerStore();
  const [plan, setPlan] = useState<OptimizeResponse | null>(null);
  const [edited, setEdited] = useState<EditedPlan>({ must: [], selected: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.optimize({
        budget: state.budget,
        constraint: selectCountConstraint(state),
        items: state.items,
      });
      setPlan(res);
      setEdited({ must: res.must, selected: res.selected });
    } catch (e) {
      if (e instanceof ApiError) setError(`${e.message}${e.code ? ` (${e.code})` : ''}`);
      else setError('不明なエラー');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total =
    edited.must.reduce((s, i) => s + i.unitPrice * i.quantity, 0) +
    edited.selected.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const totalCount =
    edited.must.reduce((s, i) => s + i.quantity, 0) +
    edited.selected.reduce((s, i) => s + i.quantity, 0);
  const diff = state.budget - total;
  const isOver = total > state.budget;
  const pct = state.budget > 0 ? Math.min(100, (total / state.budget) * 100) : 0;

  const updateRow = (kind: keyof EditedPlan, id: string, patch: Partial<Item>) => {
    setEdited((prev) => ({
      ...prev,
      [kind]: prev[kind].map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  };

  const regenerate = async () => {
    // 候補の order をシャッフルしてから再要求 → DP の同点崩しで別案が出る可能性
    state.items
      .filter((i) => i.lane === 'other')
      .forEach((i) => {
        state.updateItem(i.id, { order: Math.floor(Math.random() * 1000) });
      });
    await fetchPlan();
  };

  const onCsv = () => {
    try {
      exportCsv(edited.must, edited.selected);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="shell plan-shell">
      <header className="app-header">
        <div className="flex items-center gap-3">
          <h1 className="app-title">Gift Planner</h1>
          <span className="issue-mark">— 03 / 最終プラン</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-link" onClick={() => navigate('/board')}>
            ← ボード
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={regenerate}
            disabled={loading}
          >
            {loading ? '生成中…' : '別案で再生成'}
          </button>
          <button className="btn btn-sm" onClick={onCsv}>
            CSVで出力
          </button>
        </div>
      </header>

      <div className="plan-body">
        {/* サマリー */}
        <section>
          <div className="section-rule">Summary</div>
          <div className="stat-grid">
            <div className="stat-cell">
              <div className="t-label">予算</div>
              <div className="t-display" style={{ marginTop: 8 }}>
                {yen(state.budget)}
              </div>
            </div>
            <div className="stat-cell">
              <div className="t-label">合計</div>
              <div
                className={`t-display${isOver ? ' t-danger' : ''}`}
                style={{ marginTop: 8 }}
              >
                {yen(total)}
              </div>
            </div>
            <div className="stat-cell">
              <div className="t-label">{diff >= 0 ? '残額' : '超過'}</div>
              <div
                className={`t-display${diff < 0 ? ' t-danger' : ''}`}
                style={{ marginTop: 8 }}
              >
                {yen(Math.abs(diff))}
              </div>
            </div>
            <div className="stat-cell">
              <div className="t-label">個数</div>
              <div className="t-display" style={{ marginTop: 8 }}>
                {num(totalCount)}
                <span
                  className="t-muted"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    marginLeft: 6,
                  }}
                >
                  / {plan?.constraintLabel ?? '—'}
                </span>
              </div>
            </div>
          </div>
          <div className="meter" style={{ marginTop: 16 }}>
            <div
              className={`meter-fill${isOver ? ' over' : ''}`}
              style={{ width: pct + '%' }}
            />
          </div>
        </section>

        {/* 警告 / エラー */}
        {error && <div className="alert">{error}</div>}
        {plan?.warnings && plan.warnings.length > 0 && (
          <div className="alert">{plan.warnings.join(' / ')}</div>
        )}

        {/* 統合表 */}
        <section>
          <div className="section-rule">Items</div>
          <PlanTable
            rows={[...edited.must, ...edited.selected]}
            onUpdate={(id, patch) => {
              const mustHit = edited.must.find((i) => i.id === id);
              const kind: keyof EditedPlan = mustHit ? 'must' : 'selected';
              updateRow(kind, id, patch);
            }}
          />
          {edited.must.length + edited.selected.length === 0 && !loading && (
            <p
              className="t-muted"
              style={{
                textAlign: 'center',
                padding: '32px 0',
                fontSize: 11,
                letterSpacing: '0.06em',
              }}
            >
              該当なし
            </p>
          )}
        </section>

        <p
          className="t-muted"
          style={{
            fontSize: 10,
            textAlign: 'center',
            margin: '8px 0',
            letterSpacing: '0.06em',
          }}
        >
          ※ プロトタイプの最適化は DP 部分和。本実装では Amazon PA-API /
          JapanAI と統合予定。
        </p>
      </div>
    </div>
  );
}

function PlanTable({
  rows,
  onUpdate,
}: {
  rows: Item[];
  onUpdate: (id: string, patch: Partial<Item>) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <table className="plan-table">
      <thead>
        <tr>
          <th style={{ width: 36, textAlign: 'right' }}>#</th>
          <th>商品名</th>
          <th style={{ textAlign: 'right', width: 96 }}>単価 ¥</th>
          <th style={{ textAlign: 'right', width: 64 }}>個数</th>
          <th style={{ textAlign: 'right', width: 112 }}>小計</th>
          <th style={{ width: 240 }}>URL</th>
          <th style={{ width: 24 }}></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item, idx) => (
          <PlanRow key={item.id} item={item} index={idx} onUpdate={onUpdate} />
        ))}
      </tbody>
    </table>
  );
}

function PlanRow({
  item,
  index,
  onUpdate,
}: {
  item: Item;
  index: number;
  onUpdate: (id: string, patch: Partial<Item>) => void;
}) {
  return (
    <tr data-id={item.id}>
      <td
        style={{
          textAlign: 'right',
          color: 'var(--ink-3)',
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
          fontSize: 13,
        }}
      >
        {String(index + 1).padStart(2, '0')}.
      </td>
      <td>
        <input
          type="text"
          value={item.name}
          className="input-inline"
          style={{ width: '100%' }}
          onChange={(e) => onUpdate(item.id, { name: e.target.value })}
        />
      </td>
      <td className="mono" style={{ textAlign: 'right' }}>
        <NumericInput
          value={item.unitPrice}
          onChange={(v) => onUpdate(item.id, { unitPrice: v })}
          className="input-inline t-mono"
          style={{ width: '100%', textAlign: 'right' }}
        />
      </td>
      <td className="mono" style={{ textAlign: 'right' }}>
        <NumericInput
          value={item.quantity}
          onChange={(v) => onUpdate(item.id, { quantity: Math.max(1, v) })}
          className="input-inline t-mono"
          style={{ width: '100%', textAlign: 'right' }}
        />
      </td>
      <td
        className="mono"
        style={{ textAlign: 'right', fontWeight: 600 }}
      >
        {yen(item.unitPrice * item.quantity)}
      </td>
      <td>
        <input
          type="text"
          value={item.url ?? ''}
          placeholder="URL"
          className="input-inline"
          style={{
            width: '100%',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
          }}
          onChange={(e) => onUpdate(item.id, { url: e.target.value })}
        />
      </td>
      <td style={{ textAlign: 'center' }}>
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title="開く"
            style={{
              color: 'var(--ink)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ↗
          </a>
        ) : (
          <span className="t-muted">—</span>
        )}
      </td>
    </tr>
  );
}
