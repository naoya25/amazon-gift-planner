import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Item } from '../../shared/schemas';
import { yen } from '../lib/format';
import { NumericInput } from './NumericInput';

type Props = {
  item: Item;
  index: number;
  onUpdate: (patch: Partial<Item>) => void;
  onDelete: () => void;
};

export function ItemCard({ item, index, onUpdate, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: item.id,
      data: { lane: item.lane },
    });

  const subtotal = item.unitPrice * item.quantity;
  const numLabel = String(index + 1).padStart(2, '0');
  const hasUrl = !!item.url;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="item-card" data-id={item.id}>
      {/* drag handle: 左の番号部分 */}
      <span
        className="num-mark"
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', userSelect: 'none' }}
        title="ドラッグで並べ替え / レーン移動"
      >
        {numLabel}.
      </span>

      <input
        type="text"
        value={item.name}
        placeholder="（商品名）"
        className="input-inline item-name"
        title={item.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
      />
      <span className="item-price-block">
        <span>¥</span>
        <NumericInput
          ariaLabel="単価"
          value={item.unitPrice}
          onChange={(v) => onUpdate({ unitPrice: v })}
          className="input-inline t-mono"
          style={{ width: 64, textAlign: 'right' }}
        />
        <span>×</span>
        <NumericInput
          ariaLabel="個数"
          value={item.quantity}
          onChange={(v) => onUpdate({ quantity: Math.max(1, v) })}
          className="input-inline t-mono"
          style={{ width: 32, textAlign: 'right' }}
        />
      </span>
      <span className="item-subtotal">{yen(subtotal)}</span>
      <div
        className="rating-bar"
        title={item.rating ? `評価: ${item.rating}/10` : '未評価（クリックで設定）'}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            className={`rating-btn${(item.rating ?? 0) >= n ? ' active' : ''}`}
            aria-label={`評価 ${n}`}
            onClick={() => onUpdate({ rating: item.rating === n ? null : n })}
          >
            {n}
          </button>
        ))}
      </div>
      {hasUrl ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="item-url-icon"
          title={`開く: ${item.url}`}
        >
          ↗
        </a>
      ) : (
        <span className="item-url-icon is-empty" title="URL 未設定">
          ↗
        </span>
      )}
      <button
        type="button"
        className="item-delete"
        title="URL を編集"
        style={{ fontSize: 11 }}
        onClick={() => {
          const next = prompt('URL を編集', item.url ?? '');
          if (next !== null) onUpdate({ url: next.trim() });
        }}
      >
        URL
      </button>
      <button
        type="button"
        className="item-delete"
        title="削除"
        onClick={() => {
          if (confirm(`「${item.name || '無題'}」を削除しますか？`)) onDelete();
        }}
      >
        ×
      </button>
    </div>
  );
}
