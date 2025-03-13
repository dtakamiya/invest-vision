"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stock, Country } from '@/app/lib/db';
import { openDB } from '@/app/lib/db';

export default function EditStockPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const db = await openDB();
        const transaction = db.transaction(['stocks'], 'readonly');
        const store = transaction.objectStore('stocks');
        const request = store.get(parseInt(params.id));

        request.onsuccess = () => {
          const data = request.result;
          if (!data) {
            throw new Error('銘柄が見つかりません');
          }
          if (data.initialPurchaseDate) {
            data.initialPurchaseDate = new Date(data.initialPurchaseDate);
          }
          setStock(data);
          setLoading(false);
        };

        request.onerror = () => {
          throw new Error('銘柄情報の取得に失敗しました');
        };

        db.close();
      } catch (error) {
        setError(error instanceof Error ? error.message : '銘柄情報の取得に失敗しました');
        setLoading(false);
      }
    };

    fetchStock();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        symbol: formData.get('symbol') as string,
        name: formData.get('name') as string,
        country: formData.get('country') as Country,
        initialPrice: formData.get('initialPrice') as string,
        initialQuantity: formData.get('initialQuantity') as string,
        initialPurchaseDate: formData.get('initialPurchaseDate') as string,
      };

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
          symbol: data.symbol,
          name: data.name,
          country: data.country,
          initialPrice: data.initialPrice ? parseFloat(data.initialPrice) : undefined,
          initialQuantity: data.initialQuantity ? parseInt(data.initialQuantity) : undefined,
          initialPurchaseDate: data.initialPurchaseDate ? new Date(data.initialPurchaseDate) : undefined,
          updatedAt: new Date(),
        };

        const updateRequest = store.put(updatedData);

        updateRequest.onsuccess = () => {
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
      setError(error instanceof Error ? error.message : '銘柄情報の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
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
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-white">銘柄情報の編集</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
              銘柄コード
            </label>
            <input
              type="text"
              name="symbol"
              id="symbol"
              defaultValue={stock.symbol}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              銘柄名
            </label>
            <input
              type="text"
              name="name"
              id="name"
              defaultValue={stock.name}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              投資国
            </label>
            <select
              name="country"
              id="country"
              defaultValue={stock.country}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="日本">日本</option>
              <option value="米国">米国</option>
            </select>
          </div>

          <div>
            <label htmlFor="initialPrice" className="block text-sm font-medium text-gray-700">
              初期購入単価
            </label>
            <input
              type="number"
              name="initialPrice"
              id="initialPrice"
              defaultValue={stock.initialPrice?.toString() || ''}
              step="0.01"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="initialQuantity" className="block text-sm font-medium text-gray-700">
              初期購入数量
            </label>
            <input
              type="number"
              name="initialQuantity"
              id="initialQuantity"
              defaultValue={stock.initialQuantity?.toString() || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="initialPurchaseDate" className="block text-sm font-medium text-gray-700">
              初期購入日
            </label>
            <input
              type="date"
              name="initialPurchaseDate"
              id="initialPurchaseDate"
              defaultValue={stock.initialPurchaseDate ? stock.initialPurchaseDate.toISOString().split('T')[0] : ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
} 