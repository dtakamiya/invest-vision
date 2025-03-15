// 為替レートリポジトリ

import { ExchangeRateData, ExchangeRateOperations } from '../types';
import { withTransaction, requestToPromise } from '../connection';
import { DbError } from '../utils/errors';

/**
 * 為替レートリポジトリを作成
 */
export function createExchangeRateRepository(): ExchangeRateOperations {
  return {
    /**
     * 通貨ペアによる最新の為替レートを取得
     */
    async findLatestByCurrencyPair(fromCurrency: string, toCurrency: string): Promise<ExchangeRateData | null> {
      try {
        return await withTransaction('exchangeRates', 'readonly', async (transaction) => {
          const store = transaction.objectStore('exchangeRates');
          const index = store.index('currencyPair');
          const request = index.getAll([fromCurrency, toCurrency]);
          
          const results = await requestToPromise(request);
          if (results.length === 0) {
            return null;
          }
          
          // 最新の為替レート情報を取得
          return results.sort((a, b) => 
            new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
          )[0];
        });
      } catch (error) {
        throw new DbError(`通貨ペア ${fromCurrency}/${toCurrency} の為替レート取得に失敗しました`, error);
      }
    },
    
    /**
     * 為替レートを追加
     */
    async add(data: Omit<ExchangeRateData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExchangeRateData> {
      try {
        return await withTransaction('exchangeRates', 'readwrite', async (transaction) => {
          const store = transaction.objectStore('exchangeRates');
          
          // 現在の日時を設定
          const now = new Date();
          const exchangeRateData: Omit<ExchangeRateData, 'id'> = {
            ...data,
            createdAt: now,
            updatedAt: now
          };
          
          const request = store.add(exchangeRateData);
          const id = await requestToPromise(request) as number;
          
          return { ...exchangeRateData, id };
        });
      } catch (error) {
        throw new DbError(`通貨ペア ${data.fromCurrency}/${data.toCurrency} の為替レート追加に失敗しました`, error);
      }
    },
    
    /**
     * 為替レートを更新
     */
    async update(fromCurrency: string, toCurrency: string, data: { rate: number, lastUpdated: Date }): Promise<ExchangeRateData | null> {
      try {
        // まず既存のレコードを検索
        const existingRate = await this.findLatestByCurrencyPair(fromCurrency, toCurrency);
        
        if (existingRate) {
          // 既存のレコードがある場合は更新
          return await withTransaction('exchangeRates', 'readwrite', async (transaction) => {
            const store = transaction.objectStore('exchangeRates');
            
            const updatedData = {
              ...existingRate,
              rate: data.rate,
              lastUpdated: data.lastUpdated,
              updatedAt: new Date()
            };
            
            const updateRequest = store.put(updatedData);
            await requestToPromise(updateRequest);
            
            return updatedData;
          });
        } else {
          // 既存のレコードがない場合は新規作成
          return await this.add({
            fromCurrency,
            toCurrency,
            rate: data.rate,
            lastUpdated: data.lastUpdated
          });
        }
      } catch (error) {
        throw new DbError(`通貨ペア ${fromCurrency}/${toCurrency} の為替レート更新に失敗しました`, error);
      }
    },
    
    /**
     * 為替レートが期限切れかどうかをチェック
     */
    async isRateExpired(fromCurrency: string, toCurrency: string, expirationMinutes: number = 5): Promise<boolean> {
      const latestRate = await this.findLatestByCurrencyPair(fromCurrency, toCurrency);
      
      if (!latestRate) {
        return true; // レートが存在しない場合は期限切れとみなす
      }
      
      const now = new Date();
      const lastUpdated = new Date(latestRate.lastUpdated);
      const diffMs = now.getTime() - lastUpdated.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      return diffMinutes > expirationMinutes;
    }
  };
} 