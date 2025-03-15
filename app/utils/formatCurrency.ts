/**
 * 通貨をフォーマットする関数
 * @param amount 金額
 * @param options フォーマットオプション
 * @returns フォーマットされた通貨文字列
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: {
    currency?: 'JPY' | 'USD' | 'EUR' | 'GBP' | string;
    notation?: 'standard' | 'compact';
    showCurrency?: boolean;
    maximumFractionDigits?: number;
  } = {}
): string {
  // nullやundefinedの場合は0として扱う
  const value = amount ?? 0;
  
  // デフォルトオプションの設定
  const {
    currency = 'JPY',
    notation = 'standard',
    showCurrency = true,
    maximumFractionDigits = currency === 'JPY' ? 0 : 2
  } = options;
  
  // フォーマットオプションの設定
  const formatOptions: Intl.NumberFormatOptions = {
    style: showCurrency ? 'currency' : 'decimal',
    currency,
    currencyDisplay: 'symbol',
    maximumFractionDigits,
    notation,
  };
  
  // 日本円の場合は小数点以下なし
  if (currency === 'JPY') {
    formatOptions.minimumFractionDigits = 0;
    formatOptions.maximumFractionDigits = 0;
  }
  
  // 数値をフォーマット
  return new Intl.NumberFormat('ja-JP', formatOptions).format(value);
}

/**
 * 日本円をフォーマットする関数（簡易版）
 * @param amount 金額
 * @param notation 表記法（標準またはコンパクト）
 * @returns フォーマットされた日本円文字列
 */
export function formatJPY(
  amount: number | null | undefined,
  notation: 'standard' | 'compact' = 'standard'
): string {
  return formatCurrency(amount, {
    currency: 'JPY',
    notation,
    showCurrency: true,
    maximumFractionDigits: 0
  });
}

/**
 * 米ドルをフォーマットする関数（簡易版）
 * @param amount 金額
 * @param notation 表記法（標準またはコンパクト）
 * @returns フォーマットされた米ドル文字列
 */
export function formatUSD(
  amount: number | null | undefined,
  notation: 'standard' | 'compact' = 'standard'
): string {
  return formatCurrency(amount, {
    currency: 'USD',
    notation,
    showCurrency: true
  });
}

/**
 * 数値を通貨記号なしでフォーマットする関数
 * @param amount 金額
 * @param options フォーマットオプション
 * @returns フォーマットされた数値文字列
 */
export function formatNumber(
  amount: number | null | undefined,
  options: {
    maximumFractionDigits?: number;
    notation?: 'standard' | 'compact';
  } = {}
): string {
  // nullやundefinedの場合は0として扱う
  const value = amount ?? 0;
  
  // デフォルトオプションの設定
  const {
    maximumFractionDigits = 0,
    notation = 'standard'
  } = options;
  
  // フォーマットオプションの設定
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'decimal',
    maximumFractionDigits,
    minimumFractionDigits: 0,
    notation,
  };
  
  // 数値をフォーマット
  return new Intl.NumberFormat('ja-JP', formatOptions).format(value);
} 