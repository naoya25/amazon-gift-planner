// プロトタイプ docs/prototype/app.js の KEYWORD_DB / MOCK_SUGGESTIONS を移植。
// Amazon PA-API / JapanAI 本実装に置き換わるまでの暫定データ。

import type { SearchCandidate, SuggestCandidate } from '../../shared/schemas';

export type SearchMockEntry = {
  average: number;
  range: [number, number];
  candidates: SearchCandidate[];
};

export const KEYWORD_DB: Record<string, SearchMockEntry> = {
  switch: {
    average: 38000,
    range: [21978, 39800],
    candidates: [
      {
        title: 'Nintendo Switch 有機ELモデル ホワイト',
        price: 39800,
        url: 'https://www.amazon.co.jp/dp/B098RKWHHZ',
      },
      {
        title: 'Nintendo Switch 本体 ネオン',
        price: 32970,
        url: 'https://www.amazon.co.jp/dp/B07S5RJVQ7',
      },
      {
        title: 'Nintendo Switch Lite ターコイズ',
        price: 21978,
        url: 'https://www.amazon.co.jp/dp/B07VLN1HCW',
      },
    ],
  },
  ダイソン: {
    average: 46900,
    range: [38500, 53900],
    candidates: [
      {
        title: 'ダイソン V8 Slim Fluffy コードレスクリーナー',
        price: 48400,
        url: 'https://www.amazon.co.jp/dp/B08K3VG7HF',
      },
      {
        title: 'ダイソン V10 Fluffy',
        price: 53900,
        url: 'https://www.amazon.co.jp/dp/B07KKQX5G2',
      },
      {
        title: 'ダイソン V7 Motorhead',
        price: 38500,
        url: 'https://www.amazon.co.jp/dp/B07L8FFNS5',
      },
    ],
  },
  スターバックス: {
    average: 4000,
    range: [3000, 5000],
    candidates: [
      {
        title: 'スターバックス カード 5,000円分',
        price: 5000,
        url: 'https://www.amazon.co.jp/dp/B07XYZA1B1',
      },
      {
        title: 'スターバックス eギフト 3,000円',
        price: 3000,
        url: 'https://www.amazon.co.jp/dp/B07XYZA1B2',
      },
      {
        title: 'スターバックス ドリンクチケット 5枚',
        price: 4000,
        url: 'https://www.amazon.co.jp/dp/B07XYZA1B3',
      },
    ],
  },
  お米: {
    average: 3880,
    range: [1980, 5980],
    candidates: [
      {
        title: '魚沼産コシヒカリ 5kg',
        price: 5980,
        url: 'https://www.amazon.co.jp/dp/B07XYZA2C1',
      },
      {
        title: '北海道産ななつぼし 5kg',
        price: 3680,
        url: 'https://www.amazon.co.jp/dp/B07XYZA2C2',
      },
      {
        title: 'こしひかり 2kg',
        price: 1980,
        url: 'https://www.amazon.co.jp/dp/B07XYZA2C3',
      },
    ],
  },
  コーヒー: {
    average: 2500,
    range: [1500, 4500],
    candidates: [
      {
        title: 'スターバックス コーヒー豆 250g',
        price: 1800,
        url: 'https://www.amazon.co.jp/dp/B07XYZH1I1',
      },
      {
        title: 'UCC ドリップコーヒー 50杯分',
        price: 2480,
        url: 'https://www.amazon.co.jp/dp/B07XYZH1I2',
      },
      {
        title: 'ブルーボトル コーヒー ギフトセット',
        price: 4500,
        url: 'https://www.amazon.co.jp/dp/B07XYZH1I3',
      },
    ],
  },
};

export function mockSearchByKeyword(keyword: string): SearchMockEntry {
  const lower = keyword.toLowerCase();
  for (const key of Object.keys(KEYWORD_DB)) {
    if (lower.includes(key.toLowerCase())) {
      return KEYWORD_DB[key]!;
    }
  }
  // 未知キーワードはダミー生成（決定的にする: keyword 長に依存）
  const base = Math.max(1500, (keyword.length + 3) * 1100);
  const round = (n: number) => Math.round(n / 100) * 100;
  return {
    average: round(base),
    range: [round(base * 0.7), round(base * 1.3)],
    candidates: [
      {
        title: `${keyword} 定番モデル`,
        price: base,
        url: 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(keyword),
      },
      {
        title: `${keyword} お買い得`,
        price: round(base * 0.75),
        url: 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(keyword),
      },
      {
        title: `${keyword} プレミアム`,
        price: round(base * 1.2),
        url: 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(keyword),
      },
    ],
  };
}

export const MOCK_SUGGESTIONS: SuggestCandidate[] = [
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

/**
 * Suggest モック: 単純シャッフルで返す。
 * 本実装では JapanAI に予算/必須レーン内容を渡して動的に生成。
 */
export function mockSuggest(): SuggestCandidate[] {
  return [...MOCK_SUGGESTIONS].sort(() => Math.random() - 0.5);
}
