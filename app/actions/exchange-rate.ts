'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';

export async function updateExchangeRateManually() {
  try {
    // 特定のタグを再検証
    revalidateTag('exchange-rate');
    
    // リクエストヘッダーからホスト情報を取得
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    
    // 絶対URLを構築
    const baseUrl = `${protocol}://${host}`;
    console.log('Server Action: 使用するベースURL:', baseUrl);
    
    // 為替レートを取得
    const response = await fetch(`${baseUrl}/api/exchange-rate?manual=true`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server Action: 為替レートの取得に失敗しました: ${response.status} ${response.statusText}`);
      console.error(`Server Action: エラー詳細: ${errorText}`);
      throw new Error(`為替レートの取得に失敗しました: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Server Action: 取得した為替レート:', data);
    
    return {
      success: true,
      rate: data.rate,
      lastUpdated: new Date(data.lastUpdated)
    };
  } catch (error) {
    console.error('Server Action: 為替レートの更新に失敗しました:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '為替レートの更新に失敗しました'
    };
  }
} 