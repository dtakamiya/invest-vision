import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function GET(request: NextRequest) {
  try {
    // exchange-rateタグを持つすべてのデータを再検証
    revalidateTag('exchange-rate');
    
    return NextResponse.json({
      revalidated: true,
      message: '為替レートのキャッシュを再検証しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      revalidated: false,
      message: '再検証に失敗しました',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 