import { NextRequest, NextResponse } from 'next/server';
import { dbHelper } from '@/app/lib/db';

type Params = {
  params: {
    id: string;
  };
};

export async function PUT(
  request: NextRequest,
  { params }: Params
) {
  try {
    const data = await request.json();
    const id = parseInt(params.id);

    // 必須フィールドの検証
    if (!data.symbol || !data.name) {
      return NextResponse.json(
        { error: '銘柄コードと銘柄名は必須です' },
        { status: 400 }
      );
    }

    // 銘柄情報の更新
    const updatedStock = await dbHelper.stocks.update({
      where: { id },
      data: {
        symbol: data.symbol,
        name: data.name,
        initialPrice: data.initialPrice ? parseFloat(data.initialPrice) : undefined,
        initialQuantity: data.initialQuantity ? parseInt(data.initialQuantity) : undefined,
        initialPurchaseDate: data.initialPurchaseDate ? new Date(data.initialPurchaseDate) : undefined,
      },
    });

    return NextResponse.json(updatedStock);
  } catch (error) {
    console.error('銘柄情報の更新中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: '銘柄情報の更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const id = parseInt(params.id);

    // 銘柄情報の取得
    const stock = await dbHelper.stocks.findUnique({
      where: { id },
    });

    if (!stock) {
      return NextResponse.json(
        { error: '指定された銘柄が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(stock);
  } catch (error) {
    console.error('銘柄情報の取得中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: '銘柄情報の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 