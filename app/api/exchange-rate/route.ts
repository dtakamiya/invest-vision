import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/db';

// このルートは動的であることを明示
export const dynamic = 'force-dynamic';

// キャッシュ期間（5分）
const CACHE_DURATION = 5 * 60 * 1000; // 5分

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const isManualUpdate = url.searchParams.has('manual');
    const fromCurrency = 'USD';
    const toCurrency = 'JPY';
    
    // データベースから最新の為替レートを取得
    const latestRate = await db.exchangeRates.findLatestByCurrencyPair(fromCurrency, toCurrency);
    
    // 手動更新でない場合、かつ有効な為替レートがある場合はそれを使用
    if (!isManualUpdate && latestRate && !db.exchangeRates.isRateExpired(fromCurrency, toCurrency)) {
      console.log('データベースの為替レートを使用:', latestRate);
      return NextResponse.json({
        rate: latestRate.rate,
        lastUpdated: latestRate.lastUpdated
      });
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

    // データベースに為替レートを保存
    const now = new Date();
    await db.exchangeRates.update(fromCurrency, toCurrency, {
      rate,
      lastUpdated: now
    });

    const result = {
      rate,
      lastUpdated: now
    };

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'no-store, must-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (error) {
    console.error('為替レート取得エラー:', error);
    
    // エラー時はデータベースの最新レートを使用（期限切れでも）
    const latestRate = await db.exchangeRates.findLatestByCurrencyPair('USD', 'JPY');
    if (latestRate) {
      console.log('エラー発生時、データベースの為替レートを使用:', latestRate);
      return NextResponse.json({
        rate: latestRate.rate,
        lastUpdated: latestRate.lastUpdated
      });
    }
    
    // データベースにもない場合は固定値を使用
    return NextResponse.json({
      rate: 150,
      lastUpdated: new Date(),
      error: 'Failed to fetch exchange rate'
    });
  }
} 