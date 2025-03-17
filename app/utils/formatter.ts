/**
 * 日付をフォーマットする関数
 * @param date フォーマットする日付
 * @returns フォーマットされた日付文字列 (例: "2023/01/01 12:34")
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 価格を通貨形式にフォーマットする関数
 * @param price 価格
 * @param currency 通貨コード（例: "JPY", "USD"）
 * @returns フォーマットされた価格文字列
 */
export function formatPrice(price: number, currency: string = 'JPY'): string {
  if (currency === 'JPY') {
    return price.toLocaleString('ja-JP') + '円';
  } else if (currency === 'USD') {
    return '$' + price.toLocaleString('en-US');
  } else {
    return price.toLocaleString() + ' ' + currency;
  }
}

/**
 * パーセンテージをフォーマットする関数
 * @param value パーセンテージ値（0.01 = 1%）
 * @param digits 小数点以下の桁数
 * @returns フォーマットされたパーセンテージ文字列
 */
export function formatPercent(value: number, digits: number = 2): string {
  return (value * 100).toFixed(digits) + '%';
} 