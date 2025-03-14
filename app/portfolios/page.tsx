"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { dbHelper, Portfolio } from '@/app/lib/db';

const PortfoliosPage: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPortfolioId, setCurrentPortfolioId] = useState<number | null>(null);
  
  // 編集用の状態
  const [isEditing, setIsEditing] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  
  // 新規作成用の状態
  const [isCreating, setIsCreating] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');

  // ポートフォリオの取得
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        setLoading(true);
        const portfoliosData = await dbHelper.portfolios.findMany();
        setPortfolios(portfoliosData);
        
        // 現在選択されているポートフォリオIDを取得
        const storedPortfolioId = localStorage.getItem('currentPortfolioId');
        if (storedPortfolioId) {
          setCurrentPortfolioId(Number(storedPortfolioId));
        }
      } catch (error) {
        console.error('ポートフォリオの取得中にエラーが発生しました:', error);
        toast.error('ポートフォリオの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPortfolios();
  }, []);

  // ポートフォリオの選択
  const selectPortfolio = (id: number) => {
    localStorage.setItem('currentPortfolioId', String(id));
    setCurrentPortfolioId(id);
    toast.success('ポートフォリオを選択しました');
  };

  // ポートフォリオの作成
  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      toast.error('ポートフォリオ名を入力してください');
      return;
    }
    
    try {
      const newPortfolio = await dbHelper.portfolios.create({
        data: {
          name: newPortfolioName,
          description: newPortfolioDescription,
          isDefault: portfolios.length === 0, // 最初のポートフォリオの場合はデフォルトに設定
        }
      });
      
      setPortfolios([...portfolios, newPortfolio]);
      setNewPortfolioName('');
      setNewPortfolioDescription('');
      setIsCreating(false);
      toast.success('ポートフォリオを作成しました');
      
      // 最初のポートフォリオの場合は自動的に選択
      if (portfolios.length === 0) {
        selectPortfolio(newPortfolio.id as number);
      }
    } catch (error) {
      console.error('ポートフォリオの作成中にエラーが発生しました:', error);
      toast.error('ポートフォリオの作成に失敗しました');
    }
  };

  // 編集モードの開始
  const startEditing = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setIsEditing(true);
  };

  // ポートフォリオの更新
  const updatePortfolio = async () => {
    if (!editingPortfolio || !editingPortfolio.name.trim()) {
      toast.error('ポートフォリオ名を入力してください');
      return;
    }
    
    try {
      const updatedPortfolio = await dbHelper.portfolios.update({
        where: { id: editingPortfolio.id as number },
        data: {
          name: editingPortfolio.name,
          description: editingPortfolio.description
        }
      });
      
      setPortfolios(portfolios.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));
      setIsEditing(false);
      setEditingPortfolio(null);
      toast.success('ポートフォリオを更新しました');
    } catch (error) {
      console.error('ポートフォリオの更新中にエラーが発生しました:', error);
      toast.error('ポートフォリオの更新に失敗しました');
    }
  };

  // ポートフォリオの削除
  const deletePortfolio = async (id: number) => {
    // 確認ダイアログ
    if (!window.confirm('このポートフォリオを削除してもよろしいですか？関連するすべてのデータも削除されます。')) {
      return;
    }
    
    try {
      await dbHelper.portfolios.delete({ where: { id } });
      
      // 現在選択中のポートフォリオが削除された場合
      if (currentPortfolioId === id) {
        const remainingPortfolios = portfolios.filter(p => p.id !== id);
        if (remainingPortfolios.length > 0) {
          // 他のポートフォリオがある場合は最初のものを選択
          selectPortfolio(remainingPortfolios[0].id as number);
        } else {
          // 他のポートフォリオがない場合はnullに設定
          localStorage.removeItem('currentPortfolioId');
          setCurrentPortfolioId(null);
        }
      }
      
      setPortfolios(portfolios.filter(p => p.id !== id));
      toast.success('ポートフォリオを削除しました');
    } catch (error) {
      console.error('ポートフォリオの削除中にエラーが発生しました:', error);
      toast.error('ポートフォリオの削除に失敗しました');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">ポートフォリオ管理</h1>
        <Link
          href="/settings"
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          設定に戻る
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6">
          {/* ポートフォリオリスト */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">ポートフォリオ一覧</h2>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                新規作成
              </button>
            </div>

            {portfolios.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">ポートフォリオがありません。新しいポートフォリオを作成してください。</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">説明</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {portfolios.map((portfolio) => (
                      <tr key={portfolio.id} className={currentPortfolioId === portfolio.id ? 'bg-indigo-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{portfolio.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-500">{portfolio.description || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {currentPortfolioId === portfolio.id ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              選択中
                            </span>
                          ) : (
                            <button
                              onClick={() => selectPortfolio(portfolio.id as number)}
                              className="text-indigo-600 hover:text-indigo-900 text-sm"
                            >
                              選択する
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => startEditing(portfolio)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => deletePortfolio(portfolio.id as number)}
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 新規作成フォーム */}
          {isCreating && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">新しいポートフォリオを作成</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    ポートフォリオ名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="ポートフォリオ名を入力"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    説明
                  </label>
                  <textarea
                    id="description"
                    value={newPortfolioDescription}
                    onChange={(e) => setNewPortfolioDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="説明を入力（任意）"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={createPortfolio}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    作成
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 編集フォーム */}
          {isEditing && editingPortfolio && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">ポートフォリオを編集</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                    ポートフォリオ名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    value={editingPortfolio.name}
                    onChange={(e) => setEditingPortfolio({ ...editingPortfolio, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                    説明
                  </label>
                  <textarea
                    id="edit-description"
                    value={editingPortfolio.description || ''}
                    onChange={(e) => setEditingPortfolio({ ...editingPortfolio, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditingPortfolio(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={updatePortfolio}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    更新
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortfoliosPage; 