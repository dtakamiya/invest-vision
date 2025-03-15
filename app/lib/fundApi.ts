/**
 * 投資信託協会のウェブサイトから投資信託の基準価格を取得するユーティリティ
 */
import { delay } from './utils';

export interface FundPrice {
  isin: string;        // ISINコード
  name: string;        // ファンド名
  price: number;       // 基準価格
  netAsset?: number;   // 純資産総額（億円）
  date: Date;          // 基準日
  currency: string;    // 通貨
  lastUpdated: Date;   // データ取得日時
}

/**
 * サーバーサイドAPIを経由して投資信託の基準価格を取得する関数
 * @param symbol 投資信託のシンボル（ISINコード: 9I312249 または 銘柄コード: 1234）
 * @returns 投資信託の基準価格情報、取得できない場合はnull
 */
export async function fetchFundPrice(symbol: string): Promise<FundPrice | null> {
  try {
    console.log(`投資信託情報の取得を開始: ${symbol}`);
    
    // タイムスタンプをクエリパラメータとして追加してキャッシュを回避
    const timestamp = new Date().getTime();
    
    // サーバーサイドAPIのURLを構築
    const apiUrl = `/api/fund?isin=${encodeURIComponent(symbol)}&_=${timestamp}`;
    console.log(`投資信託情報取得API URL: ${apiUrl}`);
    
    // APIからデータを取得
    const response = await fetch(apiUrl);
    console.log(`投資信託情報取得レスポンス: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`投資信託情報の取得に失敗しました: ${response.status} ${response.statusText} - ${errorData.error || '不明なエラー'}`);
    }

    // JSONデータを取得
    const data = await response.json();
    
    // 日付文字列をDateオブジェクトに変換
    const fundPrice: FundPrice = {
      ...data,
      date: new Date(data.date),
      lastUpdated: new Date(data.lastUpdated)
    };
    
    console.log(`投資信託情報取得成功: ${symbol}, 価格: ${fundPrice.price}円`);
    return fundPrice;
  } catch (error) {
    console.error(`${symbol}の投資信託情報取得中にエラーが発生しました:`, error);
    return null;
  }
}

/**
 * 複数の投資信託の基準価格を一度に取得する関数
 * @param symbols 投資信託のシンボルの配列（ISINコードまたは銘柄コード）
 * @returns シンボルをキー、FundPriceオブジェクトを値とするMap
 */
export async function fetchMultipleFundPrices(symbols: string[]): Promise<Map<string, FundPrice>> {
  console.log(`複数の投資信託情報取得を開始: ${symbols.join(', ')}`);
  const results = new Map<string, FundPrice>();
  
  // 逐次処理で投資信託情報を取得（1秒間隔）
  for (const symbol of symbols) {
    const fundPrice = await fetchFundPrice(symbol);
    if (fundPrice) {
      results.set(symbol, fundPrice);
      console.log(`投資信託情報をMapに追加: ${symbol}`);
    } else {
      console.warn(`投資信託情報の取得に失敗: ${symbol}`);
    }
    
    // 次のリクエストまで1秒待機（最後のリクエストでは待機しない）
    if (symbols.indexOf(symbol) < symbols.length - 1) {
      console.log(`次のリクエストまで1秒待機...`);
      await delay(1000);
    }
  }
  
  console.log(`複数の投資信託情報取得完了: 成功=${results.size}件, 失敗=${symbols.length - results.size}件`);
  return results;
} 