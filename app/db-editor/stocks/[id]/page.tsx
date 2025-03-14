"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { dbHelper, Stock, Country } from '@/app/lib/db';

export default function StockEditor({ params }: { params: { id: string } }) {
  const router = useRouter();
  const isNew = params.id === 'new';
  const id = isNew ? undefined : parseInt(params.id, 10);

  const [stock, setStock] = useState<Stock>({
    symbol: '',
    name: '',
    country: '日本',
    assetType: 'stock'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew && id) {
      fetchStock(id);
    }
  }, [id, isNew]);

  const fetchStock = async (stockId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dbHelper.stocks.findUnique({ where: { id: stockId } });
      if (data) {
        setStock(data);
      } else {
        setError('銘柄が見つかりませんでした');
      }
    } catch (err) {
      console.error('銘柄の取得中にエラーが発生しました:', err);
      setError('銘柄の取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'country') {
      setStock(prev => ({ 
        ...prev, 
        [name]: value as Country
      }));
    } else if (type === 'number') {
      setStock(prev => ({ 
        ...prev, 
        [name]: value ? parseFloat(value) : undefined 
      }));
    } else if (type === 'date') {
      setStock(prev => ({ 
        ...prev, 
        [name]: value ? new Date(value) : undefined 
      }));
    } else {
      setStock(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isNew) {
        await dbHelper.stocks.create({ data: stock });
        setSuccessMessage('銘柄を作成しました');
        // 作成後、一覧画面に戻る
        setTimeout(() => {
          router.push('/settings');
        }, 2000);
      } else if (id) {
        await dbHelper.stocks.update({ where: { id }, data: stock });
        setSuccessMessage('銘柄を更新しました');
      }
    } catch (err) {
      console.error('銘柄の保存中にエラーが発生しました:', err);
      setError('銘柄の保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || isNew) return;
    
    if (!confirm('この銘柄を削除してもよろしいですか？この操作は元に戻せません。')) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await dbHelper.stocks.delete({ where: { id } });
      setSuccessMessage('銘柄を削除しました');
      // 削除後、一覧画面に戻る
      setTimeout(() => {
        router.push('/settings');
      }, 2000);
    } catch (err) {
      console.error('銘柄の削除中にエラーが発生しました:', err);
      setError('銘柄の削除中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // 日付をHTML input[type="date"]用にフォーマット
  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-4">データを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? '銘柄作成' : '銘柄編集'}
            </h1>
            <Link
              href="/settings"
              className="text-gray-600 hover:text-gray-900"
            >
              ← 設定に戻る
            </Link>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">エラー!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">成功!</strong>
              <span className="block sm:inline"> {successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-1">
                シンボル *
              </label>
              <input
                type="text"
                id="symbol"
                name="symbol"
                value={stock.symbol}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                銘柄名 *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={stock.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                国 *
              </label>
              <select
                id="country"
                name="country"
                value={stock.country}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="日本">日本</option>
                <option value="米国">米国</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="initialPurchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
                初期購入日
              </label>
              <input
                type="date"
                id="initialPurchaseDate"
                name="initialPurchaseDate"
                value={formatDateForInput(stock.initialPurchaseDate)}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="initialQuantity" className="block text-sm font-medium text-gray-700 mb-1">
                初期購入数量
              </label>
              <input
                type="number"
                id="initialQuantity"
                name="initialQuantity"
                value={stock.initialQuantity || ''}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="initialPrice" className="block text-sm font-medium text-gray-700 mb-1">
                初期購入単価
              </label>
              <input
                type="number"
                id="initialPrice"
                name="initialPrice"
                value={stock.initialPrice || ''}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-between mt-8">
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {saving ? '保存中...' : isNew ? '作成' : '更新'}
              </button>

              {!isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    saving
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  削除
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 