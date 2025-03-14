import { openDB } from '../db-connection';
import { Stock, Country, DbOperations } from '../types';

/**
 * 株式リポジトリ
 * 株式データの操作を担当
 */
export const stockRepository: DbOperations<Stock> = {
  /**
   * 複数の株式を検索
   * @param options 検索オプション
   * @returns 株式の配列
   */
  async findMany(options: {
    where?: { symbol?: string, country?: Country },
    orderBy?: { [key: string]: 'asc' | 'desc' },
    include?: { [key: string]: boolean }
  } = {}) {
    const db = await openDB();
    return new Promise<Stock[]>((resolve, reject) => {
      const transaction = db.transaction(['stocks'], 'readonly');
      const store = transaction.objectStore('stocks');
      
      let request;
      if (options.where?.symbol) {
        const index = store.index('symbol');
        request = index.getAll(options.where.symbol);
      } else if (options.where?.country) {
        const index = store.index('country');
        request = index.getAll(options.where.country);
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => {
        let results = request.result;
        
        // 複数の条件でフィルタリング
        if (options.where) {
          if (options.where.symbol && options.where.country) {
            results = results.filter(stock => stock.symbol === options.where?.symbol);
          }
          if (options.where.country && options.where.symbol) {
            results = results.filter(stock => stock.country === options.where?.country);
          }
        }
        
        if (options.orderBy) {
          const [key, order] = Object.entries(options.orderBy)[0];
          results = results.sort((a, b) => {
            if (order === 'asc') {
              return a[key] > b[key] ? 1 : -1;
            } else {
              return a[key] < b[key] ? 1 : -1;
            }
          });
        }
        
        resolve(results);
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  },

  /**
   * 特定の株式を検索
   * @param params 検索パラメータ
   * @returns 株式またはnull
   */
  async findUnique(params: { where: { id: number } }) {
    const db = await openDB();
    return new Promise<Stock | null>((resolve, reject) => {
      const transaction = db.transaction(['stocks'], 'readonly');
      const store = transaction.objectStore('stocks');
      const request = store.get(params.where.id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  },

  /**
   * 株式を更新
   * @param params 更新パラメータ
   * @returns 更新された株式
   */
  async update(params: { where: { id: number }, data: Partial<Stock> }) {
    const db = await openDB();
    return new Promise<Stock>((resolve, reject) => {
      const transaction = db.transaction(['stocks'], 'readwrite');
      const store = transaction.objectStore('stocks');
      const getRequest = store.get(params.where.id);
      
      getRequest.onsuccess = () => {
        const existingData = getRequest.result;
        if (!existingData) {
          reject(new Error('銘柄が見つかりません'));
          db.close();
          return;
        }
        
        const updatedData = {
          ...existingData,
          ...params.data,
          updatedAt: new Date()
        };
        
        const updateRequest = store.put(updatedData);
        
        updateRequest.onsuccess = () => {
          resolve(updatedData);
          db.close();
        };
        
        updateRequest.onerror = () => {
          reject(updateRequest.error);
          db.close();
        };
      };
      
      getRequest.onerror = () => {
        reject(getRequest.error);
        db.close();
      };
    });
  },

  /**
   * 新しい株式を作成
   * @param params 作成パラメータ
   * @returns 作成された株式
   */
  async create(params: { data: Stock }) {
    const db = await openDB();
    return new Promise<Stock>((resolve, reject) => {
      const transaction = db.transaction(['stocks'], 'readwrite');
      const store = transaction.objectStore('stocks');
      
      const now = new Date();
      const stockData = {
        ...params.data,
        createdAt: now,
        updatedAt: now
      };
      
      const request = store.add(stockData);
      
      request.onsuccess = () => {
        const newId = request.result as number;
        resolve({ ...stockData, id: newId });
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  },

  /**
   * 株式を削除
   * @param params 削除パラメータ
   */
  async delete(params: { where: { id: number } }) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['stocks'], 'readwrite');
      const store = transaction.objectStore('stocks');
      const request = store.delete(params.where.id);
      
      request.onsuccess = () => {
        resolve();
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  }
}; 