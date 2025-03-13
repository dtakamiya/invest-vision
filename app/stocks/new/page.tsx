"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { dbHelper, Country } from "@/app/lib/db";

export default function NewStockPage() {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState<Country>("日本");
  const [initialPurchaseDate, setInitialPurchaseDate] = useState("");
  const [initialQuantity, setInitialQuantity] = useState("");
  const [initialPrice, setInitialPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // バリデーション
      if (!symbol || !name) {
        alert("銘柄コードと銘柄名は必須です");
        setIsSubmitting(false);
        return;
      }

      // IndexedDBに保存
      await dbHelper.stocks.create({
        data: {
          symbol,
          name,
          country,
          initialPurchaseDate: initialPurchaseDate ? new Date(initialPurchaseDate) : undefined,
          initialQuantity: initialQuantity ? parseInt(initialQuantity) : undefined,
          initialPrice: initialPrice ? parseFloat(initialPrice) : undefined,
        }
      });

      // 初期購入情報が入力されている場合は購入記録も作成
      if (initialPurchaseDate && initialQuantity && initialPrice) {
        try {
          // 作成した銘柄のIDを取得
          const stocks = await dbHelper.stocks.findMany({
            orderBy: { createdAt: 'desc' }
          });
          
          if (stocks.length > 0) {
            const stockId = stocks[0].id;
            
            // 購入記録を作成
            await dbHelper.purchases.create({
              data: {
                stockId: stockId as number,
                quantity: parseInt(initialQuantity),
                price: parseFloat(initialPrice),
                fee: 0, // デフォルトの手数料は0円
                purchaseDate: new Date(initialPurchaseDate),
                notes: "銘柄登録時の初期購入記録",
              }
            });
          }
        } catch (error) {
          console.error("初期購入記録の作成中にエラーが発生しました:", error);
          // 銘柄の登録自体は成功しているので、エラーは表示するだけ
        }
      }

      // 成功したら銘柄一覧ページにリダイレクト
      router.push("/stocks");
    } catch (error) {
      console.error("銘柄の作成中にエラーが発生しました:", error);
      alert("銘柄の作成中にエラーが発生しました");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">新しい銘柄を追加</h1>
        <Link
          href="/stocks"
          className="text-blue-600 hover:underline"
        >
          ← 銘柄一覧に戻る
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">基本情報</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-1">
                  銘柄コード
                </label>
                <input
                  type="text"
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 7203"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  銘柄名
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: トヨタ自動車"
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  投資国
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value as Country)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="日本">日本</option>
                  <option value="米国">米国</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">初期購入情報（任意）</h2>
            <p className="text-sm text-gray-500 mb-4">
              初期購入情報を入力すると、購入記録も自動的に作成されます。
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="initialPurchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
                  購入日
                </label>
                <input
                  type="date"
                  id="initialPurchaseDate"
                  value={initialPurchaseDate}
                  onChange={(e) => setInitialPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="initialQuantity" className="block text-sm font-medium text-gray-700 mb-1">
                  購入数量（株）
                </label>
                <input
                  type="number"
                  id="initialQuantity"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                  min="1"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 100"
                />
              </div>

              <div>
                <label htmlFor="initialPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  購入単価（円）
                </label>
                <input
                  type="number"
                  id="initialPrice"
                  value={initialPrice}
                  onChange={(e) => setInitialPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 3500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Link
              href="/stocks"
              className="btn btn-outline btn-md"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn btn-primary btn-md ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 