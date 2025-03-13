interface ExchangeRate {
  rate: number;
  lastUpdated: Date;
}

export async function fetchUSDJPYRate(): Promise<ExchangeRate> {
  try {
    const response = await fetch('/api/exchange-rate');
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