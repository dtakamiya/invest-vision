import { dbHelper } from '@/app/lib/db';

/**
 * 購入記録のポートフォリオIDをすべて5に変更する関数
 */
export async function updatePurchasesPortfolio() {
  try {
    // 現在の購入記録を取得
    const purchases = await dbHelper.purchases.findMany();
    
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
    
    // 更新対象の購入記録数をカウント
    let updatedCount = 0;
    
    // 各購入記録のポートフォリオIDを5に更新
    for (const purchase of purchases) {
      if (purchase.id !== undefined) {
        await dbHelper.purchases.update({
          where: { id: purchase.id },
          data: { portfolioId: 5 }
        });
        updatedCount++;
      }
    }
    
    return {
      success: true,
      updatedCount,
      message: `${updatedCount}件の購入記録のポートフォリオIDを5に更新しました`
    };
  } catch (error) {
    console.error('購入記録の更新中にエラーが発生しました:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      updatedCount: 0
    };
  }
} 