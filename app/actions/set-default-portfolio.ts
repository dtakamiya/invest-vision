import { dbHelper } from '@/app/lib/db';

/**
 * デフォルトポートフォリオのIDを5に設定する関数
 */
export async function setDefaultPortfolio() {
  try {
    // 現在のポートフォリオ一覧を取得
    const portfolios = await dbHelper.portfolios.findMany();
    
    // ID=5のポートフォリオが存在するか確認
    const targetPortfolio = portfolios.find(p => p.id === 5);
    if (!targetPortfolio) {
      return {
        success: false,
        error: 'ID=5のポートフォリオが存在しません'
      };
    }
    
    // 現在のデフォルトポートフォリオを探す
    const currentDefault = portfolios.find(p => p.isDefault);
    
    // 現在のデフォルトポートフォリオがある場合、デフォルト設定を解除
    if (currentDefault && currentDefault.id !== undefined && currentDefault.id !== 5) {
      await dbHelper.portfolios.update({
        where: { id: currentDefault.id },
        data: { isDefault: false }
      });
    }
    
    // ID=5のポートフォリオをデフォルトに設定
    await dbHelper.portfolios.update({
      where: { id: 5 },
      data: { isDefault: true }
    });
    
    // ローカルストレージのcurrentPortfolioIdも更新
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentPortfolioId', '5');
    }
    
    return {
      success: true,
      portfolioId: 5
    };
  } catch (error) {
    console.error('デフォルトポートフォリオの設定中にエラーが発生しました:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました'
    };
  }
} 