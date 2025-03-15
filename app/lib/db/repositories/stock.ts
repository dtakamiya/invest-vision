// 株式リポジトリ

import { Stock, DbOperations } from '../types';
import { createRepository } from '../utils/crud';

/**
 * 株式リポジトリを作成
 */
export function createStockRepository(): DbOperations<Stock> {
  return createRepository<Stock>('stocks', {
    entityName: '銘柄',
    indexNames: ['symbol', 'name', 'country', 'assetType']
  });
} 