"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { dbHelper, Portfolio } from '@/app/lib/db';

export default function PortfolioEditor({ params }: { params: { id: string } }) {
  const router = useRouter();
  const isNew = params.id === 'new';
  const id = isNew ? undefined : parseInt(params.id, 10);

  const [portfolio, setPortfolio] = useState<Portfolio>({
    name: '',
    description: '',
    isDefault: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew && id) {
      fetchPortfolio(id);
    }
  }, [id, isNew]);

  const fetchPortfolio = async (portfolioId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dbHelper.portfolios.findUnique({ where: { id: portfolioId } });
      if (data) {
        setPortfolio(data);
      } else {
        setError('ポートフォリオが見つかりませんでした');
      }
    } catch (err) {
      console.error('ポートフォリオの取得中にエラーが発生しました:', err);
      setError('ポートフォリオの取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setPortfolio(prev => ({ ...prev, [name]: checked }));
    } else {
      setPortfolio(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isNew) {
        await dbHelper.portfolios.create({ data: portfolio });
        setSuccessMessage('ポートフォリオを作成しました');
        // 作成後、一覧画面に戻る
        setTimeout(() => {
          router.push('/settings');
        }, 2000);
      } else if (id) {
        await dbHelper.portfolios.update({ where: { id }, data: portfolio });
        setSuccessMessage('ポートフォリオを更新しました');
      }
    } catch (err) {
      console.error('ポートフォリオの保存中にエラーが発生しました:', err);
      setError('ポートフォリオの保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || isNew) return;
    
    if (!confirm('このポートフォリオを削除してもよろしいですか？この操作は元に戻せません。')) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await dbHelper.portfolios.delete({ where: { id } });
      setSuccessMessage('ポートフォリオを削除しました');
      // 削除後、一覧画面に戻る
      setTimeout(() => {
        router.push('/settings');
      }, 2000);
    } catch (err) {
      console.error('ポートフォリオの削除中にエラーが発生しました:', err);
      setError('ポートフォリオの削除中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
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
              {isNew ? 'ポートフォリオ作成' : 'ポートフォリオ編集'}
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                ポートフォリオ名 *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={portfolio.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                id="description"
                name="description"
                value={portfolio.description || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={portfolio.isDefault || false}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                  デフォルトポートフォリオにする
                </label>
              </div>
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