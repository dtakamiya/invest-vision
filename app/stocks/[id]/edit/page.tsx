"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stock, Country } from '@/app/lib/db';
import { openDB } from '@/app/lib/db';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function EditStockPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [stock, setStock] = useState<Stock | null>(null);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState<Country>("日本");
  const [assetType, setAssetType] = useState<'stock' | 'fund'>('stock');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const stockId = parseInt(params.id);
        const stockData = await openDB().then(db => {
          const transaction = db.transaction(['stocks'], 'readonly');
          const store = transaction.objectStore('stocks');
          const request = store.get(stockId);

          request.onsuccess = () => {
            const data = request.result;
            if (!data) {
              throw new Error('銘柄が見つかりません');
            }
            if (data.initialPurchaseDate) {
              data.initialPurchaseDate = new Date(data.initialPurchaseDate);
            }
            setStock(data);
            setSymbol(data.symbol);
            setName(data.name);
            setCountry(data.country);
            setAssetType(data.assetType || 'stock');
            setIsLoading(false);
          };

          request.onerror = () => {
            throw new Error('銘柄情報の取得に失敗しました');
          };
        });
      } catch (error) {
        console.error("銘柄の取得中にエラーが発生しました:", error);
        toast.error("銘柄の取得中にエラーが発生しました");
        setIsLoading(false);
      }
    };

    fetchStock();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!symbol || !name) {
        toast.error("銘柄コードと銘柄名は必須です");
        setIsSubmitting(false);
        return;
      }

      if (!stock) {
        toast.error("銘柄データが見つかりません");
        setIsSubmitting(false);
        return;
      }

      const db = await openDB();
      const transaction = db.transaction(['stocks'], 'readwrite');
      const store = transaction.objectStore('stocks');
      const getRequest = store.get(parseInt(params.id));

      getRequest.onsuccess = () => {
        const existingData = getRequest.result;
        if (!existingData) {
          throw new Error('銘柄が見つかりません');
        }

        const updatedData = {
          ...existingData,
          symbol,
          name,
          country,
          assetType,
          updatedAt: new Date(),
        };

        const updateRequest = store.put(updatedData);

        updateRequest.onsuccess = () => {
          toast.success("銘柄を更新しました");
          router.push('/stocks');
          router.refresh();
        };

        updateRequest.onerror = () => {
          throw new Error('銘柄情報の更新に失敗しました');
        };
      };

      getRequest.onerror = () => {
        throw new Error('銘柄情報の取得に失敗しました');
      };

      db.close();
    } catch (error) {
      console.error("銘柄の更新中にエラーが発生しました:", error);
      toast.error("銘柄の更新中にエラーが発生しました");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
        銘柄が見つかりません
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">銘柄を編集</h1>
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