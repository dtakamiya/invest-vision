import { Stock } from "@/app/lib/db";
import { StockPrice } from "@/app/lib/stockApi";
import { FundPrice } from "@/app/lib/fundApi";

/**
 * 評価額を計算する関数
 * @param stock 株式または投資信託の情報
 * @param stockPrice 株価情報
 * @param fundPrice 投資信託価格情報
 * @param exchangeRate 為替レート情報
 * @param quantity 保有数量
 * @returns 評価額と通貨
 */
export function calculateValue(
  stock: Stock,
  stockPrice: StockPrice | undefined,
  fundPrice: FundPrice | undefined,
  exchangeRate: { rate: number; lastUpdated: Date },
  quantity: number
): { value: number | null; currency: string } {
  // 投資信託の場合
  if (stock.assetType === 'fund' && fundPrice) {
    return {
      value: Math.round(fundPrice.price * quantity / 10000),
      currency: '円'
    };
  }
  
  // 株式の場合
  if (!stockPrice || quantity === 0) return { value: null, currency: '円' };
  
  // USDの場合、為替レートを適用
  if (stockPrice.currency === 'USD') {
    return {
      value: Math.round(stockPrice.price * quantity * exchangeRate.rate),
      currency: '円'
    };
  }
  
  return {
    value: Math.round(stockPrice.price * quantity),
    currency: '円'
  };
} 