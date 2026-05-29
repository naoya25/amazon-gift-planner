export function yen(n: number | null | undefined): string {
  return '¥' + Math.round(n ?? 0).toLocaleString('ja-JP');
}

export function num(n: number | null | undefined): string {
  return Math.round(n ?? 0).toLocaleString('ja-JP');
}

export function parseNum(s: string | number | null | undefined): number {
  if (typeof s === 'number') return s;
  return Number(String(s ?? '').replace(/,/g, '').trim()) || 0;
}

export function uid(): string {
  return 'i' + Math.random().toString(36).slice(2, 10);
}

export function escapeHtml(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
