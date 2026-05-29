import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  usePlannerStore,
  selectLane,
  selectTotals,
  selectCountConstraint,
  countConstraintLabel,
} from '../store/planner';
import { yen, num } from '../lib/format';
import { Lane } from '../components/Lane';
import { SearchPanel } from '../components/SearchPanel';
import { SuggestPanel } from '../components/SuggestPanel';
import type { Lane as LaneType } from '../../shared/schemas';

export function BoardPage() {
  const navigate = useNavigate();
  const state = usePlannerStore();
  const must = selectLane(state, 'must');
  const other = selectLane(state, 'other');
  const { total, count } = selectTotals(state);

  const pct = state.budget > 0 ? Math.min(100, (total / state.budget) * 100) : 0;
  const diff = state.budget - total;
  const isOver = total > state.budget;
  const constraintLabel = countConstraintLabel(selectCountConstraint(state));

  const mustTotal = must.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const mustCount = must.reduce((s, i) => s + i.quantity, 0);
  const otherTotal = other.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const otherCount = other.reduce((s, i) => s + i.quantity, 0);

  // ============================================================
  // D&D
  // ============================================================
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function resolveTargetLane(overId: string, overData: Record<string, unknown> | undefined): LaneType | null {
    // overData に lane があれば優先（カードまたはレーン本体）
    const fromData = overData?.lane;
    if (fromData === 'must' || fromData === 'other') return fromData;
    // overId が "lane-must" / "lane-other" のときの解析
    if (overId === 'lane-must') return 'must';
    if (overId === 'lane-other') return 'other';
    return null;
  }

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeItem = usePlannerStore.getState().items.find((i) => i.id === activeId);
    if (!activeItem) return;

    const targetLane = resolveTargetLane(overId, over.data.current);
    if (!targetLane) return;
    if (activeItem.lane === targetLane) return;

    // レーン間移動: 一旦末尾に置く
    const lastOrder = usePlannerStore
      .getState()
      .items.filter((i) => i.lane === targetLane)
      .reduce((m, i) => Math.max(m, i.order ?? 0), 0);
    usePlannerStore.getState().moveItem(activeId, targetLane, lastOrder + 1);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const items = usePlannerStore.getState().items;
    const activeItem = items.find((i) => i.id === activeId);
    if (!activeItem) return;

    // over がレーン本体の場合は並べ替え不要（既に onDragOver で lane 移動済）
    if (overId.startsWith('lane-')) return;

    const overItem = items.find((i) => i.id === overId);
    if (!overItem) return;

    // 異なるレーンならスキップ（移動は onDragOver で完了済み）
    if (activeItem.lane !== overItem.lane) return;

    const lane = activeItem.lane;
    const laneItems = items
      .filter((i) => i.lane === lane)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const oldIndex = laneItems.findIndex((i) => i.id === activeId);
    const newIndex = laneItems.findIndex((i) => i.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const reordered = arrayMove(laneItems, oldIndex, newIndex).map((i) => i.id);
    usePlannerStore.getState().reorderLane(lane, reordered);
  };

  return (
    <div className="shell">
      <header className="app-header">
        <div className="flex items-center gap-3">
          <h1 className="app-title">Gift Planner</h1>
          <span className="issue-mark">— 02 / 仕分けボード</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-link" onClick={() => navigate('/')}>
            ← スタート
          </button>
          <button className="btn btn-sm" onClick={() => navigate('/plan')}>
            プランを作成 →
          </button>
        </div>
      </header>

      {/* メーター */}
      <section className="meter-section section">
        <div className="section-rule">Budget · Count</div>
        <div className="meter-line">
          <div className="meter-num">
            <strong style={{ fontSize: 18 }}>{yen(total)}</strong>
            <span className="t-muted"> / </span>
            <span>{yen(state.budget)}</span>
            <span
              style={{ marginLeft: 10 }}
              className={isOver ? 't-mono t-danger' : 't-mono t-muted'}
            >
              {diff >= 0 ? `(残 ${yen(diff)})` : `(超過 ${yen(-diff)})`}
            </span>
          </div>
          <div className="meter-num">
            <span className="t-muted">個数 </span>
            <strong style={{ fontSize: 18 }}>{num(count)}</strong>
            <span
              className="t-muted"
              style={{ marginLeft: 8, fontSize: 11, letterSpacing: '0.06em' }}
            >
              [{constraintLabel}]
            </span>
          </div>
        </div>
        <div className="meter">
          <div
            className={`meter-fill${isOver ? ' over' : ''}`}
            style={{ width: pct + '%' }}
          />
        </div>
      </section>

      {/* 2レーン + 右パネル */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="board-grid">
          <div className="board-left">
            <Lane
              lane="must"
              label="必須"
              hint="優先度1"
              summary={`${mustCount} / ${yen(mustTotal)}`}
              items={must}
            />
            <Lane
              lane="other"
              label="候補"
              hint="並び順=優先"
              summary={`${otherCount} / ${yen(otherTotal)}`}
              items={other}
            />
          </div>

          <aside className="board-right">
            <SearchPanel />
            <SuggestPanel />
          </aside>
        </div>
      </DndContext>
    </div>
  );
}
