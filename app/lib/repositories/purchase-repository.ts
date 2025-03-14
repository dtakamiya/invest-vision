import { openDB } from '../db-connection';
import { Purchase, DbOperations } from '../types';

/**
 * 購入記録リポジトリ
 * 購入記録の取得、作成、更新、削除などの操作を提供します
 */
export const purchaseRepository: DbOperations<Purchase> = {
  /**
   * 複数の購入記録を検索して取得します
   * @param options 検索オプション（銘柄ID、ポートフォリオIDでのフィルタリング、ソート、関連銘柄の取得など）
   * @returns 購入記録の配列
   */
  async findMany(options: { 
    where?: { stockId?: number, portfolioId?: number },
    orderBy?: { [key: string]: 'asc' | 'desc' },
    include?: { stock?: boolean }
  } = {}): Promise<Purchase[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['purchases', 'stocks'], 'readonly');
      const purchaseStore = transaction.objectStore('purchases');
      
      let request;
      if (options.where?.stockId) {
        const index = purchaseStore.index('stockId');
        request = index.getAll(options.where.stockId);
      } else if (options.where?.portfolioId) {
        const index = purchaseStore.index('portfolioId');
        request = index.getAll(options.where.portfolioId);
      } else {
        request = purchaseStore.getAll();
      }
      
      request.onsuccess = async () => {
        let results = request.result;
        
        // 複数の条件でフィルタリング
        if (options.where) {
          if (options.where.stockId && options.where.portfolioId) {
            results = results.filter(purchase => 
              purchase.stockId === options.where?.stockId && 
              purchase.portfolioId === options.where?.portfolioId
            );
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
        
        if (options.include?.stock) {
          const stockStore = transaction.objectStore('stocks');
          for (let i = 0; i < results.length; i++) {
            const stockRequest = stockStore.get(results[i].stockId);
            await new Promise<void>((resolveStock) => {
              stockRequest.onsuccess = () => {
                results[i].stock = stockRequest.result;
                resolveStock();
              };
            });
          }
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
   * 新しい購入記録を作成します
   * @param data 作成する購入記録データ
   * @returns 作成された購入記録
   */
  async create(data: { data: Purchase }): Promise<Purchase> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['purchases'], 'readwrite');
      const store = transaction.objectStore('purchases');
      
      const now = new Date();
      const purchaseData = {
        ...data.data,
        purchaseDate: new Date(data.data.purchaseDate),
        createdAt: now,
        updatedAt: now
      };
      
      const request = store.add(purchaseData);
      
      request.onsuccess = () => {
        const newId = request.result as number;
        resolve({ ...purchaseData, id: newId });
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  },
  
  /**
   * 既存の購入記録を更新します
   * @param params 更新対象のID、更新データ
   * @returns 更新された購入記録
   */
  async update(params: { where: { id: number }, data: Partial<Purchase> }): Promise<Purchase> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['purchases'], 'readwrite');
      const store = transaction.objectStore('purchases');
      const getRequest = store.get(params.where.id);
      
      getRequest.onsuccess = () => {
        const existingData = getRequest.result;
        if (!existingData) {
          reject(new Error('購入記録が見つかりません'));
          db.close();
          return;
        }
        
        const updatedData = {
          ...existingData,
          ...params.data,
          purchaseDate: params.data.purchaseDate ? new Date(params.data.purchaseDate) : existingData.purchaseDate,
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
   * 購入記録を削除します
   * @param params 削除対象のID
   */
  async delete(params: { where: { id: number } }): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['purchases'], 'readwrite');
      const store = transaction.objectStore('purchases');
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
  },

  /**
   * IDを指定して単一の購入記録を取得します
   * @param params 検索対象のID
   * @returns 購入記録またはnull
   */
  async findUnique(params: { where: { id: number } }): Promise<Purchase | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['purchases'], 'readonly');
      const store = transaction.objectStore('purchases');
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
  }
}; 