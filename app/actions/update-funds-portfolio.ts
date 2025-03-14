import { dbHelper } from '@/app/lib/db';

/**
 * 投資資金のポートフォリオIDをすべて5に変更する関数
 */
export async function updateFundsPortfolio() {
  try {
    // 現在の投資資金を取得
    const funds = await dbHelper.investmentFunds.findMany();
    
    // ポートフォリオID=5が存在するか確認
    const portfolios = await dbHelper.portfolios.findMany();
    const targetPortfolio = portfolios.find(p => p.id === 5);
    
    if (!targetPortfolio) {
      return {
        success: false,
        error: 'ID=5のポートフォリオが存在しません',
        updatedCount: 0
      };
    }
    
    // 更新対象の投資資金数をカウント
    let updatedCount = 0;
    
    // 各投資資金のポートフォリオIDを5に更新
    for (const fund of funds) {
      if (fund.id !== undefined) {
        await dbHelper.investmentFunds.update({
          where: { id: fund.id },
          data: { portfolioId: 5 }
        });
        updatedCount++;
      }
    }
    
    return {
      success: true,
      updatedCount,
      message: `${updatedCount}件の投資資金のポートフォリオIDを5に更新しました`
    };
  } catch (error) {
    console.error('投資資金の更新中にエラーが発生しました:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      updatedCount: 0
    };
  }
} 