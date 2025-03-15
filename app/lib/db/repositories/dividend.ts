// 配当記録リポジトリ

import { Dividend, DbOperations } from '../types';
import { createRepository } from '../utils/crud';

/**
 * 配当記録リポジトリを作成
 */
export function createDividendRepository(): DbOperations<Dividend> {
  return createRepository<Dividend>('dividends', {
    entityName: '配当記録',
    indexNames: ['stockId', 'receivedDate', 'portfolioId']
  });
} 