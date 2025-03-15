// 投資資金リポジトリ

import { InvestmentFund, InvestmentFundOperations } from '../types';
import { createRepository } from '../utils/crud';

/**
 * 投資資金リポジトリを作成
 */
export function createInvestmentFundRepository(): InvestmentFundOperations {
  const repository = createRepository<InvestmentFund>('investmentFunds', {
    entityName: '投資資金',
    indexNames: ['date', 'type', 'portfolioId']
  });

  return {
    ...repository,
    /**
     * 合計資金を取得
     */
    async getTotalFunds(options?: { where?: { portfolioId?: number } }): Promise<number> {
      const funds = await repository.findMany(options);
      return funds.reduce((total, fund) => {
        if (fund.type === 'deposit') {
          return total + fund.amount;
        } else {
          return total - fund.amount;
        }
      }, 0);
    }
  };
} 