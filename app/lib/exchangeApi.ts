import { db } from './db';

interface ExchangeRate {
  rate: number;
  lastUpdated: Date;
}

export async function fetchUSDJPYRate(isManualUpdate = false): Promise<ExchangeRate> {
  try {
    const fromCurrency = 'USD';
    const toCurrency = 'JPY';
    
    // データベースから最新の為替レートを取得（クライアントサイドのみ）
    if (typeof window !== 'undefined' && !isManualUpdate) {
      try {
        const latestRate = await db.exchangeRates.findLatestByCurrencyPair(fromCurrency, toCurrency);
        
        // 有効な為替レートがある場合はそれを使用
        if (latestRate) {
          // 期限切れかどうかを確認
          const isExpired = await db.exchangeRates.isRateExpired(fromCurrency, toCurrency);
          
          if (!isExpired) {
            console.log('データベースの為替レートを使用:', latestRate);
            return {
              rate: latestRate.rate,
              lastUpdated: new Date(latestRate.lastUpdated)
            };
          } else {
            console.log('データベースの為替レートは期限切れです。APIから最新情報を取得します。');
          }
        }
      } catch (dbError) {
        console.error('データベースからの為替レート取得エラー:', dbError);
        // データベースエラーは無視して、APIから取得を試みる
      }
    }

    // タイムスタンプとマニュアル更新フラグをクエリパラメータとして追加
    const timestamp = new Date().getTime();
    const url = `/api/exchange-rate?_t=${timestamp}${isManualUpdate ? '&manual=true' : ''}`;
    
    console.log('Yahoo Finance APIから為替レートを取得中...');
    const response = await fetch(url, {
      // キャッシュを回避する設定を強化
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`為替レートの取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const result = {
      rate: data.rate,
      lastUpdated: new Date(data.lastUpdated)
    };
    
    // データベースに為替レートを保存（クライアントサイドのみ）
    if (typeof window !== 'undefined') {
      try {
        await db.exchangeRates.update(fromCurrency, toCurrency, {
          rate: result.rate,
          lastUpdated: result.lastUpdated
        });
        console.log('為替レートをデータベースに保存しました');
      } catch (dbError) {
        console.error('データベースへの為替レート保存エラー:', dbError);
        // データベースエラーは無視
      }
    }
    
    return result;
  } catch (error) {
    console.error('為替レートの取得中にエラーが発生しました:', error);
    
    // エラー時はデータベースの最新レートを使用（クライアントサイドのみ）
    if (typeof window !== 'undefined') {
      try {
        const latestRate = await db.exchangeRates.findLatestByCurrencyPair('USD', 'JPY');
        if (latestRate) {
          console.log('エラー発生時、データベースの為替レートを使用:', latestRate);
          return {
            rate: latestRate.rate,
            lastUpdated: new Date(latestRate.lastUpdated)
          };
        }
      } catch (dbError) {
        console.error('エラー時のデータベース取得エラー:', dbError);
        // データベースエラーは無視
      }
    }
    
    // エラーの場合はデフォルトレートを返す
    return {
      rate: 150,
      lastUpdated: new Date()
    };
  }
} 