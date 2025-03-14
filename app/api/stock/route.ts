import { NextRequest, NextResponse } from 'next/server';

/**
 * Yahoo Finance APIから株価データを取得するAPIルート
 * クライアントサイドからのCORS問題を回避するために使用
 */
export async function GET(request: NextRequest) {
  // CORSヘッダーを設定
  const corsHeaders = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  // キャッシュヘッダーを追加
  const headers = new Headers(corsHeaders);
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  headers.set('Expires', new Date(Date.now() + 300 * 1000).toUTCString());

  try {
    // URLからシンボルを取得
    const symbol = request.nextUrl.searchParams.get('symbol');
    
    console.log('リクエストパラメータ:', {
      originalSymbol: symbol,
      url: request.nextUrl.toString(),
      headers: Object.fromEntries(request.headers)
    });
    
    if (!symbol) {
      return new NextResponse(
        JSON.stringify({ error: 'シンボルが指定されていません' }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }
    
    // シンボルの整形
    let formattedSymbol = symbol;
    
    // 数字のみの場合は日本株と判断し、まず.Tを試す
    if (/^\d+$/.test(symbol)) {
      formattedSymbol = `${symbol}.T`;
    }
    
    // Yahoo Finance APIにアクセス
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=1d`;
    
    console.log('Yahoo Finance APIリクエスト:', {
      url,
      formattedSymbol,
      timestamp: new Date().toISOString()
    });
    
    let response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 300 } // 5分間キャッシュ
    });

    // .Tで失敗した場合は.JPを試す
    if (!response.ok && /^\d+\.T$/.test(formattedSymbol)) {
      formattedSymbol = `${symbol}.JP`;
      const jpUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=1d`;
      
      console.log('Yahoo Finance API 2回目のリクエスト (.JP):', {
        url: jpUrl,
        formattedSymbol,
        timestamp: new Date().toISOString()
      });

      response = await fetch(jpUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        next: { revalidate: 300 } // 5分間キャッシュ
      });
    }
    
    console.log('Yahoo Finance APIレスポンス:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`APIルート: 株価情報の取得に失敗しました: ${response.status} ${response.statusText}`);
      console.error(`エラー詳細: ${errorText}`);
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
    
    // 成功した場合はデータを返す
    return new NextResponse(
      JSON.stringify(data),
      { 
        status: 200,
        headers: headers // キャッシュヘッダーを含むヘッダーを使用
      }
    );
  } catch (error) {
    console.error('APIルート: 株価情報の取得中にエラーが発生しました:', error);
    return new NextResponse(
      JSON.stringify({ error: '株価情報の取得中にエラーが発生しました' }),
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