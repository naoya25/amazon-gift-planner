import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Item, Lane as LaneType } from '../../shared/schemas';
import { ItemCard } from './Card';
import { usePlannerStore } from '../store/planner';

type Props = {
  lane: LaneType;
  label: string;
  hint: string;
  summary: string;
  items: Item[];
};

export function Lane({ lane, label, hint, summary, items }: Props) {
  const updateItem = usePlannerStore((s) => s.updateItem);
  const deleteItem = usePlannerStore((s) => s.deleteItem);
  const itemIds = items.map((i) => i.id);
  const isEmpty = items.length === 0;

  // 空でも drop target になるようレーン全体を Droppable に
  const { setNodeRef } = useDroppable({
    id: `lane-${lane}`,
    data: { lane },
  });

  return (
    <section className={`lane-section ${lane === 'must' ? 'is-must' : 'is-other'}`}>
      <div className="lane-stripe">
        <span className="lane-stripe-hint">{hint}</span>
        <span className="lane-stripe-label">{label}</span>
        <span className="lane-stripe-summary">{summary}</span>
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`lane${isEmpty ? ' lane-empty' : ''}`}
        >
          {items.map((item, idx) => (
            <ItemCard
              key={item.id}
              item={item}
              index={idx}
              onUpdate={(patch) => updateItem(item.id, patch)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}
