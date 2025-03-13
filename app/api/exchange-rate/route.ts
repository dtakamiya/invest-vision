import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDJPY=X', {
      cache: 'no-store'
    });
    const data = await response.json();

    if (!data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      throw new Error('為替レートの取得に失敗しました');
    }

    const res = NextResponse.json({
      rate: data.chart.result[0].meta.regularMarketPrice,
      lastUpdated: new Date()
    });
    
    // キャッシュを無効化するヘッダーを設定
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    
    return res;
  } catch (error) {
    console.error('為替レートの取得中にエラーが発生しました:', error);
    // エラーの場合はデフォルトレートを返す
    const res = NextResponse.json({
      rate: 150,
      lastUpdated: new Date()
    });
    
    // エラー時もキャッシュを無効化
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    
    return res;
  }
} 