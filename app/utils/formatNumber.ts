/**
 * 数値計算に関するユーティリティ関数
 */

/**
 * 数値を四捨五入する関数
 * @param value 四捨五入する数値
 * @returns 四捨五入された数値
 */
export function roundNumber(value: number): number {
  return Math.round(value);
}

/**
 * 投資信託の評価額を計算する関数
 * @param price 基準価格
 * @param quantity 数量
 * @returns 評価額（円）
 */
export function calculateFundValue(price: number, quantity: number): number {
  return Math.round(price * quantity / 10000);
}

/**
 * 株式（日本円）の評価額を計算する関数
 * @param price 株価
 * @param quantity 数量
 * @returns 評価額（円）
 */
export function calculateJPYStockValue(price: number, quantity: number): number {
  return Math.round(price * quantity);
}

/**
 * 株式（米ドル）の評価額を計算する関数
 * @param price 株価（ドル）
 * @param quantity 数量
 * @param exchangeRate 為替レート
 * @returns 評価額（円）
 */
export function calculateUSDStockValue(price: number, quantity: number, exchangeRate: number): number {
  return Math.round(price * quantity * exchangeRate);
}

/**
 * パーセンテージを計算する関数
 * @param value 値
 * @param total 合計
 * @returns パーセンテージ（整数）
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
} 