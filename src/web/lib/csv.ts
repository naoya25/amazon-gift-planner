import Papa from 'papaparse';
import type { Item } from '../../shared/schemas';

type CsvRow = {
  カテゴリ: string;
  商品名: string;
  個数: number;
  単価: number;
  小計: number;
  URL: string;
  評価: number | '';
};

export function exportCsv(must: Item[], filled: Item[], filename?: string) {
  const rows: CsvRow[] = [
    ...must.map((i) => toRow(i, '必須')),
    ...filled.map((i) => toRow(i, '穴埋')),
  ];

  if (rows.length === 0) {
    throw new Error('プランが空です');
  }

  const csv = Papa.unparse(rows, {
    quotes: true,
    header: true,
    newline: '\r\n',
  });

  // UTF-8 BOM 付きで Excel でも文字化けしない
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `gift-plan-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toRow(item: Item, category: '必須' | '穴埋'): CsvRow {
  return {
    カテゴリ: category,
    商品名: item.name,
    個数: item.quantity,
    単価: item.unitPrice,
    小計: item.unitPrice * item.quantity,
    URL: item.url ?? '',
    評価: item.rating ?? '',
  };
}
