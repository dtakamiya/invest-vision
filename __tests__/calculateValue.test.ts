import { Stock } from '@/app/lib/db';
import { StockPrice } from '@/app/lib/stockApi';
import { FundPrice } from '@/app/lib/fundApi';
import { calculateValue } from '@/app/utils/calculateValue';

describe('calculateValue', () => {
  // テスト用の為替レート
  const exchangeRate = { rate: 150, lastUpdated: new Date() };

  it('日本株の評価額を正しく計算する', () => {
    const stock: Stock = {
      id: 1,
      symbol: '1234',
      name: 'テスト株式',
      country: '日本',
      assetType: 'stock',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const stockPrice: StockPrice = {
      symbol: '1234',
      price: 3000,
      change: 0,
      changePercent: 0,
      currency: 'JPY',
      lastUpdated: new Date()
    };
    
    const result = calculateValue(stock, stockPrice, undefined, exchangeRate, 100);
    expect(result.value).toBe(300000);
    expect(result.currency).toBe('円');
  });

  it('米国株の評価額を正しく計算する', () => {
    const stock: Stock = {
      id: 2,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      country: '米国',
      assetType: 'stock',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const stockPrice: StockPrice = {
      symbol: 'AAPL',
      price: 200,
      change: 0,
      changePercent: 0,
      currency: 'USD',
      lastUpdated: new Date()
    };
    
    const result = calculateValue(stock, stockPrice, undefined, exchangeRate, 50);
    expect(result.value).toBe(1500000);
    expect(result.currency).toBe('円');
  });

  it('投資信託の評価額を正しく計算する', () => {
    const stock: Stock = {
      id: 3,
      symbol: '12345',
      name: 'テスト投資信託',
      country: '日本',
      assetType: 'fund',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const fundPrice: FundPrice = {
      isin: '12345',
      name: 'テスト投資信託',
      price: 12000,
      date: new Date(),
      currency: 'JPY',
      lastUpdated: new Date()
    };
    
    const result = calculateValue(stock, undefined, fundPrice, exchangeRate, 10000);
    expect(result.value).toBe(12000);
    expect(result.currency).toBe('円');
  });

  it('株価情報がない場合はnullを返す', () => {
    const stock: Stock = {
      id: 4,
      symbol: 'TEST',
      name: 'テスト株式',
      country: '日本',
      assetType: 'stock',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = calculateValue(stock, undefined, undefined, exchangeRate, 100);
    expect(result.value).toBeNull();
    expect(result.currency).toBe('円');
  });

  it('数量が0の場合はnullを返す', () => {
    const stock: Stock = {
      id: 5,
      symbol: 'TEST2',
      name: 'テスト株式2',
      country: '日本',
      assetType: 'stock',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const stockPrice: StockPrice = {
      symbol: 'TEST2',
      price: 1000,
      change: 0,
      changePercent: 0,
      currency: 'JPY',
      lastUpdated: new Date()
    };
    
    const result = calculateValue(stock, stockPrice, undefined, exchangeRate, 0);
    expect(result.value).toBeNull();
    expect(result.currency).toBe('円');
  });
}); 