// Yahoo Finance APIを利用して株価情報を取得するユーティリティ
import { FundPrice } from './fundApi';

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
    // 投資信託のシンボル（9Iから始まる）または8桁の数字（先頭が0のもの）の場合は、fund APIを使用
    if (symbol.startsWith('9I') || (symbol.length === 8 && symbol.startsWith('0') && /^\d+$/.test(symbol))) {
      console.log(`投資信託シンボル ${symbol} を検出したため、fund APIを使用します`);
      return fetchFundPriceAsStockPrice(symbol);
    }
    
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
      symbol: symbol,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      currency: meta.currency || 'JPY',
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error(`${symbol}の株価情報取得中にエラーが発生しました:`, error);
    return null;
  }
}

/**
 * 投資信託の基準価格をStockPrice形式で取得する関数
 */
async function fetchFundPriceAsStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    // タイムスタンプをクエリパラメータとして追加してキャッシュを回避
    const timestamp = new Date().getTime();
    
    // fund APIを呼び出す
    const response = await fetch(`/api/fund?isin=${encodeURIComponent(symbol)}&_=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`投資信託情報の取得に失敗しました: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 投資信託データをStockPrice形式に変換
    return {
      symbol: symbol,
      price: data.price,
      change: 0, // 前日比は取得できないため0とする
      changePercent: 0, // 変化率も0とする
      currency: data.currency || 'JPY',
      lastUpdated: new Date(data.lastUpdated)
    };
  } catch (error) {
    console.error(`${symbol}の投資信託情報取得中にエラーが発生しました:`, error);
    return null;
  }
}

/**
 * 複数銘柄の株価情報を一度に取得する関数
 */
export async function fetchMultipleStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
  console.log(`複数の株価情報取得を開始: ${symbols.join(', ')}`);
  const results = new Map<string, StockPrice>();
  
  // 株式と投資信託に分ける
  const stockSymbols: string[] = [];
  const fundSymbols: string[] = [];
  
  symbols.forEach(symbol => {
    if (symbol.startsWith('9I') || (symbol.length === 8 && symbol.startsWith('0') && /^\d+$/.test(symbol))) {
      fundSymbols.push(symbol);
    } else {
      stockSymbols.push(symbol);
    }
  });
  
  console.log('株価取得: 株式と投資信託に分類', { 
    stocks: stockSymbols.length, 
    funds: fundSymbols.length
  });
  
  // 並列処理で複数の株価情報を取得
  const promises = stockSymbols.map(symbol => fetchStockPrice(symbol));
  const stockPrices = await Promise.all(promises);
  
  // 結果をMapに格納
  for (let i = 0; i < stockSymbols.length; i++) {
    const stockPrice = stockPrices[i];
    if (stockPrice) {
      results.set(stockSymbols[i], stockPrice);
      console.log(`株価情報をMapに追加: ${stockSymbols[i]}`);
    } else {
      console.warn(`株価情報の取得に失敗: ${stockSymbols[i]}`);
    }
  }
  
  // 投資信託の基準価格を取得
  if (fundSymbols.length > 0) {
    const fundPromises = fundSymbols.map(symbol => fetchFundPriceAsStockPrice(symbol));
    const fundPrices = await Promise.all(fundPromises);
    
    // 結果をMapに格納
    for (let i = 0; i < fundSymbols.length; i++) {
      const fundPrice = fundPrices[i];
      if (fundPrice) {
        results.set(fundSymbols[i], fundPrice);
        console.log(`投資信託情報をMapに追加: ${fundSymbols[i]}`);
      } else {
        console.warn(`投資信託情報の取得に失敗: ${fundSymbols[i]}`);
      }
    }
  }
  
  console.log(`複数の株価情報取得完了: 成功=${results.size}件, 失敗=${symbols.length - results.size}件`);
  return results;
} 