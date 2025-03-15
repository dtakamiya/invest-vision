// ポートフォリオリポジトリ

import { Portfolio, DbOperations } from '../types';
import { createRepository } from '../utils/crud';

/**
 * ポートフォリオリポジトリを作成
 */
export function createPortfolioRepository(): DbOperations<Portfolio> {
  return createRepository<Portfolio>('portfolios', {
    entityName: 'ポートフォリオ',
    indexNames: ['name', 'isDefault', 'description']
  });
} 