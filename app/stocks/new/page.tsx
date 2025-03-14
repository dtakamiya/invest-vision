"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { dbHelper, Country } from "@/app/lib/db";

export default function NewStockPage() {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState<Country>("日本");
  const [assetType, setAssetType] = useState<'stock' | 'fund'>('stock');
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
          assetType,
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">新しい銘柄を追加</h1>
        <Link
          href="/stocks"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          キャンセル
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-1">
                銘柄コード <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="例: 7203（トヨタ）、AAPL（アップル）"
                required
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                銘柄名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="例: トヨタ自動車、Apple Inc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                投資国 <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="country"
                    value="日本"
                    checked={country === "日本"}
                    onChange={() => setCountry("日本")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700">日本</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="country"
                    value="米国"
                    checked={country === "米国"}
                    onChange={() => setCountry("米国")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700">米国</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                資産タイプ <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="assetType"
                    value="stock"
                    checked={assetType === "stock"}
                    onChange={() => setAssetType("stock")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700">株式</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="assetType"
                    value="fund"
                    checked={assetType === "fund"}
                    onChange={() => setAssetType("fund")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700">投資信託</span>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h2 className="text-lg font-medium text-gray-800 mb-4">初期購入情報（任意）</h2>
            <p className="text-sm text-gray-500 mb-4">
              初期購入情報を入力すると、購入記録が自動的に作成されます。
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 