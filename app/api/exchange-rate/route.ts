import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDJPY=X');
    const data = await response.json();

    if (!data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      throw new Error('為替レートの取得に失敗しました');
    }

    return NextResponse.json({
      rate: data.chart.result[0].meta.regularMarketPrice,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('為替レートの取得中にエラーが発生しました:', error);
    // エラーの場合はデフォルトレートを返す
    return NextResponse.json({
      rate: 150,
      lastUpdated: new Date()
    });
  }
} 