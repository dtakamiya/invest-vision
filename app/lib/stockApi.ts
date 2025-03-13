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
 * Yahoo Finance APIから株価情報を取得する
 * @param symbol 銘柄コード
 * @returns 株価情報
 */
export async function fetchStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    // シンボルの整形
    let formattedSymbol = symbol;
    
    // 数字のみの場合は日本株と判断し、.Tを追加
    if (/^\d+$/.test(symbol)) {
      formattedSymbol = `${symbol}.T`;
    }
    
    // Next.jsのAPIルートを経由してアクセス
    const response = await fetch(`/api/stock?symbol=${encodeURIComponent(formattedSymbol)}`);
    
    console.log(`APIルートを経由して株価情報を取得中: ${formattedSymbol}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`株価情報の取得に失敗しました: ${response.status} ${response.statusText}`);
      console.error(`エラー詳細: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    
    // APIからのレスポンスを解析
    const result = data.chart.result[0];
    if (!result) {
      console.error('株価情報が見つかりませんでした');
      return null;
    }
    
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    const timestamp = result.timestamp[result.timestamp.length - 1];
    const closePrice = quote.close[quote.close.length - 1];
    const previousClose = meta.previousClose || quote.close[quote.close.length - 2] || 0;
    
    // 価格変動を計算
    const change = closePrice - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
    
    return {
      symbol: formattedSymbol,
      price: closePrice,
      change: change,
      changePercent: changePercent,
      currency: meta.currency || 'JPY',
      lastUpdated: new Date(timestamp * 1000)
    };
  } catch (error) {
    console.error('株価情報取得中にエラーが発生しました:', error);
    return null;
  }
}

/**
 * 複数の銘柄の株価情報を取得する
 * @param symbols 銘柄コードの配列
 * @returns 株価情報の配列
 */
export async function fetchMultipleStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
  const results = new Map<string, StockPrice>();
  
  // 並列処理で取得する
  const promises = symbols.map(symbol => fetchStockPrice(symbol));
  const prices = await Promise.all(promises);
  
  // 結果をMapに格納
  symbols.forEach((symbol, index) => {
    const price = prices[index];
    if (price) {
      results.set(symbol, price);
    }
  });
  
  return results;
} 