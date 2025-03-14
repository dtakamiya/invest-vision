// IndexedDBのデータベース接続を管理するユーティリティ

// データベースの型定義
export type Country = '日本' | '米国';

export interface Portfolio {
  id?: number;
  name: string;
  description?: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Stock {
  id?: number;
  symbol: string;
  name: string;
  country: Country;  // 投資国（日本/米国）
  assetType: 'stock' | 'fund';  // 資産タイプ（株式/投資信託）
  initialPurchaseDate?: Date;  // 初期購入日
  initialQuantity?: number;    // 初期購入数
  initialPrice?: number;       // 初期購入単価
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StockInput {
  symbol: string;
  name: string;
  country: Country;
  assetType?: 'stock' | 'fund';  // 資産タイプ（株式/投資信託）、省略時は'stock'
  initialPurchaseDate?: Date;
  initialQuantity?: number;
  initialPrice?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Purchase {
  id?: number;
  stockId: number;
  portfolioId?: number;  // ポートフォリオID
  quantity: number;
  price: number;
  fee: number;
  purchaseDate: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Dividend {
  id?: number;
  stockId: number;
  portfolioId?: number;  // ポートフォリオID
  amount: number;
  receivedDate: Date;
  taxAmount?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InvestmentFund {
  id?: number;
  portfolioId?: number;  // ポートフォリオID
  amount: number;
  description?: string;
  date: Date;
  type: 'deposit' | 'withdrawal';
  createdAt?: Date;
  updatedAt?: Date;
}

// データベースヘルパーの型定義
export interface DbOperations<T> {
  findMany(options?: { 
    where?: { [key: string]: any },
    orderBy?: { [key: string]: 'asc' | 'desc' },
    include?: { [key: string]: boolean }
  }): Promise<T[]>;
  findUnique(params: { where: { id: number } }): Promise<T | null>;
  update(params: { where: { id: number }, data: Partial<T> }): Promise<T>;
  create(params: { data: T }): Promise<T>;
  delete(params: { where: { id: number } }): Promise<void>;
}

export interface InvestmentFundOperations extends DbOperations<InvestmentFund> {
  getTotalFunds(options?: { where?: { portfolioId?: number } }): Promise<number>;
}

// データベースヘルパーの型定義
export interface DbHelper {
  portfolios: DbOperations<Portfolio>;
  stocks: DbOperations<Stock>;
  purchases: DbOperations<Purchase>;
  dividends: DbOperations<Dividend>;
  investmentFunds: InvestmentFundOperations;
}

// データのエクスポート・インポート用の型定義
export interface ExportData {
  portfolios: Portfolio[];
  stocks: Stock[];
  purchases: Purchase[];
  dividends: Dividend[];
  investmentFunds: InvestmentFund[];
  version: string;
  exportDate: string;
}

// データベース名とバージョン
const DB_NAME = 'investVisionDB';
const DB_VERSION = 7;  // バージョンを7に更新

// データベース接続を開く
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
    };
  });
}

// データベース操作のヘルパー関数
export const dbHelper: DbHelper = {
  portfolios: {
    async findMany(options: {
      where?: { isDefault?: boolean },
      orderBy?: { [key: string]: 'asc' | 'desc' },
      include?: { [key: string]: boolean }
    } = {}) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
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

    async findUnique(params) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
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

    async update(params) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
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

    async create(params) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
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

    async delete(params) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
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
  },
  
  stocks: {
    async findMany(options: {
      where?: { symbol?: string, country?: Country },
      orderBy?: { [key: string]: 'asc' | 'desc' },
      include?: { [key: string]: boolean }
    } = {}) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
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

    async findUnique(params) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
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

    async update(params) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
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

    async create(params) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
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

    async delete(params) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
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
  },
  
  purchases: {
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
  },
  
  dividends: {
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
  },
  
  investmentFunds: {
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
  }
};

// データのエクスポート・インポート機能
export const dataManagement = {
  // 全データをエクスポート
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

  // データをインポート
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
      const transaction = db.transaction(['stocks', 'purchases', 'dividends', 'investmentFunds'], 'readwrite');
      
      // トランザクションの完了を監視するPromiseを作成
      const transactionComplete = new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('トランザクションが中断されました'));
      });
      
      try {
        // 既存のデータを削除
        await Promise.all([
          transaction.objectStore('stocks').clear(),
          transaction.objectStore('purchases').clear(),
          transaction.objectStore('dividends').clear(),
          transaction.objectStore('investmentFunds').clear()
        ]);
        
        // 新しいデータを追加
        await Promise.all([
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

  // インポートデータの検証
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

  // インポートデータの日付処理
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