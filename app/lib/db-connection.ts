// データベース接続を管理するユーティリティ

// データベース名とバージョン
const DB_NAME = 'investVisionDB';
const DB_VERSION = 8;

/**
 * データベース接続を開く
 * @returns Promise<IDBDatabase> データベース接続
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject('IndexedDBはこの環境ではサポートされていません');
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject('データベース接続エラー: ' + (event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      if (!db.objectStoreNames.contains('stocks')) {
        const stockStore = db.createObjectStore('stocks', { keyPath: 'id', autoIncrement: true });
        stockStore.createIndex('symbol', 'symbol', { unique: true });
        stockStore.createIndex('name', 'name', { unique: false });
        stockStore.createIndex('country', 'country', { unique: false });
        stockStore.createIndex('assetType', 'assetType', { unique: false });
      } else if (oldVersion < 3) {
        // バージョン3への更新：country フィールドのインデックスを追加
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction) {
          const stockStore = transaction.objectStore('stocks');
          if (!stockStore.indexNames.contains('country')) {
            stockStore.createIndex('country', 'country', { unique: false });
          }
        }
      }
      
      // Purchase オブジェクトストアの作成
      if (!db.objectStoreNames.contains('purchases')) {
        const purchaseStore = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
        purchaseStore.createIndex('stockId', 'stockId', { unique: false });
        purchaseStore.createIndex('purchaseDate', 'purchaseDate', { unique: false });
      }
      
      // Dividend オブジェクトストアの作成
      if (!db.objectStoreNames.contains('dividends')) {
        const dividendStore = db.createObjectStore('dividends', { keyPath: 'id', autoIncrement: true });
        dividendStore.createIndex('stockId', 'stockId', { unique: false });
        dividendStore.createIndex('receivedDate', 'receivedDate', { unique: false });
      }
      
      // InvestmentFund オブジェクトストアの作成
      if (!db.objectStoreNames.contains('investmentFunds')) {
        const fundStore = db.createObjectStore('investmentFunds', { keyPath: 'id', autoIncrement: true });
        fundStore.createIndex('date', 'date', { unique: false });
        fundStore.createIndex('type', 'type', { unique: false });
      }
      
      // バージョン4への更新：ポートフォリオ関連の更新
      if (oldVersion < 4) {
        // Portfolio オブジェクトストアの作成
        if (!db.objectStoreNames.contains('portfolios')) {
          const portfolioStore = db.createObjectStore('portfolios', { keyPath: 'id', autoIncrement: true });
          portfolioStore.createIndex('name', 'name', { unique: false });
          portfolioStore.createIndex('isDefault', 'isDefault', { unique: false });
        }
        
        // 既存のストアにportfolioIdフィールドのインデックスを追加
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction) {
          // Stocks テーブルに portfolioId インデックスを追加
          if (db.objectStoreNames.contains('stocks')) {
            const stockStore = transaction.objectStore('stocks');
            if (!stockStore.indexNames.contains('portfolioId')) {
              stockStore.createIndex('portfolioId', 'portfolioId', { unique: false });
            }
          }
          
          // Purchases テーブルに portfolioId インデックスを追加
          if (db.objectStoreNames.contains('purchases')) {
            const purchaseStore = transaction.objectStore('purchases');
            if (!purchaseStore.indexNames.contains('portfolioId')) {
              purchaseStore.createIndex('portfolioId', 'portfolioId', { unique: false });
            }
          }
          
          // Dividends テーブルに portfolioId インデックスを追加
          if (db.objectStoreNames.contains('dividends')) {
            const dividendStore = transaction.objectStore('dividends');
            if (!dividendStore.indexNames.contains('portfolioId')) {
              dividendStore.createIndex('portfolioId', 'portfolioId', { unique: false });
            }
          }
          
          // InvestmentFunds テーブルに portfolioId インデックスを追加
          if (db.objectStoreNames.contains('investmentFunds')) {
            const fundStore = transaction.objectStore('investmentFunds');
            if (!fundStore.indexNames.contains('portfolioId')) {
              fundStore.createIndex('portfolioId', 'portfolioId', { unique: false });
            }
          }
        }
      }
      
      // バージョン5への更新：ポートフォリオ関連の更新
      if (oldVersion < 5) {
        // ポートフォリオテーブルの作成
        if (!db.objectStoreNames.contains('portfolios')) {
          const portfolioStore = db.createObjectStore('portfolios', { keyPath: 'id', autoIncrement: true });
          portfolioStore.createIndex('name', 'name', { unique: false });
          portfolioStore.createIndex('description', 'description', { unique: false });
        }
      }
      
      // バージョン6への更新：銘柄テーブルからportfolioIdを削除
      if (oldVersion < 6) {
        // 既存のデータを取得して、portfolioIdを除いた形で再保存する
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction && db.objectStoreNames.contains('stocks')) {
          const stockStore = transaction.objectStore('stocks');
          
          // portfolioIdインデックスが存在する場合は削除
          if (stockStore.indexNames.contains('portfolioId')) {
            stockStore.deleteIndex('portfolioId');
          }
          
          // 既存のデータを取得
          const getAllRequest = stockStore.getAll();
          getAllRequest.onsuccess = () => {
            const stocks = getAllRequest.result;
            
            // 一度テーブルをクリア
            const clearRequest = stockStore.clear();
            clearRequest.onsuccess = () => {
              // portfolioIdを除いたデータを再保存
              stocks.forEach(stock => {
                const { portfolioId, ...newStock } = stock;
                stockStore.add(newStock);
              });
            };
          };
        }
      }

      // バージョン7への更新：assetType フィールドのインデックスを追加
      if (oldVersion < 7) {
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction) {
          // Stocks テーブルに assetType インデックスを追加
          if (db.objectStoreNames.contains('stocks')) {
            const stockStore = transaction.objectStore('stocks');
            if (!stockStore.indexNames.contains('assetType')) {
              stockStore.createIndex('assetType', 'assetType', { unique: false });
            }
          }
        }
      }

      // バージョン8への更新：インポート処理の修正対応
      if (oldVersion < 8) {
        console.log('データベースをバージョン8に更新しています...');
        // ここでは構造的な変更はなく、アプリケーションコードの修正に対応するためのバージョンアップ
      }
    };
  });
} 