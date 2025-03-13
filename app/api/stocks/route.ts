import { dbHelper } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // フォームデータを取得
    const formData = await request.formData();
    const symbol = formData.get("symbol") as string;
    const name = formData.get("name") as string;

    // バリデーション
    if (!symbol || !name) {
      return NextResponse.json(
        { error: "銘柄コードと銘柄名は必須です" },
        { status: 400 }
      );
    }

    // IndexedDBに保存
    // Note: サーバーサイドではIndexedDBは使用できないため、
    // クライアントサイドでの処理に変更する必要があります
    // ここではAPIルートからリダイレクトするだけにします
    
    // 成功したら銘柄一覧ページにリダイレクト
    return NextResponse.redirect(new URL("/stocks", request.url));
  } catch (error) {
    console.error("銘柄の作成中にエラーが発生しました:", error);
    return NextResponse.json(
      { error: "銘柄の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
} 