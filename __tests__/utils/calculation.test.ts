// calculateTotalValueByCountryとcalculateValue関数のテスト

import { Stock } from '@/app/lib/db';
import { StockPrice } from '@/app/lib/stockApi';

// app/page.tsxのcalculateTotalValueByCountry関数を模倣した関数
function calculateTotalValueByCountry(
  stocks: Stock[],
  stockPrices: Map<string, StockPrice>,
  stockQuantities: Map<number, number>,
  exchangeRate: { rate: number; lastUpdated: Date }
) {
  const japanTotal = stocks
    .filter(stock => stock.country === '日本' && stock.id !== undefined)
    .reduce((sum, stock) => {
      const stockPrice = stockPrices.get(stock.symbol);
      const quantity = stockQuantities.get(stock.id as number) || 0;
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
    .filter(stock => stock.country === '米国' && stock.id !== undefined)
    .reduce((sum, stock) => {
      const stockPrice = stockPrices.get(stock.symbol);
      const quantity = stockQuantities.get(stock.id as number) || 0;
      if (stockPrice && quantity > 0) {
        // 投資信託の場合は保有口数 * 基準価格 / 10000 で計算
        if (stock.assetType === 'fund') {
          // 通貨がUSDの場合のみ為替レートを適用
          if (stockPrice.currency === 'USD') {
            return sum + (stockPrice.price * quantity * exchangeRate.rate / 10000);
          } else {
            return sum + (stockPrice.price * quantity / 10000);
          }
        } else {
          // 株式の場合
          // 通貨がUSDの場合のみ為替レートを適用
          if (stockPrice.currency === 'USD') {
            return sum + (stockPrice.price * quantity * exchangeRate.rate);
          } else {
            return sum + (stockPrice.price * quantity);
          }
        }
      }
      return sum;
    }, 0);

  const total = stocks
    .filter(stock => stock.id !== undefined)
    .reduce((sum, stock) => {
      const stockPrice = stockPrices.get(stock.symbol);
      const quantity = stockQuantities.get(stock.id as number) || 0;
      if (stockPrice && quantity > 0) {
        // 投資信託の場合は保有口数 * 基準価格 / 10000 で計算
        if (stock.assetType === 'fund') {
          if (stock.country === '米国' && stockPrice.currency === 'USD') {
            return sum + (stockPrice.price * quantity * exchangeRate.rate / 10000);
          } else {
            return sum + (stockPrice.price * quantity / 10000);
          }
        } else {
          // 株式の場合
          if (stock.country === '米国' && stockPrice.currency === 'USD') {
            return sum + (stockPrice.price * quantity * exchangeRate.rate);
          } else {
            return sum + (stockPrice.price * quantity);
          }
        }
      }
      return sum;
    }, 0);

  return {
    japanTotal: Math.round(japanTotal * 10) / 10,
    usTotal: Math.round(usTotal * 10) / 10,
    total: Math.round(total * 10) / 10
  };
}

// app/stocks/page.tsxのcalculateValue関数を模倣した関数
function calculateValue(
  stock: Stock,
  stockPrice: StockPrice | undefined,
  exchangeRate: { rate: number; lastUpdated: Date },
  quantity: number
): { value: number | null; currency: string } {
  // 株価情報がない場合はnullを返す
  if (!stockPrice) return { value: null, currency: '円' };
  
  // 数量が0の場合は0を返す
  if (quantity === 0) return { value: 0, currency: '円' };
  
  // 投資信託の場合は「口数×現在値/10000」で計算
  if (stock.assetType === 'fund') {
    return {
      value: Math.round(stockPrice.price * quantity / 10000 * 10) / 10,
      currency: '円'
    };
  }
  
  // USDの場合、為替レートを適用
  if (stockPrice.currency === 'USD') {
    return {
      value: Math.round(stockPrice.price * quantity * exchangeRate.rate * 10) / 10,
      currency: '円'
    };
  }
  
  return {
    value: Math.round(stockPrice.price * quantity * 10) / 10,
    currency: '円'
  };
}

describe('calculateTotalValueByCountry', () => {
  test('日本株の評価額が少数第一位まで丸められる', () => {
    // テスト用のデータを準備
    const stocks: Stock[] = [
      { id: 1, symbol: '7203.T', name: 'トヨタ自動車', country: '日本', assetType: 'stock' } as Stock
    ];
    
    const stockPrices = new Map<string, StockPrice>();
    stockPrices.set('7203.T', {
      symbol: '7203.T',
      price: 2500.5,
      change: 50,
      changePercent: 2,
      currency: 'JPY',
      lastUpdated: new Date()
    });
    
    const stockQuantities = new Map<number, number>();
    stockQuantities.set(1, 100);
    
    const exchangeRate = { rate: 150, lastUpdated: new Date() };
    
    // 関数を実行
    const result = calculateTotalValueByCountry(stocks, stockPrices, stockQuantities, exchangeRate);
    
    // 結果を検証
    expect(result.japanTotal).toBe(250050); // 2500.5 * 100 = 250050
    expect(result.japanTotal % 1).toBe(0); // 整数部分のみ（丸められる）
  });
  
  test('米国株の評価額が少数第一位まで丸められる', () => {
    // テスト用のデータを準備
    const stocks: Stock[] = [
      { id: 1, symbol: 'AAPL', name: 'Apple Inc.', country: '米国', assetType: 'stock' } as Stock
    ];
    
    const stockPrices = new Map<string, StockPrice>();
    stockPrices.set('AAPL', {
      symbol: 'AAPL',
      price: 180.3,
      change: 2,
      changePercent: 1,
      currency: 'USD',
      lastUpdated: new Date()
    });
    
    const stockQuantities = new Map<number, number>();
    stockQuantities.set(1, 10);
    
    const exchangeRate = { rate: 150.5, lastUpdated: new Date() };
    
    // 関数を実行
    const result = calculateTotalValueByCountry(stocks, stockPrices, stockQuantities, exchangeRate);
    
    // 結果を検証
    // 180.3 * 10 * 150.5 = 271351.5、小数第一位まで丸めると 271351.5
    expect(result.usTotal).toBe(271351.5);
  });
  
  test('合計評価額が少数第一位まで丸められる', () => {
    // テスト用のデータを準備
    const stocks: Stock[] = [
      { id: 1, symbol: '7203.T', name: 'トヨタ自動車', country: '日本', assetType: 'stock' } as Stock,
      { id: 2, symbol: 'AAPL', name: 'Apple Inc.', country: '米国', assetType: 'stock' } as Stock
    ];
    
    const stockPrices = new Map<string, StockPrice>();
    stockPrices.set('7203.T', {
      symbol: '7203.T',
      price: 2500.3,
      change: 50,
      changePercent: 2,
      currency: 'JPY',
      lastUpdated: new Date()
    });
    
    stockPrices.set('AAPL', {
      symbol: 'AAPL',
      price: 180.7,
      change: 2,
      changePercent: 1,
      currency: 'USD',
      lastUpdated: new Date()
    });
    
    const stockQuantities = new Map<number, number>();
    stockQuantities.set(1, 100); // トヨタ
    stockQuantities.set(2, 10);  // Apple
    
    const exchangeRate = { rate: 150.3, lastUpdated: new Date() };
    
    // 関数を実行
    const result = calculateTotalValueByCountry(stocks, stockPrices, stockQuantities, exchangeRate);
    
    // 結果を検証
    // 日本株: 2500.3 * 100 = 250030
    // 米国株: 180.7 * 10 * 150.3 = 271592.1
    // 合計: 250030 + 271592.1 = 521622.1、小数第一位まで丸めると 521622.1
    expect(result.total).toBe(521622.1);
  });
});

describe('calculateValue', () => {
  test('投資信託の評価額が少数第一位まで丸められる', () => {
    const stock: Stock = { id: 1, symbol: '9I123456', name: '日本インデックスファンド', country: '日本', assetType: 'fund' } as Stock;
    
    const stockPrice: StockPrice = {
      symbol: '9I123456',
      price: 12345.6,
      change: 0,
      changePercent: 0,
      currency: 'JPY',
      lastUpdated: new Date()
    };
    
    const exchangeRate = { rate: 150, lastUpdated: new Date() };
    const quantity = 5000; // 5000口
    
    // 関数を実行
    const result = calculateValue(stock, stockPrice, exchangeRate, quantity);
    
    // 結果を検証
    // 投資信託: 12345.6 * 5000 / 10000 = 6172.8、小数第一位まで丸めると 6172.8
    expect(result.value).toBe(6172.8);
  });
  
  test('米国株の評価額が少数第一位まで丸められる', () => {
    const stock: Stock = { id: 1, symbol: 'AAPL', name: 'Apple Inc.', country: '米国', assetType: 'stock' } as Stock;
    
    const stockPrice: StockPrice = {
      symbol: 'AAPL',
      price: 180.7,
      change: 2,
      changePercent: 1,
      currency: 'USD',
      lastUpdated: new Date()
    };
    
    const exchangeRate = { rate: 150.3, lastUpdated: new Date() };
    const quantity = 10; // 10株
    
    // 関数を実行
    const result = calculateValue(stock, stockPrice, exchangeRate, quantity);
    
    // 結果を検証
    // 米国株: 180.7 * 10 * 150.3 = 271592.1、小数第一位まで丸めると 271592.1
    expect(result.value).toBe(271592.1);
  });
  
  test('日本株の評価額が少数第一位まで丸められる', () => {
    const stock: Stock = { id: 1, symbol: '7203.T', name: 'トヨタ自動車', country: '日本', assetType: 'stock' } as Stock;
    
    const stockPrice: StockPrice = {
      symbol: '7203.T',
      price: 2500.3,
      change: 50,
      changePercent: 2,
      currency: 'JPY',
      lastUpdated: new Date()
    };
    
    const exchangeRate = { rate: 150, lastUpdated: new Date() };
    const quantity = 100; // 100株
    
    // 関数を実行
    const result = calculateValue(stock, stockPrice, exchangeRate, quantity);
    
    // 結果を検証
    // 日本株: 2500.3 * 100 = 250030、小数第一位まで丸めると 250030.0
    expect(result.value).toBe(250030);
  });
  
  test('株価情報がない場合はnullを返す', () => {
    const stock: Stock = { id: 1, symbol: '7203.T', name: 'トヨタ自動車', country: '日本', assetType: 'stock' } as Stock;
    
    const exchangeRate = { rate: 150, lastUpdated: new Date() };
    const quantity = 100;
    
    // 関数を実行
    const result = calculateValue(stock, undefined, exchangeRate, quantity);
    
    // 結果を検証
    expect(result.value).toBeNull();
  });
  
  test('数量が0の場合は0を返す', () => {
    const stock: Stock = { id: 1, symbol: '7203.T', name: 'トヨタ自動車', country: '日本', assetType: 'stock' } as Stock;
    
    const stockPrice: StockPrice = {
      symbol: '7203.T',
      price: 2500,
      change: 50,
      changePercent: 2,
      currency: 'JPY',
      lastUpdated: new Date()
    };
    
    const exchangeRate = { rate: 150, lastUpdated: new Date() };
    const quantity = 0;
    
    // 関数を実行
    const result = calculateValue(stock, stockPrice, exchangeRate, quantity);
    
    // 結果を検証
    expect(result.value).toBe(0);
  });
}); 