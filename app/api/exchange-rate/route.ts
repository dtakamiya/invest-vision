import { NextRequest, NextResponse } from 'next/server';

// ルートレベルでのキャッシュ設定
export const revalidate = 60; // 60秒ごとに再検証

export async function GET(request: NextRequest) {
  try {
    // URLからクエリパラメータを取得
    const url = new URL(request.url);
    const isManualUpdate = url.searchParams.has('manual');
    
    // 手動更新の場合は常に再検証、自動更新の場合は短い時間でキャッシュ
    const revalidateTime = isManualUpdate ? 0 : 60; // 手動更新時は0秒、自動更新時は60秒
    
    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDJPY=X', {
      next: { 
        revalidate: revalidateTime,
        tags: ['exchange-rate'] // キャッシュタグを設定
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error(`Yahoo Finance APIエラー: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`エラー詳細: ${errorText}`);
      throw new Error(`為替レートの取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();

    // レスポンス全体をログ出力（デバッグ用）
    console.log('Yahoo Finance API完全レスポンス:', JSON.stringify(data));

    if (!data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      console.error('為替レートデータ不足:', JSON.stringify(data));
      throw new Error('為替レートのデータが見つかりませんでした');
    }

    // レスポンスをコンソールに出力（デバッグ用）
    console.log('Yahoo Finance APIレスポンス:', JSON.stringify({
      rate: data.chart.result[0].meta.regularMarketPrice,
      timestamp: new Date().toISOString(),
      isManualUpdate
    }));

    const res = NextResponse.json({
      rate: data.chart.result[0].meta.regularMarketPrice,
      lastUpdated: new Date()
    });
    
    // レスポンスヘッダーも同様に設定
    if (isManualUpdate) {
      res.headers.set('Cache-Control', 'no-store, max-age=0');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
    } else {
      res.headers.set('Cache-Control', `public, max-age=${revalidateTime}, s-maxage=${revalidateTime}`);
      res.headers.set('Expires', new Date(Date.now() + revalidateTime * 1000).toUTCString());
    }
    
    return res;
  } catch (error) {
    console.error('為替レートの取得中にエラーが発生しました:', error);
    // エラーの場合はデフォルトレートを返す
    const res = NextResponse.json({
      rate: 150,
      lastUpdated: new Date()
    });
    
    // エラー時はキャッシュしない
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    
    return res;
  }
} 