import { openDB } from '../db-connection';
import { Dividend, DbOperations } from '../types';

/**
 * 配当リポジトリ
 * 配当の取得、作成、更新、削除などの操作を提供します
 */
export const dividendRepository: DbOperations<Dividend> = {
  /**
   * 複数の配当記録を検索して取得します
   * @param options 検索オプション（銘柄ID、ポートフォリオIDでのフィルタリング、ソート、関連銘柄の取得など）
   * @returns 配当記録の配列
   */
  async findMany(options: { 
    where?: { stockId?: number, portfolioId?: number },
    orderBy?: { [key: string]: 'asc' | 'desc' },
    include?: { stock?: boolean }
  } = {}): Promise<Dividend[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dividends', 'stocks'], 'readonly');
      const dividendStore = transaction.objectStore('dividends');
      
      let request;
      if (options.where?.stockId) {
        const index = dividendStore.index('stockId');
        request = index.getAll(options.where.stockId);
      } else if (options.where?.portfolioId) {
        const index = dividendStore.index('portfolioId');
        request = index.getAll(options.where.portfolioId);
      } else {
        request = dividendStore.getAll();
      }
      
      request.onsuccess = async () => {
        let results = request.result;
        
        // 複数の条件でフィルタリング
        if (options.where) {
          if (options.where.stockId && options.where.portfolioId) {
            results = results.filter(dividend => 
              dividend.stockId === options.where?.stockId && 
              dividend.portfolioId === options.where?.portfolioId
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
   * 新しい配当記録を作成します
   * @param data 作成する配当記録データ
   * @returns 作成された配当記録
   */
  async create(data: { data: Dividend }): Promise<Dividend> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dividends'], 'readwrite');
      const store = transaction.objectStore('dividends');
      
      const now = new Date();
      const dividendData = {
        ...data.data,
        receivedDate: new Date(data.data.receivedDate),
        createdAt: now,
        updatedAt: now
      };
      
      const request = store.add(dividendData);
      
      request.onsuccess = () => {
        const newId = request.result as number;
        resolve({ ...dividendData, id: newId });
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  },
  
  /**
   * 既存の配当記録を更新します
   * @param params 更新対象のID、更新データ
   * @returns 更新された配当記録
   */
  async update(params: { where: { id: number }, data: Partial<Dividend> }): Promise<Dividend> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dividends'], 'readwrite');
      const store = transaction.objectStore('dividends');
      const getRequest = store.get(params.where.id);
      
      getRequest.onsuccess = () => {
        const existingData = getRequest.result;
        if (!existingData) {
          reject(new Error('配当金記録が見つかりません'));
          db.close();
          return;
        }
        
        const updatedData = {
          ...existingData,
          ...params.data,
          receivedDate: params.data.receivedDate ? new Date(params.data.receivedDate) : existingData.receivedDate,
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
   * 配当記録を削除します
   * @param params 削除対象のID
   */
  async delete(params: { where: { id: number } }): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dividends'], 'readwrite');
      const store = transaction.objectStore('dividends');
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
   * IDを指定して単一の配当記録を取得します
   * @param params 検索対象のID
   * @returns 配当記録またはnull
   */
  async findUnique(params: { where: { id: number } }): Promise<Dividend | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dividends'], 'readonly');
      const store = transaction.objectStore('dividends');
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