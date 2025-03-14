import { NextRequest, NextResponse } from 'next/server';

interface ExchangeRateCache {
  rate: number;
  lastUpdated: Date;
}

// グローバル変数でキャッシュを管理
let cachedRate: ExchangeRateCache | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5分

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    const url = new URL(request.url);
    const isManualUpdate = url.searchParams.has('manual');
    
    // キャッシュが有効かチェック（手動更新でない場合のみ）
    if (!isManualUpdate && cachedRate && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
      console.log('キャッシュされた為替レートを使用:', cachedRate);
      const res = NextResponse.json(cachedRate);
      return res;
    }

    console.log('Yahoo Finance APIから為替レートを取得中...');
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/USDJPY=X',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    );

    if (!response.ok) {
      console.error('Yahoo Finance APIエラー:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Yahoo Finance APIレスポンス:', JSON.stringify(data, null, 2));

    if (!data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      console.error('無効なレスポンス形式:', data);
      throw new Error('Invalid response format from Yahoo Finance API');
    }

    const rate = data.chart.result[0].meta.regularMarketPrice;
    console.log('取得した為替レート:', rate);

    // 成功したらキャッシュを更新
    cachedRate = {
      rate,
      lastUpdated: new Date()
    };
    cacheTimestamp = now;

    const res = NextResponse.json(cachedRate);
    res.headers.set('Cache-Control', 'no-store, must-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (error) {
    console.error('為替レート取得エラー:', error);
    // エラー時はキャッシュを更新せず、既存のキャッシュがあればそれを使用
    if (cachedRate) {
      console.log('エラー発生時、キャッシュされた為替レートを使用:', cachedRate);
      return NextResponse.json(cachedRate);
    }
    // キャッシュもない場合は固定値を使用
    return NextResponse.json({
      rate: 150,
      lastUpdated: new Date(),
      error: 'Failed to fetch exchange rate'
    });
  }
} 