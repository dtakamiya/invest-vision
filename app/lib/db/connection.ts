// データベース接続管理

import { DB_NAME, DB_VERSION } from './types';
import { ConnectionError } from './utils/errors';

/**
 * IDBRequest を Promise にラップするヘルパー関数
 */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * トランザクション完了を Promise にラップするヘルパー関数
 */
export function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error('トランザクションが中断されました'));
  });
}

/**
 * データベースのマイグレーション関数
 */
function handleMigrations(db: IDBDatabase, oldVersion: number, transaction?: IDBTransaction | null): void {
  console.log(`データベースをバージョン ${oldVersion} から ${DB_VERSION} に更新しています...`);

  // Stocks テーブル
  if (!db.objectStoreNames.contains('stocks')) {
    const stockStore = db.createObjectStore('stocks', { keyPath: 'id', autoIncrement: true });
    stockStore.createIndex('symbol', 'symbol', { unique: true });
    stockStore.createIndex('name', 'name', { unique: false });
    stockStore.createIndex('country', 'country', { unique: false });
    stockStore.createIndex('assetType', 'assetType', { unique: false });
  } else if (oldVersion < 3 && transaction) {
    // バージョン3への更新：country フィールドのインデックスを追加
    const stockStore = transaction.objectStore('stocks');
    if (!stockStore.indexNames.contains('country')) {
      stockStore.createIndex('country', 'country', { unique: false });
    }
  }
  
  // Purchase オブジェクトストア
  if (!db.objectStoreNames.contains('purchases')) {
    const purchaseStore = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
    purchaseStore.createIndex('stockId', 'stockId', { unique: false });
    purchaseStore.createIndex('purchaseDate', 'purchaseDate', { unique: false });
    purchaseStore.createIndex('portfolioId', 'portfolioId', { unique: false });
  }
  
  // Dividend オブジェクトストア
  if (!db.objectStoreNames.contains('dividends')) {
    const dividendStore = db.createObjectStore('dividends', { keyPath: 'id', autoIncrement: true });
    dividendStore.createIndex('stockId', 'stockId', { unique: false });
    dividendStore.createIndex('receivedDate', 'receivedDate', { unique: false });
    dividendStore.createIndex('portfolioId', 'portfolioId', { unique: false });
  }
  
  // InvestmentFund オブジェクトストア
  if (!db.objectStoreNames.contains('investmentFunds')) {
    const fundStore = db.createObjectStore('investmentFunds', { keyPath: 'id', autoIncrement: true });
    fundStore.createIndex('date', 'date', { unique: false });
    fundStore.createIndex('type', 'type', { unique: false });
    fundStore.createIndex('portfolioId', 'portfolioId', { unique: false });
  }
  
  // Portfolio オブジェクトストア
  if (!db.objectStoreNames.contains('portfolios')) {
    const portfolioStore = db.createObjectStore('portfolios', { keyPath: 'id', autoIncrement: true });
    portfolioStore.createIndex('name', 'name', { unique: false });
    portfolioStore.createIndex('isDefault', 'isDefault', { unique: false });
    portfolioStore.createIndex('description', 'description', { unique: false });
  }
  
  // StockPrices オブジェクトストア
  if (!db.objectStoreNames.contains('stockPrices')) {
    const stockPricesStore = db.createObjectStore('stockPrices', { keyPath: 'id', autoIncrement: true });
    stockPricesStore.createIndex('stockId', 'stockId', { unique: false });
    stockPricesStore.createIndex('symbol', 'symbol', { unique: false });
    stockPricesStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
  }
  
  // ExchangeRates オブジェクトストア
  if (!db.objectStoreNames.contains('exchangeRates')) {
    const exchangeRatesStore = db.createObjectStore('exchangeRates', { keyPath: 'id', autoIncrement: true });
    exchangeRatesStore.createIndex('fromCurrency', 'fromCurrency', { unique: false });
    exchangeRatesStore.createIndex('toCurrency', 'toCurrency', { unique: false });
    exchangeRatesStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
    exchangeRatesStore.createIndex('currencyPair', ['fromCurrency', 'toCurrency'], { unique: true });
  }
}

/**
 * データベース接続を開く
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new ConnectionError('IndexedDBはこの環境ではサポートされていません'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('データベースの接続に失敗しました:', event);
      reject(new ConnectionError('データベースの接続に失敗しました'));
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      const transaction = request.transaction;
      handleMigrations(db, oldVersion, transaction);
    };
  });
}

/**
 * トランザクションを使用して操作を実行する
 */
export async function withTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  callback: (transaction: IDBTransaction) => Promise<T>
): Promise<T> {
  const db = await openDB();
  try {
    const transaction = db.transaction(storeNames, mode);
    const result = await callback(transaction);
    await transactionToPromise(transaction);
    return result;
  } finally {
    db.close();
  }
} 