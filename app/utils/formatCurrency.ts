/**
 * 通貨をフォーマットする関数
 * @param amount 金額
 * @param currencyCode 通貨コード（JPY, USD, EUR, GBPなど）
 * @returns フォーマットされた通貨文字列
 */
export function formatCurrency(amount: number | null | undefined, currencyCode: string): string {
  // nullやundefinedの場合は0として扱う
  const value = amount ?? 0;
  
  // 通貨記号の設定
  const currencySymbols: Record<string, string> = {
    'JPY': '¥',
    'USD': '$',
    'EUR': '€',
    'GBP': '£'
  };
  
  const symbol = currencySymbols[currencyCode] || `${currencyCode} `;
  
  // 日本円の場合は小数点以下なし、その他の通貨は小数点以下2桁
  const options: Intl.NumberFormatOptions = {
    style: 'decimal',
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2
  };
  
  // 数値をフォーマット
  const formattedNumber = new Intl.NumberFormat('ja-JP', options).format(value);
  
  // 負の値の場合は記号を前に移動
  if (value < 0) {
    return `-${symbol}${formattedNumber.replace('-', '')}`;
  }
  
  return `${symbol}${formattedNumber}`;
} 