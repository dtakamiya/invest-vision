/**
 * 通貨フォーマット関数のテスト
 */

import { formatCurrency } from '@/app/utils/formatCurrency';

describe('formatCurrency', () => {
  it('日本円を正しくフォーマットする', () => {
    expect(formatCurrency(1000, 'JPY')).toBe('¥1,000');
    expect(formatCurrency(1500.5, 'JPY')).toBe('¥1,501'); // 小数点以下は四捨五入
    expect(formatCurrency(1000000, 'JPY')).toBe('¥1,000,000');
    expect(formatCurrency(0, 'JPY')).toBe('¥0');
  });

  it('米ドルを正しくフォーマットする', () => {
    expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
    expect(formatCurrency(1500.5, 'USD')).toBe('$1,500.50');
    expect(formatCurrency(1500.54, 'USD')).toBe('$1,500.54');
    expect(formatCurrency(1500.546, 'USD')).toBe('$1,500.55'); // 小数点以下3桁目は四捨五入
    expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('ユーロを正しくフォーマットする', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00');
    expect(formatCurrency(1500.5, 'EUR')).toBe('€1,500.50');
    expect(formatCurrency(1000000, 'EUR')).toBe('€1,000,000.00');
    expect(formatCurrency(0, 'EUR')).toBe('€0.00');
  });

  it('英ポンドを正しくフォーマットする', () => {
    expect(formatCurrency(1000, 'GBP')).toBe('£1,000.00');
    expect(formatCurrency(1500.5, 'GBP')).toBe('£1,500.50');
    expect(formatCurrency(1000000, 'GBP')).toBe('£1,000,000.00');
    expect(formatCurrency(0, 'GBP')).toBe('£0.00');
  });

  it('不明な通貨コードの場合はそのまま表示する', () => {
    expect(formatCurrency(1000, 'XYZ')).toBe('XYZ 1,000.00');
    expect(formatCurrency(1500.5, 'ABC')).toBe('ABC 1,500.50');
    expect(formatCurrency(0, 'UNKNOWN')).toBe('UNKNOWN 0.00');
  });

  it('負の値を正しくフォーマットする', () => {
    expect(formatCurrency(-1000, 'JPY')).toBe('-¥1,000');
    expect(formatCurrency(-1500.5, 'USD')).toBe('-$1,500.50');
    expect(formatCurrency(-1000000, 'EUR')).toBe('-€1,000,000.00');
  });

  it('nullやundefinedの場合は0として扱う', () => {
    // @ts-ignore: テスト用に意図的にnullを渡す
    expect(formatCurrency(null, 'JPY')).toBe('¥0');
    // @ts-ignore: テスト用に意図的にundefinedを渡す
    expect(formatCurrency(undefined, 'USD')).toBe('$0.00');
  });
}); 