/**
 * データベースモジュールの単体テスト
 */

import { db, dataManagement } from '../index';
import { DbError } from '../utils/errors';

// テスト用のデータ
const testPortfolio = {
  name: 'テストポートフォリオ',
  description: 'テスト用のポートフォリオ',
  isDefault: false
};

const testStock = {
  symbol: 'TEST',
  name: 'テスト銘柄',
  country: '日本' as const,
  assetType: 'stock' as const
};

// モックの設定
jest.mock('../connection', () => {
  // IDBオブジェクトのモック
  const mockIDBObjectStore = {
    add: jest.fn().mockImplementation(() => ({
      onsuccess: null,
      onerror: null,
      result: 1
    })),
    put: jest.fn().mockImplementation(() => ({
      onsuccess: null,
      onerror: null
    })),
    delete: jest.fn().mockImplementation(() => ({
      onsuccess: null,
      onerror: null
    })),
    get: jest.fn().mockImplementation(() => ({
      onsuccess: null,
      onerror: null,
      result: { id: 1, ...testStock, createdAt: new Date(), updatedAt: new Date() }
    })),
    getAll: jest.fn().mockImplementation(() => ({
      onsuccess: null,
      onerror: null,
      result: [{ id: 1, ...testStock, createdAt: new Date(), updatedAt: new Date() }]
    })),
    clear: jest.fn().mockImplementation(() => ({
      onsuccess: null,
      onerror: null
    })),
    index: jest.fn().mockImplementation(() => ({
      getAll: jest.fn().mockImplementation(() => ({
        onsuccess: null,
        onerror: null,
        result: [{ id: 1, ...testStock, createdAt: new Date(), updatedAt: new Date() }]
      }))
    })),
    indexNames: {
      contains: jest.fn().mockReturnValue(true)
    }
  };

  // IDBトランザクションのモック
  const mockIDBTransaction = {
    objectStore: jest.fn().mockImplementation(() => mockIDBObjectStore),
    oncomplete: null,
    onerror: null,
    onabort: null
  };

  // IDBデータベースのモック
  const mockIDBDatabase = {
    transaction: jest.fn().mockImplementation(() => mockIDBTransaction),
    close: jest.fn()
  };

  return {
    openDB: jest.fn().mockResolvedValue(mockIDBDatabase),
    withTransaction: jest.fn().mockImplementation((_, __, callback) => callback(mockIDBTransaction)),
    requestToPromise: jest.fn().mockImplementation((request) => {
      if (request.onsuccess) request.onsuccess();
      return Promise.resolve(request.result);
    }),
    transactionToPromise: jest.fn().mockResolvedValue(undefined)
  };
});

describe('データベースモジュール', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ポートフォリオリポジトリ', () => {
    it('ポートフォリオを作成できること', async () => {
      const result = await db.portfolios.create({ data: testPortfolio });
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(testPortfolio.name);
    });

    it('ポートフォリオを取得できること', async () => {
      const portfolio = await db.portfolios.findUnique({ where: { id: 1 } });
      expect(portfolio).not.toBeNull();
    });
  });

  describe('株式リポジトリ', () => {
    it('株式を作成できること', async () => {
      const result = await db.stocks.create({ data: testStock });
      expect(result).toHaveProperty('id');
      expect(result.symbol).toBe(testStock.symbol);
    });

    it('株式を取得できること', async () => {
      const stock = await db.stocks.findUnique({ where: { id: 1 } });
      expect(stock).not.toBeNull();
    });
  });

  describe('データ管理機能', () => {
    it('データをエクスポートできること', async () => {
      const data = await dataManagement.exportData();
      expect(data).toHaveProperty('portfolios');
      expect(data).toHaveProperty('stocks');
      expect(data).toHaveProperty('version');
    });

    it('データをインポートできること', async () => {
      const testData = {
        portfolios: [],
        stocks: [],
        purchases: [],
        dividends: [],
        investmentFunds: [],
        version: '1.0',
        exportDate: new Date().toISOString()
      };
      
      await expect(dataManagement.importData(testData)).resolves.not.toThrow();
    });
  });

  describe('エラー処理', () => {
    it('DBエラーを適切に処理できること', () => {
      const error = new DbError('テストエラー');
      expect(error.name).toBe('DbError');
      expect(error.message).toBe('テストエラー');
    });
  });
}); 