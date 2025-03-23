import { Stock } from '@/app/lib/db/types';
import { StockPrice } from '@/app/lib/stockApi';

// 投資国ごとの総投資額を計算する関数
export function calculateTotalValueByCountry(
  stocks: Stock[],
  stockPrices: Map<string, StockPrice>,
  stockQuantities: Map<string | number, number>,
  usdToJpy: number
) {
  const japanTotal = stocks
    .filter(stock => stock.country === '日本')
    .reduce((sum, stock) => {
      const stockPrice = stockPrices.get(stock.symbol);
      const quantity = stock.id ? stockQuantities.get(stock.id) || 0 : 0;
      if (stockPrice && quantity > 0) {
        // 投資信託の場合は保有口数 * 基準価格 / 10000 で計算
        if (stock.assetType === 'fund') {
          return sum + (stockPrice.price * quantity / 10000);
        } else {
          return sum + (stockPrice.price * quantity);
        }
      }
      return sum;
    }, 0);

  const usTotal = stocks
    .filter(stock => stock.country === '米国')
    .reduce((sum, stock) => {
      const stockPrice = stockPrices.get(stock.symbol);
      const quantity = stock.id ? stockQuantities.get(stock.id) || 0 : 0;
      if (stockPrice && quantity > 0) {
        // 投資信託の場合は保有口数 * 基準価格 / 10000 で計算
        if (stock.assetType === 'fund') {
          // 通貨がUSDの場合のみ為替レートを適用
          if (stockPrice.currency === 'USD') {
            return sum + (stockPrice.price * quantity * usdToJpy / 10000);
          } else {
            return sum + (stockPrice.price * quantity / 10000);
          }
        } else {
          // 株式の場合
          // 通貨がUSDの場合のみ為替レートを適用
          if (stockPrice.currency === 'USD') {
            return sum + (stockPrice.price * quantity * usdToJpy);
          } else {
            return sum + (stockPrice.price * quantity);
          }
        }
      }
      return sum;
    }, 0);

  return {
    japan: japanTotal,
    us: usTotal
  };
}

// リバランス提案の計算
export function calculateRebalanceSuggestion(totalsByCountry: { japan: number; us: number }) {
  const total = totalsByCountry.japan + totalsByCountry.us;
  
  // 比率が0の場合（データがない場合）、50/50とする
  if (total === 0) {
    return {
      jpPercent: 0.5,
      usPercent: 0.5,
      difference: 0,
      suggestedCountry: null
    };
  }
  
  const jpPercent = totalsByCountry.japan / total;
  const usPercent = totalsByCountry.us / total;
  const difference = Math.abs(jpPercent - usPercent);
  
  // 差が10%以上あれば、投資比率の低い方の国に投資することを提案
  if (difference >= 0.1) {
    const suggestedCountry = jpPercent < usPercent ? 'japan' : 'us';
    return {
      jpPercent,
      usPercent,
      difference,
      suggestedCountry
    };
  }
  
  // 差が10%未満の場合は提案なし
  return {
    jpPercent,
    usPercent,
    difference,
    suggestedCountry: null
  };
}

// 投資収益率の計算
export function calculateInvestmentReturn(totalValue: number, totalInvestment: number) {
  if (totalInvestment === 0) return 0;
  return (totalValue - totalInvestment) / totalInvestment;
}

// 通貨フォーマット関数
export const formatCurrency = (amount: number, currency: 'JPY' | 'USD' = 'JPY') => {
  return new Intl.NumberFormat('ja-JP', { 
    style: 'currency', 
    currency: currency, 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    currencyDisplay: 'narrowSymbol'
  }).format(amount);
};

// パーセントフォーマット関数
export const formatPercent = (value: number) => {
  return new Intl.NumberFormat('ja-JP', { 
    style: 'percent', 
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}; 