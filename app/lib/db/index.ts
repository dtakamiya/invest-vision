// データベースモジュールのメインエントリポイント

// 型のエクスポート
export * from './types';

// 接続管理のエクスポート
export { openDB } from './connection';

// リポジトリの作成関数のインポート
import { createPortfolioRepository } from './repositories/portfolio';
import { createStockRepository } from './repositories/stock';
import { createPurchaseRepository } from './repositories/purchase';
import { createDividendRepository } from './repositories/dividend';
import { createInvestmentFundRepository } from './repositories/investmentFund';
import { createStockPriceRepository } from './repositories/stockPrice';
import { createExchangeRateRepository } from './repositories/exchangeRate';

// データ管理機能のインポート
import { exportData, importData } from './utils/dataManagement';

// エラー関連のエクスポート
export * from './utils/errors';

// DbHelperインスタンスの作成
export const db = {
  portfolios: createPortfolioRepository(),
  stocks: createStockRepository(),
  purchases: createPurchaseRepository(),
  dividends: createDividendRepository(),
  investmentFunds: createInvestmentFundRepository(),
  stockPrices: createStockPriceRepository(),
  exchangeRates: createExchangeRateRepository()
};

// データ管理機能のエクスポート
export const dataManagement = {
  exportData,
  importData
};

// レガシー互換のため、dbHelperも同じインスタンスをエクスポート
export const dbHelper = db; 