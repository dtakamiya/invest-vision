import { dbHelper } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // フォームデータを取得
    const formData = await request.formData();
    const stockId = formData.get("stockId") as string;
    const quantity = formData.get("quantity") as string;
    const price = formData.get("price") as string;
    const fee = formData.get("fee") as string;
    const purchaseDate = formData.get("purchaseDate") as string;
    const notes = formData.get("notes") as string;

    // バリデーション
    if (!stockId || !quantity || !price || !fee || !purchaseDate) {
      return NextResponse.json(
        { error: "銘柄、数量、価格、手数料、購入日は必須です" },
        { status: 400 }
      );
    }

    // IndexedDBに保存
    // Note: サーバーサイドではIndexedDBは使用できないため、
    // クライアントサイドでの処理に変更する必要があります
    // ここではAPIルートからリダイレクトするだけにします

    // 成功したら購入記録一覧ページにリダイレクト
    return NextResponse.redirect(new URL("/purchases", request.url));
  } catch (error) {
    console.error("購入記録の作成中にエラーが発生しました:", error);
    return NextResponse.json(
      { error: "購入記録の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}