// ===============================================
// gift-planner プロトタイプ 共通ロジック
// ===============================================

const STORAGE_KEY = 'gift-planner-state';

function defaultState() {
  return {
    budget: 200000,
    // 個数モード: 'range' | 'fixed' | 'any'
    itemCountMode: 'range',
    itemCountMin: 10,
    itemCountMax: 20,
    itemCountFixed: null,
    itemCount: 15, // 後方互換（メーター表示などで使う）
    participantCount: 30,
    items: [],
    finalPlan: null,
  };
}

// 個数制約を取り出す
function countConstraint(state) {
  if (state.itemCountMode === 'fixed' && state.itemCountFixed) {
    return { fixed: state.itemCountFixed, min: state.itemCountFixed, max: state.itemCountFixed };
  }
  if (state.itemCountMode === 'any') {
    return { fixed: null, min: 0, max: Infinity };
  }
  // range（min / max どちらかは null の可能性）
  return {
    fixed: null,
    min: state.itemCountMin ?? 0,
    max: state.itemCountMax ?? Infinity,
  };
}

// 表示用の文字列
function countConstraintLabel(state) {
  const c = countConstraint(state);
  if (c.fixed != null) return `ちょうど ${c.fixed} 個`;
  if (c.min > 0 && c.max < Infinity) return `${c.min}〜${c.max} 個`;
  if (c.min > 0) return `${c.min} 個以上`;
  if (c.max < Infinity) return `${c.max} 個以下`;
  return '指定なし';
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try {
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

function uid() {
  return 'i' + Math.random().toString(36).slice(2, 10);
}

function yen(n) {
  return '¥' + Math.round(n || 0).toLocaleString('ja-JP');
}

function num(n) {
  return Math.round(n || 0).toLocaleString('ja-JP');
}

function parseNum(s) {
  if (typeof s === 'number') return s;
  return Number((s || '').toString().replace(/,/g, '').trim()) || 0;
}

// 数値入力欄をカンマ表示対応にする
//   - focus 時: カンマ除去して編集モード
//   - blur 時:  カンマ付きで表示、onChange に数値で渡す
function bindNumericInput(input, onChange) {
  if (!input) return;
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('autocomplete', 'off');

  const initial = parseNum(input.value);
  input.value = num(initial);

  input.addEventListener('focus', () => {
    input.value = parseNum(input.value).toString();
    input.select();
  });

  input.addEventListener('blur', () => {
    const v = parseNum(input.value);
    input.value = num(v);
    if (onChange) onChange(v);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
  });
}

// ===============================================
// Amazon 検索モック
// ===============================================
const KEYWORD_DB = {
  'switch': {
    average: 38000,
    range: [21978, 39800],
    candidates: [
      { title: 'Nintendo Switch 有機ELモデル ホワイト', price: 39800, url: 'https://www.amazon.co.jp/dp/B098RKWHHZ' },
      { title: 'Nintendo Switch 本体 ネオン', price: 32970, url: 'https://www.amazon.co.jp/dp/B07S5RJVQ7' },
      { title: 'Nintendo Switch Lite ターコイズ', price: 21978, url: 'https://www.amazon.co.jp/dp/B07VLN1HCW' },
    ],
  },
  'ダイソン': {
    average: 46900,
    range: [38500, 53900],
    candidates: [
      { title: 'ダイソン V8 Slim Fluffy コードレスクリーナー', price: 48400, url: 'https://www.amazon.co.jp/dp/B08K3VG7HF' },
      { title: 'ダイソン V10 Fluffy', price: 53900, url: 'https://www.amazon.co.jp/dp/B07KKQX5G2' },
      { title: 'ダイソン V7 Motorhead', price: 38500, url: 'https://www.amazon.co.jp/dp/B07L8FFNS5' },
    ],
  },
  'スターバックス': {
    average: 4000,
    range: [3000, 5000],
    candidates: [
      { title: 'スターバックス カード 5,000円分', price: 5000, url: 'https://www.amazon.co.jp/dp/B07XYZA1B1' },
      { title: 'スターバックス eギフト 3,000円', price: 3000, url: 'https://www.amazon.co.jp/dp/B07XYZA1B2' },
      { title: 'スターバックス ドリンクチケット 5枚', price: 4000, url: 'https://www.amazon.co.jp/dp/B07XYZA1B3' },
    ],
  },
  'お米': {
    average: 3880,
    range: [1980, 5980],
    candidates: [
      { title: '魚沼産コシヒカリ 5kg', price: 5980, url: 'https://www.amazon.co.jp/dp/B07XYZA2C1' },
      { title: '北海道産ななつぼし 5kg', price: 3680, url: 'https://www.amazon.co.jp/dp/B07XYZA2C2' },
      { title: 'こしひかり 2kg', price: 1980, url: 'https://www.amazon.co.jp/dp/B07XYZA2C3' },
    ],
  },
  'コーヒー': {
    average: 2500,
    range: [1500, 4500],
    candidates: [
      { title: 'スターバックス コーヒー豆 250g', price: 1800, url: 'https://www.amazon.co.jp/dp/B07XYZH1I1' },
      { title: 'UCC ドリップコーヒー 50杯分', price: 2480, url: 'https://www.amazon.co.jp/dp/B07XYZH1I2' },
      { title: 'ブルーボトル コーヒー ギフトセット', price: 4500, url: 'https://www.amazon.co.jp/dp/B07XYZH1I3' },
    ],
  },
};

function mockSearch(keyword) {
  const lower = (keyword || '').toLowerCase();
  for (const key in KEYWORD_DB) {
    if (lower.includes(key.toLowerCase())) return KEYWORD_DB[key];
  }
  const base = Math.max(1500, ((keyword || '商品').length + 3) * 1100);
  return {
    average: Math.round(base / 100) * 100,
    range: [Math.round(base * 0.7 / 100) * 100, Math.round(base * 1.3 / 100) * 100],
    candidates: [
      { title: `${keyword} 定番モデル`, price: base, url: 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(keyword) },
      { title: `${keyword} お買い得`, price: Math.round(base * 0.75 / 100) * 100, url: 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(keyword) },
      { title: `${keyword} プレミアム`, price: Math.round(base * 1.2 / 100) * 100, url: 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(keyword) },
    ],
  };
}

// ===============================================
// JapanAI 提案モック
// ===============================================
const MOCK_SUGGESTIONS = [
  { name: 'スターバックス カード 5,000円', unitPrice: 5000, url: 'https://www.amazon.co.jp/dp/B07XYZA1B1' },
  { name: 'クオカード 3,000円分', unitPrice: 3000, url: 'https://www.amazon.co.jp/dp/B07XYZB1C1' },
  { name: 'ヨックモック お菓子詰め合わせ', unitPrice: 4500, url: 'https://www.amazon.co.jp/dp/B07XYZC1D1' },
  { name: '入浴剤 ギフトセット', unitPrice: 3500, url: 'https://www.amazon.co.jp/dp/B07XYZD1E1' },
  { name: '今治タオル ハンドタオルセット', unitPrice: 5500, url: 'https://www.amazon.co.jp/dp/B07XYZE1F1' },
  { name: 'パイロット 高級ボールペン', unitPrice: 6000, url: 'https://www.amazon.co.jp/dp/B07XYZF1G1' },
  { name: 'ロクシタン ハンドクリーム3本セット', unitPrice: 4200, url: 'https://www.amazon.co.jp/dp/B07XYZG1H1' },
  { name: 'Anker ワイヤレスイヤホン', unitPrice: 8500, url: 'https://www.amazon.co.jp/dp/B07XYZI1J1' },
  { name: 'Anker モバイルバッテリー 10000mAh', unitPrice: 3990, url: 'https://www.amazon.co.jp/dp/B07XYZJ1K1' },
  { name: '無印良品 ギフトカード 5,000円', unitPrice: 5000, url: 'https://www.amazon.co.jp/dp/B07XYZK1L1' },
  { name: 'コカコーラ 500ml 24本ケース', unitPrice: 2400, url: 'https://www.amazon.co.jp/dp/B07XYZL1M1' },
  { name: 'ティファール 電気ケトル 1.0L', unitPrice: 4800, url: 'https://www.amazon.co.jp/dp/B07XYZM1N1' },
  { name: '北海道 海鮮セット', unitPrice: 6800, url: 'https://www.amazon.co.jp/dp/B07XYZN1O1' },
  { name: 'バルミューダ トースター', unitPrice: 27500, url: 'https://www.amazon.co.jp/dp/B07XYZO1P1' },
  { name: 'JBL Bluetooth スピーカー', unitPrice: 7900, url: 'https://www.amazon.co.jp/dp/B07XYZP1Q1' },
];

function mockSuggest() {
  // 軽くシャッフル
  return [...MOCK_SUGGESTIONS].sort(() => Math.random() - 0.5);
}

// ===============================================
// 最適化（greedy: スコア/単価 が高い順に取る）
// ===============================================
function optimize(items, remainingBudget, remainingCount) {
  const candidates = items
    .filter(i => i.lane === 'other' && i.quantity > 0 && i.unitPrice > 0)
    .map(i => ({ ...i }))
    .sort((a, b) => {
      const ra = (a.rating || 5);
      const rb = (b.rating || 5);
      const ea = ra / Math.max(1, a.unitPrice);
      const eb = rb / Math.max(1, b.unitPrice);
      return eb - ea;
    });

  const selected = [];
  let budget = remainingBudget;
  let count = remainingCount;

  for (const item of candidates) {
    if (count <= 0 || budget <= 0) break;
    const maxByBudget = Math.floor(budget / item.unitPrice);
    const take = Math.min(item.quantity, maxByBudget, count);
    if (take <= 0) continue;
    selected.push({ ...item, quantity: take });
    budget -= item.unitPrice * take;
    count -= take;
  }

  return { selected, leftover: { budget, count } };
}

function buildFinalPlan(state) {
  const must = state.items.filter(i => i.lane === 'must');
  const mustTotal = must.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const mustCount = must.reduce((s, i) => s + i.quantity, 0);
  const remainingBudget = state.budget - mustTotal;

  const constraint = countConstraint(state);
  const minRemain = Math.max(0, constraint.min - mustCount);
  const maxRemain = constraint.max === Infinity ? Infinity : Math.max(0, constraint.max - mustCount);

  // 警告系
  const warnings = [];
  if (remainingBudget < 0) warnings.push(`絶対レーンの合計（${yen(mustTotal)}）が予算を超えています。`);
  if (constraint.max < Infinity && mustCount > constraint.max) {
    warnings.push(`絶対レーンの個数（${mustCount}）が指定上限（${constraint.max}）を超えています。`);
  }

  // 上限が Infinity の場合は安全な上限を用意（greedy ループ用）
  const optimizeMaxCount = maxRemain === Infinity ? 999 : maxRemain;
  const { selected, leftover } = optimize(state.items, Math.max(0, remainingBudget), optimizeMaxCount);
  const selectedCount = selected.reduce((s, i) => s + i.quantity, 0);
  const total = mustTotal + selected.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const totalCount = mustCount + selectedCount;

  // 最小未達チェック
  if (constraint.min > 0 && totalCount < constraint.min) {
    warnings.push(`最小個数（${constraint.min}）に届きませんでした（現在 ${totalCount} 個）。「それ以外」レーンに候補を追加してください。`);
  }
  if (constraint.fixed != null && totalCount !== constraint.fixed) {
    warnings.push(`固定指定 ${constraint.fixed} 個に対して、現在 ${totalCount} 個です。`);
  }

  return {
    must,
    selected,
    total,
    diff: state.budget - total,
    totalCount,
    constraint,
    constraintLabel: countConstraintLabel(state),
    leftover,
    warning: warnings.length > 0 ? warnings.join(' / ') : null,
  };
}

// ===============================================
// CSV 出力
// ===============================================
function exportCsv(rows) {
  const headers = ['カテゴリ', '商品名', '個数', '単価', '小計', 'URL', '評価'];
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      r.lane === 'must' ? '絶対' : '穴埋め',
      `"${(r.name || '').replace(/"/g, '""')}"`,
      r.quantity,
      r.unitPrice,
      r.unitPrice * r.quantity,
      `"${r.url || ''}"`,
      r.rating || '',
    ].join(',')),
  ].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gift-plan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
