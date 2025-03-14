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
  stock?: Stock; // 関連する株式情報（include時に使用）
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
  stock?: Stock; // 関連する株式情報（include時に使用）
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