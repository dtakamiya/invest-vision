'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateExchangeRateManually() {
  try {
    // 特定のタグを再検証
    revalidateTag('exchange-rate');
    
    // 為替レートを取得
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/exchange-rate?manual=true`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`為替レートの取得に失敗しました: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      rate: data.rate,
      lastUpdated: new Date(data.lastUpdated)
    };
  } catch (error) {
    console.error('為替レートの更新に失敗しました:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '為替レートの更新に失敗しました'
    };
  }
} 