import { NextRequest, NextResponse } from 'next/server';
import { FundPrice } from '@/app/lib/fundApi';

// キャッシュの有効期限（1時間 = 3600000ミリ秒）
const CACHE_EXPIRY = 3600000;

// メモリ内キャッシュ
const fundPriceCache = new Map<string, { data: FundPrice, timestamp: number }>();

export async function GET(request: NextRequest) {
  // CORSヘッダーを設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // OPTIONSリクエストの場合はCORSヘッダーのみを返す
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  // URLからクエリパラメータを取得
  const url = new URL(request.url);
  const isin = url.searchParams.get('isin');
  
  // リクエストパラメータをログに出力
  console.log('リクエストパラメータ:', {
    originalIsin: isin,
    url: request.url,
    headers: Object.fromEntries(request.headers)
  });

  // ISINコードが指定されていない場合はエラーを返す
  if (!isin) {
    return NextResponse.json(
      { error: '投資信託コード（isin）が指定されていません' },
      { status: 400, headers }
    );
  }

  try {
    // キャッシュをチェック
    const cachedData = fundPriceCache.get(isin);
    const now = Date.now();
    
    // キャッシュが有効な場合はキャッシュデータを返す
    if (cachedData && (now - cachedData.timestamp) < CACHE_EXPIRY) {
      console.log(`キャッシュされた投資信託データを使用: ${isin}`);
      return NextResponse.json(cachedData.data, { headers });
    }

    // シンボルがISINコード（9Iから始まる）か銘柄コード（数字のみ）かを判断
    const isISIN = isin.startsWith('9I');
    
    // 投資信託コードはそのまま使用する（先頭の0を削除しない）
    let formattedIsin = isin;
    
    // 投資信託コードの形式に応じてURLを構築
    // 8桁のコードもそのまま使用する
    const formattedSymbol = formattedIsin;
    console.log(`投資信託情報取得: 元のシンボル=${isin}, 変換後=${formattedSymbol}`);

    // Yahoo!ファイナンスから投資信託情報を取得
    try {
      // URLをログに出力
      const yahooFinanceUrl = `https://finance.yahoo.co.jp/quote/${formattedSymbol}`;
      console.log(`Yahoo!ファイナンスURL: ${yahooFinanceUrl}`);
      
      const response = await fetch(yahooFinanceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Referer': 'https://finance.yahoo.co.jp/',
          'Origin': 'https://finance.yahoo.co.jp'
        },
        cache: 'no-store' // キャッシュを使用しない
      });

      console.log(`投資信託情報取得レスポンス: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`投資信託情報の取得に失敗しました: ${response.status} ${response.statusText}`);
      }

      // HTMLテキストを取得
      const html = await response.text();
      console.log(`投資信託情報HTML取得完了: ${isin} (長さ: ${html.length}文字)`);

      // 基準価格を抽出するための正規表現パターン
      // 複数のパターンを試して価格を抽出
      let price: number | null = null;
      let priceMatch: RegExpMatchArray | null;
      
      // パターン1: 投資信託の基準価格パターン
      priceMatch = html.match(/<span class="number__3BGK">([0-9,]+)<\/span>/);
      if (priceMatch && priceMatch[1]) {
        price = parseFloat(priceMatch[1].replace(/,/g, ''));
        console.log(`パターン1で基準価格を取得: ${price}円`);
      }
      
      // パターン2: 株式の現在値パターン
      if (!price) {
        priceMatch = html.match(/<span class="_3rXVJKdX">([0-9,]+)<\/span>/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
          console.log(`パターン2で基準価格を取得: ${price}円`);
        }
      }
      
      // パターン3: 別の価格表示パターン
      if (!price) {
        priceMatch = html.match(/<span class="price">([0-9,]+)<\/span>/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
          console.log(`パターン3で基準価格を取得: ${price}円`);
        }
      }
      
      // パターン4: StyledNumber__value__3rXWクラスを持つspan要素
      if (!price) {
        priceMatch = html.match(/<span class="StyledNumber__value__3rXW[^"]*">([0-9,]+)<\/span>/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
          console.log(`パターン4で基準価格を取得: ${price}円`);
        }
      }
      
      // どのパターンでも価格が取得できなかった場合
      if (!price) {
        console.log(`${isin}の基準価格データが見つかりませんでした`);
        console.log(`HTML抜粋: ${html.substring(0, 500)}...`);
        return NextResponse.json(
          { error: `${isin}の基準価格データが見つかりませんでした` },
          { status: 404, headers }
        );
      }

      // ファンド名を抽出（複数のパターンを試す）
      let name = `投資信託 ${isin}`;
      let nameMatch = html.match(/<h2 class="name__cj4y">(.+?)<\/h2>/);
      
      if (nameMatch && nameMatch[1]) {
        name = nameMatch[1];
      } else {
        // 別のパターンを試す
        nameMatch = html.match(/<h1 class="_1zPjGMXE">(.+?)<\/h1>/);
        if (nameMatch && nameMatch[1]) {
          name = nameMatch[1];
        } else {
          // PriceBoardMain__name__6uDhクラスを持つh2要素を試す
          nameMatch = html.match(/<h2 class="PriceBoardMain__name__[^"]*">(.+?)<\/h2>/);
          if (nameMatch && nameMatch[1]) {
            name = nameMatch[1];
          }
        }
      }
      
      console.log(`取得したファンド名: ${name}`);

      // 基準日を抽出（複数のパターンを試す）
      let date = new Date();
      let dateMatch = html.match(/<p class="updateDate__r1Qf">(\d{2})\/(\d{2})<\/p>/);
      
      if (!dateMatch) {
        // 別のパターンを試す
        dateMatch = html.match(/(\d{2})\/(\d{2}) 現在/);
      }
      
      if (!dateMatch) {
        // PriceBoardMain__time__2J2Yクラスを持つli要素内のtime要素を試す
        dateMatch = html.match(/<li class="PriceBoardMain__time__[^"]*"><time>(\d{1,2})\/(\d{1,2})<\/time><\/li>/);
      }
      
      if (dateMatch && dateMatch.length >= 3) {
        const month = parseInt(dateMatch[1]) - 1;
        const day = parseInt(dateMatch[2]);
        date = new Date();
        date.setMonth(month);
        date.setDate(day);
        // 年をまたぐ場合の処理（現在が1月で、取得した月が12月の場合は前年とする）
        if (new Date().getMonth() < month) {
          date.setFullYear(date.getFullYear() - 1);
        }
        console.log(`取得した基準日: ${date.toISOString()}`);
      }

      // 純資産総額を抽出（オプション）
      let netAsset: number | undefined = undefined;
      const netAssetMatch = html.match(/<span class="number__3BGK">([0-9,]+)<\/span><\/span><span>百万円<\/span>/);
      if (netAssetMatch && netAssetMatch[1]) {
        netAsset = parseFloat(netAssetMatch[1].replace(/,/g, ''));
        console.log(`取得した純資産総額: ${netAsset}百万円`);
      }

      // 結果オブジェクトを作成
      const fundPrice: FundPrice = {
        isin,
        name,
        price,
        netAsset,
        date,
        currency: 'JPY',
        lastUpdated: new Date()
      };

      // キャッシュに保存
      fundPriceCache.set(isin, { data: fundPrice, timestamp: now });

      // 結果を返す
      return NextResponse.json(fundPrice, { headers });
    } catch (fetchError: unknown) {
      console.error(`Yahoo!ファイナンスからのデータ取得中にエラーが発生しました:`, fetchError);
      
      // キャッシュにデータがある場合は、期限切れでも返す（緊急フォールバック）
      const cachedData = fundPriceCache.get(isin);
      if (cachedData) {
        console.log(`キャッシュ期限切れだが緊急フォールバックとして使用: ${isin}`);
        return NextResponse.json(cachedData.data, { 
          headers: {
            ...headers,
            'X-Cache-Fallback': 'true',
            'X-Cache-Timestamp': cachedData.timestamp.toString()
          } 
        });
      }
      
      throw new Error(`Yahoo!ファイナンスからのデータ取得に失敗しました: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
    }
  } catch (error) {
    console.error(`投資信託情報の取得中にエラーが発生しました:`, error);
    return NextResponse.json(
      { error: `投資信託情報の取得中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500, headers }
    );
  }
} 