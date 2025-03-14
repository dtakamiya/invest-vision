// データベース接続とリポジトリのエントリーポイント

// 型定義のエクスポート
export * from './types';

// データベース接続のエクスポート
export { openDB } from './db-connection';

// リポジトリのインポートとエクスポート
import { portfolioRepository } from './repositories/portfolio-repository';
import { stockRepository } from './repositories/stock-repository';
import { purchaseRepository } from './repositories/purchase-repository';
import { dividendRepository } from './repositories/dividend-repository';
import { investmentFundRepository } from './repositories/investment-fund-repository';
import { dataManagementRepository } from './repositories/data-management-repository';

// データベースヘルパーの作成
import { DbHelper } from './types';

// データベース操作のヘルパー関数
export const dbHelper: DbHelper = {
  portfolios: portfolioRepository,
  stocks: stockRepository,
  purchases: purchaseRepository,
  dividends: dividendRepository,
  investmentFunds: investmentFundRepository,
};

// データのエクスポート・インポート機能
// 後でdata-management.tsに移動予定
export const dataManagement = dataManagementRepository; 