// Yahoo Finance APIを利用して株価情報を取得するユーティリティ
import { FundPrice } from './fundApi';
import { delay } from './utils';
import { dbHelper } from './db';

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: Date;
  name?: string;  // 銘柄名または投資信託名
}

/**
 * 単一銘柄の株価情報を取得する関数
 */
export async function fetchStockPrice(symbol: string): Promise<StockPrice | null> {
  console.log(`fetchStockPrice: 関数が呼び出されました - ${symbol}`);
  
  try {
    // 投資信託のシンボル（9Iから始まる）または8桁の数字（先頭が0のもの）の場合は、fund APIを使用
    if (symbol.startsWith('9I') || (symbol.length === 8 && symbol.startsWith('0') && /^\d+$/.test(symbol))) {
      console.log(`投資信託シンボル ${symbol} を検出したため、fund APIを使用します`);
      return fetchFundPriceAsStockPrice(symbol);
    }
    
    // まずDBから最新の株価情報を取得
    const cachedPrice = await dbHelper.stockPrices.findLatestBySymbol(symbol);
    
    // キャッシュが存在し、最終更新が5分以内の場合はキャッシュを使用
    if (cachedPrice && (new Date().getTime() - new Date(cachedPrice.lastUpdated).getTime() < 5 * 60 * 1000)) {
      console.log(`キャッシュされた株価データを使用: ${symbol}, 価格: ${cachedPrice.price}${cachedPrice.currency}`);
      return {
        symbol: cachedPrice.symbol,
        price: cachedPrice.price,
        change: cachedPrice.change,
        changePercent: cachedPrice.changePercent,
        currency: cachedPrice.currency,
        lastUpdated: new Date(cachedPrice.lastUpdated)
      };
    }
    
    // タイムスタンプをクエリパラメータとして追加してキャッシュを回避
    const timestamp = new Date().getTime();
    // APIエンドポイントにリクエスト
    console.log(`APIリクエスト実行: ${symbol}`);
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
    console.log(`APIレスポンス受信: ${symbol}`, { 
      cacheInfo: data._cacheInfo,
      hasData: !!data.chart?.result?.[0]?.meta?.regularMarketPrice
    });

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

    const stockPrice = {
      symbol: symbol,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      currency: meta.currency || 'JPY',
      lastUpdated: new Date(),
      name: data.stockName || meta.shortName // 銘柄名を追加
    };
    
    // 株価情報をDBに保存
    await saveStockPriceToDB(stockPrice);
    
    return stockPrice;
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
    // まずDBから最新の株価情報を取得
    const cachedPrice = await dbHelper.stockPrices.findLatestBySymbol(symbol);
    
    // キャッシュが存在し、最終更新が5分以内の場合はキャッシュを使用
    if (cachedPrice && (new Date().getTime() - new Date(cachedPrice.lastUpdated).getTime() < 5 * 60 * 1000)) {
      console.log(`キャッシュされた投資信託データを使用: ${symbol}`);
      return {
        symbol: cachedPrice.symbol,
        price: cachedPrice.price,
        change: cachedPrice.change,
        changePercent: cachedPrice.changePercent,
        currency: cachedPrice.currency,
        lastUpdated: new Date(cachedPrice.lastUpdated)
      };
    }
    
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
    const stockPrice = {
      symbol: symbol,
      price: data.price,
      change: 0, // 前日比は取得できないため0とする
      changePercent: 0, // 変化率も0とする
      currency: data.currency || 'JPY',
      lastUpdated: new Date(data.lastUpdated),
      name: data.name  // 投資信託名を追加
    };
    
    // 株価情報をDBに保存
    await saveStockPriceToDB(stockPrice);
    
    return stockPrice;
  } catch (error) {
    console.error(`${symbol}の投資信託情報取得中にエラーが発生しました:`, error);
    return null;
  }
}

/**
 * 株価情報をDBに保存する関数
 */
async function saveStockPriceToDB(stockPrice: StockPrice): Promise<void> {
  try {
    // シンボルに対応する株式情報を取得
    const stocks = await dbHelper.stocks.findMany({
      where: { symbol: stockPrice.symbol }
    });
    if (!stocks || stocks.length === 0) {
      console.warn(`シンボル ${stockPrice.symbol} に対応する株式情報が見つかりませんでした`);
      return;
    }
    
    const stock = stocks[0];
    if (!stock.id) {
      console.warn(`シンボル ${stockPrice.symbol} の株式IDが見つかりませんでした`);
      return;
    }
    
    // 最新の株価情報を取得
    const latestPrice = await dbHelper.stockPrices.findLatestByStockId(stock.id);
    
    // 名前の更新処理
    if (stockPrice.name && stock.name !== stockPrice.name) {
      if (stock.assetType === 'fund') {
        console.log(`投資信託名を更新します: ${stock.name} -> ${stockPrice.name}`);
      } else {
        console.log(`株式名を更新します: ${stock.name} -> ${stockPrice.name}`);
      }
      // 常に最新の名前で更新する
      await dbHelper.stocks.update({ 
        where: { id: stock.id }, 
        data: { name: stockPrice.name } 
      });
    }
    
    if (latestPrice) {
      // 既存のレコードがある場合は更新
      await dbHelper.stockPrices.update(latestPrice.id as number, {
        price: stockPrice.price,
        change: stockPrice.change,
        changePercent: stockPrice.changePercent,
        currency: stockPrice.currency,
        lastUpdated: stockPrice.lastUpdated
      });
      console.log(`株価情報を更新しました: ${stockPrice.symbol}, 価格: ${stockPrice.price}${stockPrice.currency}`);
    } else {
      // 既存のレコードがない場合は新規作成
      await dbHelper.stockPrices.add({
        stockId: stock.id,
        symbol: stockPrice.symbol,
        price: stockPrice.price,
        change: stockPrice.change,
        changePercent: stockPrice.changePercent,
        currency: stockPrice.currency,
        lastUpdated: stockPrice.lastUpdated
      });
      console.log(`株価情報を新規作成しました: ${stockPrice.symbol}, 価格: ${stockPrice.price}${stockPrice.currency}`);
    }
  } catch (error) {
    console.error(`株価情報のDB保存中にエラーが発生しました:`, error);
  }
}

/**
 * 複数銘柄の株価情報を一度に取得する関数
 */
export async function fetchMultipleStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
  console.log(`複数の株価情報取得を開始: ${symbols.join(', ')}`);
  console.log('fetchMultipleStockPrices: 関数が呼び出されました', { symbolsCount: symbols.length });
  
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
  
  // 逐次処理で株価情報を取得（1秒間隔）
  for (const symbol of stockSymbols) {
    console.log(`株価情報取得開始: ${symbol}`);
    const stockPrice = await fetchStockPrice(symbol);
    if (stockPrice) {
      results.set(symbol, stockPrice);
      console.log(`株価情報をMapに追加: ${symbol}, 価格: ${stockPrice.price}${stockPrice.currency}`);
    } else {
      console.warn(`株価情報の取得に失敗: ${symbol}`);
    }
    
    // 次のリクエストまで1秒待機（最後のリクエストでは待機しない）
    if (stockSymbols.indexOf(symbol) < stockSymbols.length - 1) {
      console.log(`次のリクエストまで1秒待機...`);
      await delay(1000);
    }
  }
  
  // 投資信託の基準価格を取得（1秒間隔）
  if (fundSymbols.length > 0) {
    for (const symbol of fundSymbols) {
      console.log(`投資信託情報取得開始: ${symbol}`);
      const fundPrice = await fetchFundPriceAsStockPrice(symbol);
      if (fundPrice) {
        results.set(symbol, fundPrice);
        console.log(`投資信託情報をMapに追加: ${symbol}, 価格: ${fundPrice.price}${fundPrice.currency}`);
      } else {
        console.warn(`投資信託情報の取得に失敗: ${symbol}`);
      }
      
      // 次のリクエストまで1秒待機（最後のリクエストでは待機しない）
      if (fundSymbols.indexOf(symbol) < fundSymbols.length - 1) {
        console.log(`次のリクエストまで1秒待機...`);
        await delay(1000);
      }
    }
  }
  
  console.log(`複数の株価情報取得完了: 成功=${results.size}件, 失敗=${symbols.length - results.size}件`);
  return results;
} 