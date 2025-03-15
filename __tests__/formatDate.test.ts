/**
 * 日付フォーマット関数のテスト
 */

import { formatDate } from '@/app/utils/formatDate';

describe('formatDate', () => {
  it('日付を正しくフォーマットする（デフォルト形式）', () => {
    const date = new Date('2025-03-15T12:34:56');
    expect(formatDate(date)).toBe('2025年3月15日');
  });

  it('日付を正しくフォーマットする（年月日時分）', () => {
    const date = new Date('2025-03-15T12:34:56');
    expect(formatDate(date, 'datetime')).toBe('2025年3月15日 12:34');
  });

  it('日付を正しくフォーマットする（年月日時分秒）', () => {
    const date = new Date('2025-03-15T12:34:56');
    expect(formatDate(date, 'full')).toBe('2025年3月15日 12:34:56');
  });

  it('日付を正しくフォーマットする（月日）', () => {
    const date = new Date('2025-03-15T12:34:56');
    expect(formatDate(date, 'monthday')).toBe('3月15日');
  });

  it('日付を正しくフォーマットする（時分）', () => {
    const date = new Date('2025-03-15T12:34:56');
    expect(formatDate(date, 'time')).toBe('12:34');
  });

  it('日付を正しくフォーマットする（ISO形式）', () => {
    const date = new Date('2025-03-15T12:34:56');
    expect(formatDate(date, 'iso')).toBe('2025-03-15T12:34:56');
  });

  it('日付を正しくフォーマットする（スラッシュ区切り）', () => {
    const date = new Date('2025-03-15T12:34:56');
    expect(formatDate(date, 'slash')).toBe('2025/03/15');
  });

  it('nullやundefinedの場合は空文字を返す', () => {
    // @ts-ignore: テスト用に意図的にnullを渡す
    expect(formatDate(null)).toBe('');
    // @ts-ignore: テスト用に意図的にundefinedを渡す
    expect(formatDate(undefined)).toBe('');
  });

  it('無効な日付の場合は空文字を返す', () => {
    // @ts-ignore: テスト用に意図的に無効な値を渡す
    expect(formatDate('invalid date')).toBe('');
    expect(formatDate(new Date('invalid'))).toBe('');
  });
}); 