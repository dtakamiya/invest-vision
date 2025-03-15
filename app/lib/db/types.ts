// データベースの型定義

// 基本エンティティの型定義
export interface BaseEntity {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// データベース名とバージョン
export const DB_NAME = 'investVisionDB';
export const DB_VERSION = 10;

// データベースの型定義
export type Country = '日本' | '米国';
export type AssetType = 'stock' | 'fund';

export interface Portfolio extends BaseEntity {
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface Stock extends BaseEntity {
  symbol: string;
  name: string;
  country: Country;  // 投資国（日本/米国）
  assetType: AssetType;  // 資産タイプ（株式/投資信託）
  initialPurchaseDate?: Date;  // 初期購入日
  initialQuantity?: number;    // 初期購入数
  initialPrice?: number;       // 初期購入単価
}

export interface StockInput {
  symbol: string;
  name: string;
  country: Country;
  assetType?: 'stock' | 'fund';  // 資産タイプ（株式/投資信託）、省略時は'stock'
  initialPurchaseDate?: Date;
  initialQuantity?: number;
  initialPrice?: number;
}

export interface Purchase extends BaseEntity {
  stockId: number;
  portfolioId?: number;  // ポートフォリオID
  quantity: number;
  price: number;
  fee: number;
  purchaseDate: Date;
  notes?: string;
}

export interface Dividend extends BaseEntity {
  stockId: number;
  portfolioId?: number;  // ポートフォリオID
  amount: number;
  receivedDate: Date;
  taxAmount?: number;
  notes?: string;
}

export interface InvestmentFund extends BaseEntity {
  portfolioId?: number;  // ポートフォリオID
  amount: number;
  description?: string;
  date: Date;
  type: 'deposit' | 'withdrawal';
}

// 株価情報
export interface StockPriceData extends BaseEntity {
  stockId: number;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: Date;
}

// 為替レート情報
export interface ExchangeRateData extends BaseEntity {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: Date;
}

// クエリオプションの型定義
export interface QueryOptions<T> {
  where?: { [key: string]: any };
  orderBy?: { [key: string]: 'asc' | 'desc' };
  include?: { [key: string]: boolean };
}

// データベースヘルパーの型定義
export interface DbOperations<T> {
  findMany(options?: QueryOptions<T>): Promise<T[]>;
  findUnique(params: { where: { id: number } }): Promise<T | null>;
  update(params: { where: { id: number }, data: Partial<T> }): Promise<T>;
  create(params: { data: T }): Promise<T>;
  delete(params: { where: { id: number } }): Promise<void>;
}

export interface InvestmentFundOperations extends DbOperations<InvestmentFund> {
  getTotalFunds(options?: { where?: { portfolioId?: number } }): Promise<number>;
}

export interface StockPriceOperations {
  findMany(options?: { 
    where?: { stockId?: number, symbol?: string },
    orderBy?: { [key: string]: 'asc' | 'desc' }
  }): Promise<StockPriceData[]>;
  findLatestBySymbol(symbol: string): Promise<StockPriceData | null>;
  findLatestByStockId(stockId: number): Promise<StockPriceData | null>;
  add(stockPrice: Omit<StockPriceData, 'id' | 'createdAt' | 'updatedAt'>): Promise<number>;
  update(id: number, stockPrice: Partial<Omit<StockPriceData, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void>;
  delete(id: number): Promise<void>;
}

export interface ExchangeRateOperations {
  findLatestByCurrencyPair(fromCurrency: string, toCurrency: string): Promise<ExchangeRateData | null>;
  add(data: Omit<ExchangeRateData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExchangeRateData>;
  update(fromCurrency: string, toCurrency: string, data: { rate: number, lastUpdated: Date }): Promise<ExchangeRateData | null>;
  isRateExpired(fromCurrency: string, toCurrency: string, expirationMinutes?: number): Promise<boolean>;
}

// データベースヘルパーの型定義
export interface DbHelper {
  portfolios: DbOperations<Portfolio>;
  stocks: DbOperations<Stock>;
  purchases: DbOperations<Purchase>;
  dividends: DbOperations<Dividend>;
  investmentFunds: InvestmentFundOperations;
  stockPrices: StockPriceOperations;
  exchangeRates: ExchangeRateOperations;
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

// リポジトリのオプション
export interface RepositoryOptions {
  indexNames?: string[];
  entityName?: string;
} 