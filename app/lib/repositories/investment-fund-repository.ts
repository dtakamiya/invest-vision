import { openDB } from '../db-connection';
import { InvestmentFund, DbOperations } from '../types';

/**
 * 投資資金リポジトリ
 * 投資資金の入出金記録の取得、作成、更新、削除などの操作を提供します
 */
export const investmentFundRepository: DbOperations<InvestmentFund> & {
  getTotalFunds: (options?: { where?: { portfolioId?: number } }) => Promise<number>;
} = {
  /**
   * 複数の投資資金記録を検索して取得します
   * @param options 検索オプション（タイプ、ポートフォリオIDでのフィルタリング、ソートなど）
   * @returns 投資資金記録の配列
   */
  async findMany(options: { 
    where?: { type?: 'deposit' | 'withdrawal', portfolioId?: number },
    orderBy?: { [key: string]: 'asc' | 'desc' }
  } = {}): Promise<InvestmentFund[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['investmentFunds'], 'readonly');
      const store = transaction.objectStore('investmentFunds');
      
      let request;
      if (options.where?.portfolioId) {
        const index = store.index('portfolioId');
        request = index.getAll(options.where.portfolioId);
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => {
        let results = request.result;
        
        // 複数の条件でフィルタリング
        if (options.where) {
          if (options.where.type) {
            results = results.filter(fund => fund.type === options.where?.type);
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
   * IDを指定して単一の投資資金記録を取得します
   * @param params 検索対象のID
   * @returns 投資資金記録またはnull
   */
  async findUnique(params: { where: { id: number } }): Promise<InvestmentFund | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['investmentFunds'], 'readonly');
      const store = transaction.objectStore('investmentFunds');
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
   * 新しい投資資金記録を作成します
   * @param data 作成する投資資金記録データ
   * @returns 作成された投資資金記録
   */
  async create(data: { data: InvestmentFund }): Promise<InvestmentFund> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['investmentFunds'], 'readwrite');
      const store = transaction.objectStore('investmentFunds');
      
      const now = new Date();
      const fundData = {
        ...data.data,
        createdAt: now,
        updatedAt: now
      };
      
      const request = store.add(fundData);
      
      request.onsuccess = () => {
        const newId = request.result as number;
        resolve({ ...fundData, id: newId });
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  },
  
  /**
   * 既存の投資資金記録を更新します
   * @param params 更新対象のID、更新データ
   * @returns 更新された投資資金記録
   */
  async update(params: { where: { id: number }, data: Partial<InvestmentFund> }): Promise<InvestmentFund> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['investmentFunds'], 'readwrite');
      const store = transaction.objectStore('investmentFunds');
      const getRequest = store.get(params.where.id);
      
      getRequest.onsuccess = () => {
        const existingData = getRequest.result;
        if (!existingData) {
          reject(new Error('投資資金記録が見つかりません'));
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
   * 投資資金記録を削除します
   * @param params 削除対象のID
   */
  async delete(params: { where: { id: number } }): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['investmentFunds'], 'readwrite');
      const store = transaction.objectStore('investmentFunds');
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
   * 投資資金の合計を計算します
   * @param options フィルタリングオプション（ポートフォリオIDなど）
   * @returns 投資資金の合計金額
   */
  async getTotalFunds(options?: { where?: { portfolioId?: number } }): Promise<number> {
    const funds = await this.findMany(options);
    return funds.reduce((total, fund) => {
      if (fund.type === 'deposit') {
        return total + fund.amount;
      } else {
        return total - fund.amount;
      }
    }, 0);
  }
}; 