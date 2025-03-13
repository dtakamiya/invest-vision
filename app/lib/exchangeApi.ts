interface ExchangeRate {
  rate: number;
  lastUpdated: Date;
}

export async function fetchUSDJPYRate(): Promise<ExchangeRate> {
  try {
    // タイムスタンプをクエリパラメータとして追加してキャッシュを回避
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/exchange-rate?_t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
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