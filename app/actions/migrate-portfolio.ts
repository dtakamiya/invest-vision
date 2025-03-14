import { dbHelper } from '@/app/lib/db';

/**
 * 既存のデータをデフォルトポートフォリオに移行する関数
 */
export async function migrateDataToDefaultPortfolio() {
  try {
    console.log('データマイグレーションを開始します...');
    
    // デフォルトポートフォリオの確認
    const existingPortfolios = await dbHelper.portfolios.findMany({
      where: { isDefault: true }
    });
    
    let defaultPortfolioId: number;
    
    // デフォルトポートフォリオがない場合は作成
    if (existingPortfolios.length === 0) {
      const newPortfolio = await dbHelper.portfolios.create({
        data: {
          name: 'デフォルトポートフォリオ',
          description: '自動作成されたデフォルトポートフォリオ',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      defaultPortfolioId = newPortfolio.id!;
      console.log(`新しいデフォルトポートフォリオを作成しました(ID: ${defaultPortfolioId})`);
    } else {
      defaultPortfolioId = existingPortfolios[0].id!;
      console.log(`既存のデフォルトポートフォリオ(ID: ${defaultPortfolioId})を使用します`);
    }
    
    // 既存の株式データを取得
    const stocks = await dbHelper.stocks.findMany();
    console.log(`${stocks.length}件の株式データを確認しました`);
    
    // 注：銘柄テーブルからportfolioIdフィールドが削除されたため、
    // 株式データをデフォルトポートフォリオに関連付ける処理は不要になりました
    
    // 既存の購入記録を取得
    const purchases = await dbHelper.purchases.findMany();
    console.log(`${purchases.length}件の購入記録を移行します...`);
    
    // 購入記録をデフォルトポートフォリオに関連付け
    for (const purchase of purchases) {
      if (purchase.portfolioId === undefined) {
        await dbHelper.purchases.update({
          where: { id: purchase.id! },
          data: { portfolioId: defaultPortfolioId }
        });
      }
    }
    
    // 既存の配当記録を取得
    const dividends = await dbHelper.dividends.findMany();
    console.log(`${dividends.length}件の配当記録を移行します...`);
    
    // 配当記録をデフォルトポートフォリオに関連付け
    for (const dividend of dividends) {
      if (dividend.portfolioId === undefined) {
        await dbHelper.dividends.update({
          where: { id: dividend.id! },
          data: { portfolioId: defaultPortfolioId }
        });
      }
    }
    
    // 既存の投資資金記録を取得
    const funds = await dbHelper.investmentFunds.findMany();
    console.log(`${funds.length}件の投資資金記録を移行します...`);
    
    // 投資資金記録をデフォルトポートフォリオに関連付け
    for (const fund of funds) {
      if (fund.portfolioId === undefined) {
        await dbHelper.investmentFunds.update({
          where: { id: fund.id! },
          data: { portfolioId: defaultPortfolioId }
        });
      }
    }
    
    console.log('データマイグレーションが完了しました');
    return { success: true, message: 'データマイグレーションが完了しました', portfolioId: defaultPortfolioId };
  } catch (error) {
    console.error('データマイグレーション中にエラーが発生しました:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '不明なエラーが発生しました' 
    };
  }
} 