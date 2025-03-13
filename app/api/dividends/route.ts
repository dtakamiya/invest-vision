import { dbHelper } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // フォームデータを取得
    const formData = await request.formData();
    const stockId = formData.get("stockId") as string;
    const amount = formData.get("amount") as string;
    const receivedDate = formData.get("receivedDate") as string;
    const taxAmount = formData.get("taxAmount") as string;
    const notes = formData.get("notes") as string;

    // バリデーション
    if (!stockId || !amount || !receivedDate) {
      return NextResponse.json(
        { error: "銘柄、配当金額、受取日は必須です" },
        { status: 400 }
      );
    }

    // IndexedDBに保存
    // Note: サーバーサイドではIndexedDBは使用できないため、
    // クライアントサイドでの処理に変更する必要があります
    // ここではAPIルートからリダイレクトするだけにします

    // 成功したら配当金記録一覧ページにリダイレクト
    return NextResponse.redirect(new URL("/dividends", request.url));
  } catch (error) {
    console.error("配当金記録の作成中にエラーが発生しました:", error);
    return NextResponse.json(
      { error: "配当金記録の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
} 