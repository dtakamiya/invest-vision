import { NextRequest, NextResponse } from 'next/server';

/**
 * Yahoo Finance APIのテスト用エンドポイント
 * 指定されたシンボルの株価情報を取得し、詳細なログを出力します
 */
export async function GET(request: NextRequest) {
  // CORSヘッダーを設定
  const corsHeaders = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  try {
    // URLからシンボルを取得（デフォルトは7203.T - トヨタ自動車）
    const symbol = request.nextUrl.searchParams.get('symbol') || '7203.T';
    
    // シンボルの整形
    let formattedSymbol = symbol;
    
    // Yahoo Finance APIにアクセス
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=1d`;
    
    // テスト用エンドポイントでは常にキャッシュを無効化しているため、常にログを出力
    // 実際のAPIリクエストが行われたことを明示的に示す
    console.log('【テスト】Yahoo Finance APIテストリクエスト開始:', {
      symbol,
      timestamp: new Date().toISOString(),
      url: request.nextUrl.toString(),
      cacheDisabled: true // キャッシュが無効化されていることを明示
    });
    
    console.log('【テスト】Yahoo Finance APIリクエスト:', {
      url,
      formattedSymbol,
      timestamp: new Date().toISOString(),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cacheDisabled: true // キャッシュが無効化されていることを明示
    });
    
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store' // キャッシュを使用しない
    });
    const endTime = Date.now();
    
    console.log('【テスト】Yahoo Finance APIレスポンス:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      responseTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`【テスト】APIルート: 株価情報の取得に失敗しました: ${response.status} ${response.statusText}`);
      console.error(`【テスト】エラー詳細: ${errorText}`);
      return new NextResponse(
        JSON.stringify({ 
          error: `株価情報の取得に失敗しました: ${response.statusText}`,
          details: errorText,
          status: response.status
        }),
        { 
          status: response.status,
          headers: corsHeaders
        }
      );
    }
    
    const data = await response.json();
    
    // レスポンスデータの詳細をログに出力
    console.log('【テスト】Yahoo Finance APIレスポンスデータ:', {
      symbol: formattedSymbol,
      hasData: !!data.chart?.result?.[0],
      timestamp: new Date().toISOString(),
      meta: data.chart?.result?.[0]?.meta ? {
        currency: data.chart.result[0].meta.currency,
        regularMarketPrice: data.chart.result[0].meta.regularMarketPrice,
        previousClose: data.chart.result[0].meta.previousClose,
        exchangeName: data.chart.result[0].meta.exchangeName,
        timezone: data.chart.result[0].meta.timezone,
        exchangeTimezoneName: data.chart.result[0].meta.exchangeTimezoneName
      } : 'データなし',
      dataPoints: data.chart?.result?.[0]?.timestamp?.length || 0
    });
    
    // 成功した場合はデータを返す
    return new NextResponse(
      JSON.stringify({
        message: 'Yahoo Finance APIテスト成功',
        symbol: formattedSymbol,
        data: {
          price: data.chart?.result?.[0]?.meta?.regularMarketPrice || null,
          currency: data.chart?.result?.[0]?.meta?.currency || null,
          exchangeName: data.chart?.result?.[0]?.meta?.exchangeName || null,
          timestamp: new Date().toISOString(),
          responseTime: `${endTime - startTime}ms`
        }
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );
  } catch (error) {
    console.error('【テスト】APIルート: 株価情報の取得中にエラーが発生しました:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: '株価情報の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

// OPTIONSメソッドのハンドラーを追加
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
} 