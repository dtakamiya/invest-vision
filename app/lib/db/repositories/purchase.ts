// 購入記録リポジトリ

import { Purchase, DbOperations } from '../types';
import { createRepository } from '../utils/crud';

/**
 * 購入記録リポジトリを作成
 */
export function createPurchaseRepository(): DbOperations<Purchase> {
  return createRepository<Purchase>('purchases', {
    entityName: '購入記録',
    indexNames: ['stockId', 'purchaseDate', 'portfolioId']
  });
} 