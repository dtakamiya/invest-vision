// IndexedDBのデータベース名とバージョン
const DB_NAME = 'investVisionDB';
const DB_VERSION = 1;

// モデルの型定義
export interface Stock {
  id?: number;
  symbol: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  id?: number;
  stockId: number;
  quantity: number;
  price: number;
  fee: number;
  purchaseDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dividend {
  id?: number;
  stockId: number;
  amount: number;
  receivedDate: Date;
  taxAmount?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// データベース接続を開く
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // データベースの初期化またはアップグレード時に実行
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 株式テーブルの作成
      if (!db.objectStoreNames.contains('stocks')) {
        const stockStore = db.createObjectStore('stocks', { keyPath: 'id', autoIncrement: true });
        stockStore.createIndex('symbol', 'symbol', { unique: true });
        stockStore.createIndex('name', 'name', { unique: false });
      }

      // 購入記録テーブルの作成
      if (!db.objectStoreNames.contains('purchases')) {
        const purchaseStore = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
        purchaseStore.createIndex('stockId', 'stockId', { unique: false });
        purchaseStore.createIndex('purchaseDate', 'purchaseDate', { unique: false });
      }

      // 配当金記録テーブルの作成
      if (!db.objectStoreNames.contains('dividends')) {
        const dividendStore = db.createObjectStore('dividends', { keyPath: 'id', autoIncrement: true });
        dividendStore.createIndex('stockId', 'stockId', { unique: false });
        dividendStore.createIndex('receivedDate', 'receivedDate', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// 株式関連の操作
export const stockDB = {
  // 全ての株式を取得
  getAll: async (): Promise<Stock[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['stocks'], 'readonly');
      const store = transaction.objectStore('stocks');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 特定の株式を取得
  getById: async (id: number): Promise<Stock | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['stocks'], 'readonly');
      const store = transaction.objectStore('stocks');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 株式を追加
  add: async (stock: Omit<Stock, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['stocks'], 'readwrite');
      const store = transaction.objectStore('stocks');
      const now = new Date();
      const request = store.add({
        ...stock,
        createdAt: now,
        updatedAt: now,
      });

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 株式を更新
  update: async (stock: Stock): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['stocks'], 'readwrite');
      const store = transaction.objectStore('stocks');
      const request = store.put({
        ...stock,
        updatedAt: new Date(),
      });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 株式を削除
  delete: async (id: number): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['stocks'], 'readwrite');
      const store = transaction.objectStore('stocks');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },
};

// 購入記録関連の操作
export const purchaseDB = {
  // 全ての購入記録を取得
  getAll: async (): Promise<Purchase[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['purchases'], 'readonly');
      const store = transaction.objectStore('purchases');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 特定の株式の購入記録を取得
  getByStockId: async (stockId: number): Promise<Purchase[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['purchases'], 'readonly');
      const store = transaction.objectStore('purchases');
      const index = store.index('stockId');
      const request = index.getAll(IDBKeyRange.only(stockId));

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 購入記録を追加
  add: async (purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['purchases'], 'readwrite');
      const store = transaction.objectStore('purchases');
      const now = new Date();
      const request = store.add({
        ...purchase,
        createdAt: now,
        updatedAt: now,
      });

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 購入記録を更新
  update: async (purchase: Purchase): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['purchases'], 'readwrite');
      const store = transaction.objectStore('purchases');
      const request = store.put({
        ...purchase,
        updatedAt: new Date(),
      });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 購入記録を削除
  delete: async (id: number): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['purchases'], 'readwrite');
      const store = transaction.objectStore('purchases');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },
};

// 配当金記録関連の操作
export const dividendDB = {
  // 全ての配当金記録を取得
  getAll: async (): Promise<Dividend[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dividends'], 'readonly');
      const store = transaction.objectStore('dividends');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 特定の株式の配当金記録を取得
  getByStockId: async (stockId: number): Promise<Dividend[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dividends'], 'readonly');
      const store = transaction.objectStore('dividends');
      const index = store.index('stockId');
      const request = index.getAll(IDBKeyRange.only(stockId));

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 配当金記録を追加
  add: async (dividend: Omit<Dividend, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dividends'], 'readwrite');
      const store = transaction.objectStore('dividends');
      const now = new Date();
      const request = store.add({
        ...dividend,
        createdAt: now,
        updatedAt: now,
      });

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 配当金記録を更新
  update: async (dividend: Dividend): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dividends'], 'readwrite');
      const store = transaction.objectStore('dividends');
      const request = store.put({
        ...dividend,
        updatedAt: new Date(),
      });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  // 配当金記録を削除
  delete: async (id: number): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['dividends'], 'readwrite');
      const store = transaction.objectStore('dividends');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },
}; 