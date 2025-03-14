import { openDB } from '../db-connection';
import { Portfolio, DbOperations } from '../types';

/**
 * ポートフォリオリポジトリ
 * ポートフォリオデータの操作を担当
 */
export const portfolioRepository: DbOperations<Portfolio> = {
  /**
   * 複数のポートフォリオを検索
   * @param options 検索オプション
   * @returns ポートフォリオの配列
   */
  async findMany(options: {
    where?: { isDefault?: boolean },
    orderBy?: { [key: string]: 'asc' | 'desc' },
    include?: { [key: string]: boolean }
  } = {}) {
    const db = await openDB();
    return new Promise<Portfolio[]>((resolve, reject) => {
      const transaction = db.transaction(['portfolios'], 'readonly');
      const store = transaction.objectStore('portfolios');
      const request = store.getAll();
      
      request.onsuccess = () => {
        let results = request.result;
        
        // where句によるフィルタリング
        if (options.where) {
          if (options.where.isDefault !== undefined) {
            results = results.filter(portfolio => portfolio.isDefault === options.where?.isDefault);
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
   * 特定のポートフォリオを検索
   * @param params 検索パラメータ
   * @returns ポートフォリオまたはnull
   */
  async findUnique(params: { where: { id: number } }) {
    const db = await openDB();
    return new Promise<Portfolio | null>((resolve, reject) => {
      const transaction = db.transaction(['portfolios'], 'readonly');
      const store = transaction.objectStore('portfolios');
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
   * ポートフォリオを更新
   * @param params 更新パラメータ
   * @returns 更新されたポートフォリオ
   */
  async update(params: { where: { id: number }, data: Partial<Portfolio> }) {
    const db = await openDB();
    return new Promise<Portfolio>((resolve, reject) => {
      const transaction = db.transaction(['portfolios'], 'readwrite');
      const store = transaction.objectStore('portfolios');
      const getRequest = store.get(params.where.id);
      
      getRequest.onsuccess = () => {
        const existingData = getRequest.result;
        if (!existingData) {
          reject(new Error('ポートフォリオが見つかりません'));
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
   * 新しいポートフォリオを作成
   * @param params 作成パラメータ
   * @returns 作成されたポートフォリオ
   */
  async create(params: { data: Portfolio }) {
    const db = await openDB();
    return new Promise<Portfolio>((resolve, reject) => {
      const transaction = db.transaction(['portfolios'], 'readwrite');
      const store = transaction.objectStore('portfolios');
      
      const now = new Date();
      const portfolioData = {
        ...params.data,
        createdAt: now,
        updatedAt: now
      };
      
      const request = store.add(portfolioData);
      
      request.onsuccess = () => {
        const newId = request.result as number;
        resolve({ ...portfolioData, id: newId });
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  },

  /**
   * ポートフォリオを削除
   * @param params 削除パラメータ
   */
  async delete(params: { where: { id: number } }) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['portfolios'], 'readwrite');
      const store = transaction.objectStore('portfolios');
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