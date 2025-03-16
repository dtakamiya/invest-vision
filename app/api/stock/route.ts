import { NextRequest, NextResponse } from 'next/server';

// キャッシュ用のインターフェース
interface StockDataCache {
  data: any;
  timestamp: number;
}

// グローバル変数でキャッシュを管理
const stockCache = new Map<string, StockDataCache>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

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
    const forceRefresh = request.nextUrl.searchParams.has('refresh');
    const now = Date.now();
    
    // APIリクエストが実際に行われたかどうかを追跡するフラグ
    let apiRequestMade = false;
    let cacheHit = false;
    
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
    
    // キャッシュキーを生成
    const cacheKey = formattedSymbol;
    
    // キャッシュチェック（強制更新でない場合）
    if (!forceRefresh) {
      const cachedData = stockCache.get(cacheKey);
      if (cachedData && (now - cachedData.timestamp < CACHE_DURATION)) {
        console.log(`キャッシュされた株価データを使用: ${formattedSymbol}`);
        cacheHit = true;
        
        // キャッシュヒット情報を追加
        const responseData = {
          ...cachedData.data,
          _cacheInfo: {
            hit: true,
            timestamp: new Date(cachedData.timestamp).toISOString(),
            age: Math.floor((now - cachedData.timestamp) / 1000) + 's'
          }
        };
        
        return new NextResponse(
          JSON.stringify(responseData),
          { 
            status: 200,
            headers: headers
          }
        );
      }
    }
    
    // Yahoo Finance APIにアクセス
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=1d`;
    
    apiRequestMade = true;
    console.log('Yahoo Finance APIリクエスト:', {
      url,
      formattedSymbol,
      timestamp: new Date().toISOString(),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cacheStatus: 'MISS'
    });
    
    let response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store' // キャッシュを使用しない
    });

    // .Tで失敗した場合は.JPを試す
    if (!response.ok && /^\d+\.T$/.test(formattedSymbol)) {
      formattedSymbol = `${symbol}.JP`;
      const jpUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=1d`;
      
      console.log('Yahoo Finance API 2回目のリクエスト (.JP):', {
        url: jpUrl,
        formattedSymbol,
        timestamp: new Date().toISOString(),
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      response = await fetch(jpUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        cache: 'no-store' // キャッシュを使用しない
      });
    }
    
    console.log('Yahoo Finance APIレスポンス:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      timestamp: new Date().toISOString(),
      cacheHit: false
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
    
    // レスポンスデータの一部をログに出力
    console.log('Yahoo Finance APIレスポンスデータ:', {
      symbol: formattedSymbol,
      hasData: !!data.chart?.result?.[0],
      timestamp: new Date().toISOString(),
      meta: data.chart?.result?.[0]?.meta ? {
        currency: data.chart.result[0].meta.currency,
        regularMarketPrice: data.chart.result[0].meta.regularMarketPrice,
        previousClose: data.chart.result[0].meta.previousClose,
        exchangeName: data.chart.result[0].meta.exchangeName,
        shortName: data.chart.result[0].meta.shortName
      } : 'データなし',
      cacheHit: false
    });
    
    // キャッシュを更新
    stockCache.set(cacheKey, {
      data: {
        ...data,
        stockName: data.chart?.result?.[0]?.meta?.shortName
      },
      timestamp: now
    });
    
    // キャッシュ情報を追加
    const responseData = {
      ...data,
      stockName: data.chart?.result?.[0]?.meta?.shortName,
      _cacheInfo: {
        hit: false,
        timestamp: new Date(now).toISOString(),
        age: '0s'
      }
    };
    
    // 成功した場合はデータを返す
    return new NextResponse(
      JSON.stringify(responseData),
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