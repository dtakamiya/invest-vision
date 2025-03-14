// Yahoo Finance APIを利用して株価情報を取得するユーティリティ

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: Date;
}

/**
 * 単一銘柄の株価情報を取得する関数
 */
export async function fetchStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    // タイムスタンプをクエリパラメータとして追加してキャッシュを回避
    const timestamp = new Date().getTime();
    // APIエンドポイントにリクエスト
    const response = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&_t=${timestamp}`, {
      // キャッシュを回避する設定
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`株価情報の取得に失敗しました: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // データが存在しない場合はnullを返す
    if (!data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      console.warn(`${symbol}の株価データが見つかりませんでした`);
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    // 前日比と変化率を計算
    const previousClose = meta.chartPreviousClose || meta.previousClose || 0;
    const currentPrice = meta.regularMarketPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      currency: meta.currency || 'JPY',
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error(`${symbol}の株価情報取得中にエラーが発生しました:`, error);
    return null;
  }
}

/**
 * 複数銘柄の株価情報を一度に取得する関数
 */
export async function fetchMultipleStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
  const result = new Map<string, StockPrice>();
  
  // 並列処理で複数銘柄の株価を取得
  const promises = symbols.map(symbol => fetchStockPrice(symbol));
  const prices = await Promise.all(promises);
  
  // 結果をMapに格納
  symbols.forEach((symbol, index) => {
    const price = prices[index];
    if (price) {
      result.set(symbol, price);
    }
  });
  
  return result;
} 