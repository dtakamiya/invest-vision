// データのエクスポート・インポート機能

import { ExportData, Portfolio, Stock, Purchase, Dividend, InvestmentFund } from '../types';
import { openDB, withTransaction } from '../connection';
import { DataManagementError, TransactionError } from './errors';

/**
 * データベース全体のデータをエクスポート
 */
export async function exportData(): Promise<ExportData> {
  try {
    const db = await openDB();
    
    try {
      // 各ストアのデータを取得
      const portfolios = await withTransaction('portfolios', 'readonly', async (tx) => {
        const store = tx.objectStore('portfolios');
        return await new Promise<Portfolio[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
      
      const stocks = await withTransaction('stocks', 'readonly', async (tx) => {
        const store = tx.objectStore('stocks');
        return await new Promise<Stock[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
      
      const purchases = await withTransaction('purchases', 'readonly', async (tx) => {
        const store = tx.objectStore('purchases');
        return await new Promise<Purchase[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
      
      const dividends = await withTransaction('dividends', 'readonly', async (tx) => {
        const store = tx.objectStore('dividends');
        return await new Promise<Dividend[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
      
      const investmentFunds = await withTransaction('investmentFunds', 'readonly', async (tx) => {
        const store = tx.objectStore('investmentFunds');
        return await new Promise<InvestmentFund[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });

      return {
        portfolios,
        stocks,
        purchases,
        dividends,
        investmentFunds,
        version: '1.0',
        exportDate: new Date().toISOString()
      };
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('データのエクスポート中にエラーが発生しました:', error);
    throw new DataManagementError('データのエクスポートに失敗しました', error);
  }
}

/**
 * インポートデータの検証
 */
function validateImportData(data: any): data is ExportData {
  if (!data || typeof data !== 'object') return false;

  // 必須フィールドの存在チェック
  const requiredFields = ['portfolios', 'stocks', 'purchases', 'dividends', 'investmentFunds', 'version', 'exportDate'];
  if (!requiredFields.every(field => field in data)) return false;

  // バージョンチェック
  if (data.version !== '1.0') {
    throw new DataManagementError(`未対応のデータバージョンです: ${data.version}`);
  }

  // 配列チェック
  if (!Array.isArray(data.portfolios) || !Array.isArray(data.stocks) || !Array.isArray(data.purchases) ||
      !Array.isArray(data.dividends) || !Array.isArray(data.investmentFunds)) {
    return false;
  }

  return true;
}

/**
 * インポートデータの日付処理
 */
function processImportData(data: ExportData): ExportData {
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

/**
 * データをインポート
 */
export async function importData(data: ExportData): Promise<void> {
  // データの検証
  if (!validateImportData(data)) {
    throw new DataManagementError('無効なデータ形式です');
  }

  const db = await openDB();
  
  try {
    // 日付データを復元
    const processedData = processImportData(data);

    // トランザクションを開始
    const transaction = db.transaction(
      ['portfolios', 'stocks', 'purchases', 'dividends', 'investmentFunds'],
      'readwrite'
    );
    
    // トランザクションの完了を監視するPromiseを作成
    const transactionComplete = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new TransactionError('トランザクションが中断されました'));
    });
    
    try {
      // 既存のデータを削除
      await Promise.all([
        clearStore(transaction, 'portfolios'),
        clearStore(transaction, 'stocks'),
        clearStore(transaction, 'purchases'),
        clearStore(transaction, 'dividends'),
        clearStore(transaction, 'investmentFunds')
      ]);
      
      // 新しいデータを追加
      await Promise.all([
        ...processedData.portfolios.map(portfolio => 
          addItem(transaction, 'portfolios', portfolio)
        ),
        ...processedData.stocks.map(stock => 
          addItem(transaction, 'stocks', stock)
        ),
        ...processedData.purchases.map(purchase => 
          addItem(transaction, 'purchases', purchase)
        ),
        ...processedData.dividends.map(dividend => 
          addItem(transaction, 'dividends', dividend)
        ),
        ...processedData.investmentFunds.map(fund => 
          addItem(transaction, 'investmentFunds', fund)
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
    throw new DataManagementError(
      error instanceof Error 
        ? `データのインポートに失敗しました: ${error.message}`
        : 'データのインポートに失敗しました',
      error
    );
  } finally {
    db.close();
  }
}

/**
 * オブジェクトストアをクリア
 */
function clearStore(transaction: IDBTransaction, storeName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * オブジェクトストアにアイテムを追加
 */
function addItem(transaction: IDBTransaction, storeName: string, item: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const store = transaction.objectStore(storeName);
    const request = store.add(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
} 