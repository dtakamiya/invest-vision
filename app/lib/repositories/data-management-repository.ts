import { openDB } from '../db-connection';
import { ExportData } from '../types';
import { dbHelper } from '../db';

/**
 * データ管理リポジトリ
 * データのエクスポートとインポートを提供します
 */
export const dataManagementRepository = {
  /**
   * 全データをエクスポートします
   * @returns エクスポートされたデータ
   */
  async exportData(): Promise<ExportData> {
    const db = await openDB();
    
    try {
      const portfolios = await dbHelper.portfolios.findMany();
      const stocks = await dbHelper.stocks.findMany();
      const purchases = await dbHelper.purchases.findMany();
      const dividends = await dbHelper.dividends.findMany();
      const funds = await dbHelper.investmentFunds.findMany();

      return {
        portfolios,
        stocks,
        purchases,
        dividends,
        investmentFunds: funds,
        version: '1.0',
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('データのエクスポート中にエラーが発生しました:', error);
      throw new Error('データのエクスポートに失敗しました');
    } finally {
      db.close();
    }
  },

  /**
   * データをインポートします
   * @param data インポートするデータ
   */
  async importData(data: ExportData): Promise<void> {
    // データの検証
    if (!this._validateImportData(data)) {
      throw new Error('無効なデータ形式です');
    }

    const db = await openDB();
    
    try {
      // 日付データを復元
      const processedData = this._processImportData(data);

      // トランザクションを開始
      const transaction = db.transaction(['portfolios', 'stocks', 'purchases', 'dividends', 'investmentFunds'], 'readwrite');
      
      // トランザクションの完了を監視するPromiseを作成
      const transactionComplete = new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('トランザクションが中断されました'));
      });
      
      try {
        // 既存のデータを削除
        await Promise.all([
          transaction.objectStore('portfolios').clear(),
          transaction.objectStore('stocks').clear(),
          transaction.objectStore('purchases').clear(),
          transaction.objectStore('dividends').clear(),
          transaction.objectStore('investmentFunds').clear()
        ]);
        
        // 新しいデータを追加
        await Promise.all([
          ...processedData.portfolios.map(portfolio => 
            transaction.objectStore('portfolios').add(portfolio)
          ),
          ...processedData.stocks.map(stock => 
            transaction.objectStore('stocks').add(stock)
          ),
          ...processedData.purchases.map(purchase => 
            transaction.objectStore('purchases').add(purchase)
          ),
          ...processedData.dividends.map(dividend => 
            transaction.objectStore('dividends').add(dividend)
          ),
          ...processedData.investmentFunds.map(fund => 
            transaction.objectStore('investmentFunds').add(fund)
          )
        ]);
        
        // トランザクションの完了を待機
        await transactionComplete;
      } catch (error) {
        // トランザクションをアボート
        transaction.abort();
        throw error;
      }
    } catch (error) {
      console.error('データのインポート中にエラーが発生しました:', error);
      throw new Error(
        error instanceof Error 
          ? `データのインポートに失敗しました: ${error.message}`
          : 'データのインポートに失敗しました'
      );
    } finally {
      db.close();
    }
  },

  /**
   * インポートデータの検証
   * @param data 検証するデータ
   * @returns 検証結果
   */
  _validateImportData(data: any): data is ExportData {
    if (!data || typeof data !== 'object') return false;

    // 必須フィールドの存在チェック
    const requiredFields = ['portfolios', 'stocks', 'purchases', 'dividends', 'investmentFunds', 'version', 'exportDate'];
    if (!requiredFields.every(field => field in data)) return false;

    // バージョンチェック
    if (data.version !== '1.0') {
      throw new Error(`未対応のデータバージョンです: ${data.version}`);
    }

    // 配列チェック
    if (!Array.isArray(data.portfolios) || !Array.isArray(data.stocks) || !Array.isArray(data.purchases) ||
        !Array.isArray(data.dividends) || !Array.isArray(data.investmentFunds)) {
      return false;
    }

    return true;
  },

  /**
   * インポートデータの日付処理
   * @param data 処理するデータ
   * @returns 処理されたデータ
   */
  _processImportData(data: ExportData): ExportData {
    return {
      ...data,
      portfolios: data.portfolios.map(portfolio => ({
        ...portfolio,
        createdAt: portfolio.createdAt ? new Date(portfolio.createdAt) : undefined,
        updatedAt: portfolio.updatedAt ? new Date(portfolio.updatedAt) : undefined
      })),
      stocks: data.stocks.map(stock => ({
        ...stock,
        initialPurchaseDate: stock.initialPurchaseDate ? new Date(stock.initialPurchaseDate) : undefined,
        createdAt: stock.createdAt ? new Date(stock.createdAt) : undefined,
        updatedAt: stock.updatedAt ? new Date(stock.updatedAt) : undefined
      })),
      purchases: data.purchases.map(purchase => ({
        ...purchase,
        purchaseDate: new Date(purchase.purchaseDate),
        createdAt: purchase.createdAt ? new Date(purchase.createdAt) : undefined,
        updatedAt: purchase.updatedAt ? new Date(purchase.updatedAt) : undefined
      })),
      dividends: data.dividends.map(dividend => ({
        ...dividend,
        receivedDate: new Date(dividend.receivedDate),
        createdAt: dividend.createdAt ? new Date(dividend.createdAt) : undefined,
        updatedAt: dividend.updatedAt ? new Date(dividend.updatedAt) : undefined
      })),
      investmentFunds: data.investmentFunds.map(fund => ({
        ...fund,
        date: new Date(fund.date),
        createdAt: fund.createdAt ? new Date(fund.createdAt) : undefined,
        updatedAt: fund.updatedAt ? new Date(fund.updatedAt) : undefined
      }))
    };
  }
}; 