interface ExchangeRate {
  rate: number;
  lastUpdated: Date;
}

export async function fetchUSDJPYRate(): Promise<ExchangeRate> {
  try {
    // タイムスタンプをクエリパラメータとして追加（キャッシュ制御はサーバー側で行う）
    const response = await fetch(`/api/exchange-rate`, {
      // キャッシュを許可（サーバー側で5分間のキャッシュを設定済み）
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`為替レートの取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      rate: data.rate,
      lastUpdated: new Date(data.lastUpdated)
    };
  } catch (error) {
    console.error('為替レートの取得中にエラーが発生しました:', error);
    // エラーの場合はデフォルトレートを返す
    return {
      rate: 150,
      lastUpdated: new Date()
    };
  }
} 