// 株価情報リポジトリ

import { StockPriceData, StockPriceOperations } from '../types';
import { openDB, withTransaction, requestToPromise } from '../connection';
import { DbError } from '../utils/errors';

/**
 * 株価情報リポジトリを作成
 */
export function createStockPriceRepository(): StockPriceOperations {
  return {
    /**
     * 条件に一致する株価情報を取得
     */
    async findMany(options = {}): Promise<StockPriceData[]> {
      try {
        return await withTransaction('stockPrices', 'readonly', async (transaction) => {
          const store = transaction.objectStore('stockPrices');
          
          let request: IDBRequest<StockPriceData[]>;
          
          // クエリパラメータに応じた検索
          if (options.where?.stockId) {
            const index = store.index('stockId');
            request = index.getAll(options.where.stockId);
          } else if (options.where?.symbol) {
            const index = store.index('symbol');
            request = index.getAll(options.where.symbol);
          } else {
            request = store.getAll();
          }
          
          const results = await requestToPromise(request);
          
          // ソート
          if (options.orderBy) {
            const [field, direction] = Object.entries(options.orderBy)[0];
            return results.sort((a, b) => {
              const aValue = a[field as keyof StockPriceData];
              const bValue = b[field as keyof StockPriceData];
              
              // undefined 値の処理
              if (aValue === undefined && bValue === undefined) return 0;
              if (aValue === undefined) return 1;
              if (bValue === undefined) return -1;
              
              if (direction === 'asc') {
                return aValue > bValue ? 1 : -1;
              } else {
                return aValue < bValue ? 1 : -1;
              }
            });
          }
          
          return results;
        });
      } catch (error) {
        throw new DbError('株価情報の検索に失敗しました', error);
      }
    },
    
    /**
     * シンボルによる最新の株価情報を取得
     */
    async findLatestBySymbol(symbol: string): Promise<StockPriceData | null> {
      try {
        return await withTransaction('stockPrices', 'readonly', async (transaction) => {
          const store = transaction.objectStore('stockPrices');
          const index = store.index('symbol');
          const request = index.getAll(symbol);
          
          const results = await requestToPromise(request);
          if (results.length === 0) {
            return null;
          }
          
          // 最新の株価情報を取得
          return results.sort((a, b) => 
            new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
          )[0];
        });
      } catch (error) {
        throw new DbError(`シンボル ${symbol} の株価情報取得に失敗しました`, error);
      }
    },
    
    /**
     * 銘柄IDによる最新の株価情報を取得
     */
    async findLatestByStockId(stockId: number): Promise<StockPriceData | null> {
      try {
        return await withTransaction('stockPrices', 'readonly', async (transaction) => {
          const store = transaction.objectStore('stockPrices');
          const index = store.index('stockId');
          const request = index.getAll(stockId);
          
          const results = await requestToPromise(request);
          if (results.length === 0) {
            return null;
          }
          
          // 最新の株価情報を取得
          return results.sort((a, b) => 
            new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
          )[0];
        });
      } catch (error) {
        throw new DbError(`銘柄ID ${stockId} の株価情報取得に失敗しました`, error);
      }
    },
    
    /**
     * 株価情報を追加
     */
    async add(stockPrice: Omit<StockPriceData, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
      try {
        return await withTransaction('stockPrices', 'readwrite', async (transaction) => {
          const store = transaction.objectStore('stockPrices');
          const now = new Date();
          
          const newData = {
            ...stockPrice,
            createdAt: now,
            updatedAt: now
          };
          
          const request = store.add(newData);
          return await requestToPromise(request) as number;
        });
      } catch (error) {
        throw new DbError('株価情報の追加に失敗しました', error);
      }
    },
    
    /**
     * 株価情報を更新
     */
    async update(id: number, stockPrice: Partial<Omit<StockPriceData, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
      try {
        await withTransaction('stockPrices', 'readwrite', async (transaction) => {
          const store = transaction.objectStore('stockPrices');
          
          // 既存データの取得
          const getRequest = store.get(id);
          const data = await requestToPromise(getRequest);
          
          if (!data) {
            throw new DbError(`ID ${id} の株価情報が見つかりません`);
          }
          
          // データの更新
          const updatedData = {
            ...data,
            ...stockPrice,
            updatedAt: new Date()
          };
          
          const updateRequest = store.put(updatedData);
          await requestToPromise(updateRequest);
        });
      } catch (error) {
        throw new DbError(`株価情報の更新に失敗しました: ${error instanceof Error ? error.message : ''}`, error);
      }
    },
    
    /**
     * 株価情報を削除
     */
    async delete(id: number): Promise<void> {
      try {
        await withTransaction('stockPrices', 'readwrite', async (transaction) => {
          const store = transaction.objectStore('stockPrices');
          const request = store.delete(id);
          await requestToPromise(request);
        });
      } catch (error) {
        throw new DbError(`株価情報の削除に失敗しました: ID=${id}`, error);
      }
    }
  };
} 