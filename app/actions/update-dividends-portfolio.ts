import { dbHelper } from '@/app/lib/db';

/**
 * 配当記録のポートフォリオIDをすべて5に変更する関数
 */
export async function updateDividendsPortfolio() {
  try {
    // 現在の配当記録を取得
    const dividends = await dbHelper.dividends.findMany();
    
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
    
    // 更新対象の配当記録数をカウント
    let updatedCount = 0;
    
    // 各配当記録のポートフォリオIDを5に更新
    for (const dividend of dividends) {
      if (dividend.id !== undefined) {
        await dbHelper.dividends.update({
          where: { id: dividend.id },
          data: { portfolioId: 5 }
        });
        updatedCount++;
      }
    }
    
    return {
      success: true,
      updatedCount,
      message: `${updatedCount}件の配当記録のポートフォリオIDを5に更新しました`
    };
  } catch (error) {
    console.error('配当記録の更新中にエラーが発生しました:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      updatedCount: 0
    };
  }
} 