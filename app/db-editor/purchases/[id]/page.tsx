"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { dbHelper, Purchase, Stock, Portfolio } from '@/app/lib/db';

export default function PurchaseEditor({ params }: { params: { id: string } }) {
  const router = useRouter();
  const isNew = params.id === 'new';
  const id = isNew ? undefined : parseInt(params.id, 10);

  const [purchase, setPurchase] = useState<Purchase>({
    stockId: 0,
    quantity: 0,
    price: 0,
    fee: 0,
    purchaseDate: new Date(),
    notes: '',
    portfolioId: undefined
  });
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchStocks();
    fetchPortfolios();
    if (!isNew && id) {
      fetchPurchase(id);
    }
  }, [id, isNew]);

  const fetchStocks = async () => {
    try {
      const data = await dbHelper.stocks.findMany();
      setStocks(data);
    } catch (err) {
      console.error('銘柄の取得中にエラーが発生しました:', err);
    }
  };

  const fetchPortfolios = async () => {
    try {
      const data = await dbHelper.portfolios.findMany();
      setPortfolios(data);
    } catch (err) {
      console.error('ポートフォリオの取得中にエラーが発生しました:', err);
    }
  };

  const fetchPurchase = async (purchaseId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dbHelper.purchases.findUnique({ where: { id: purchaseId } });
      if (data) {
        setPurchase(data);
      } else {
        setError('購入記録が見つかりませんでした');
      }
    } catch (err) {
      console.error('購入記録の取得中にエラーが発生しました:', err);
      setError('購入記録の取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'stockId' || name === 'portfolioId') {
      setPurchase(prev => ({ 
        ...prev, 
        [name]: value ? parseInt(value, 10) : undefined 
      }));
    } else if (type === 'number') {
      setPurchase(prev => ({ 
        ...prev, 
        [name]: value ? parseFloat(value) : 0
      }));
    } else if (type === 'date') {
      setPurchase(prev => ({ 
        ...prev, 
        [name]: value ? new Date(value) : new Date()
      }));
    } else {
      setPurchase(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isNew) {
        await dbHelper.purchases.create({ data: purchase });
        setSuccessMessage('購入記録を作成しました');
        // 作成後、一覧画面に戻る
        setTimeout(() => {
          router.push('/settings');
        }, 2000);
      } else if (id) {
        await dbHelper.purchases.update({ where: { id }, data: purchase });
        setSuccessMessage('購入記録を更新しました');
      }
    } catch (err) {
      console.error('購入記録の保存中にエラーが発生しました:', err);
      setError('購入記録の保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || isNew) return;
    
    if (!confirm('この購入記録を削除してもよろしいですか？この操作は元に戻せません。')) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await dbHelper.purchases.delete({ where: { id } });
      setSuccessMessage('購入記録を削除しました');
      // 削除後、一覧画面に戻る
      setTimeout(() => {
        router.push('/settings');
      }, 2000);
    } catch (err) {
      console.error('購入記録の削除中にエラーが発生しました:', err);
      setError('購入記録の削除中にエラーが発生しました');
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
              {isNew ? '購入記録作成' : '購入記録編集'}
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
              <label htmlFor="stockId" className="block text-sm font-medium text-gray-700 mb-1">
                銘柄 *
              </label>
              <select
                id="stockId"
                name="stockId"
                value={purchase.stockId || ''}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">選択してください</option>
                {stocks.map(stock => (
                  <option key={stock.id} value={stock.id}>
                    {stock.symbol} - {stock.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="portfolioId" className="block text-sm font-medium text-gray-700 mb-1">
                ポートフォリオ
              </label>
              <select
                id="portfolioId"
                name="portfolioId"
                value={purchase.portfolioId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">選択してください</option>
                {portfolios.map(portfolio => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name} {portfolio.isDefault ? '(デフォルト)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                数量 *
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={purchase.quantity}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                価格 *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={purchase.price}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="fee" className="block text-sm font-medium text-gray-700 mb-1">
                手数料
              </label>
              <input
                type="number"
                id="fee"
                name="fee"
                value={purchase.fee}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
                購入日 *
              </label>
              <input
                type="date"
                id="purchaseDate"
                name="purchaseDate"
                value={formatDateForInput(purchase.purchaseDate)}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                メモ
              </label>
              <textarea
                id="notes"
                name="notes"
                value={purchase.notes || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-between">
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