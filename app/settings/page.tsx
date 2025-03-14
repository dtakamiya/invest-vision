"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DataManagement from '@/app/components/DataManagement';
import DbEditor from '@/app/components/DbEditor';
import { dbHelper } from '@/app/lib/db';

export default function SettingsPage() {
  const [stats, setStats] = useState({
    stocks: 0,
    purchases: 0,
    dividends: 0,
    investmentFunds: 0,
    portfolios: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [stocks, purchases, dividends, funds, portfolios] = await Promise.all([
        dbHelper.stocks.findMany(),
        dbHelper.purchases.findMany(),
        dbHelper.dividends.findMany(),
        dbHelper.investmentFunds.findMany(),
        dbHelper.portfolios.findMany()
      ]);

      setStats({
        stocks: stocks.length,
        purchases: purchases.length,
        dividends: dividends.length,
        investmentFunds: funds.length,
        portfolios: portfolios.length
      });
    };

    fetchStats().catch(console.error);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">設定</h1>
      
      {/* データ統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">登録銘柄数</h3>
          <p className="text-2xl font-semibold">{stats.stocks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">購入記録数</h3>
          <p className="text-2xl font-semibold">{stats.purchases}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">配当記録数</h3>
          <p className="text-2xl font-semibold">{stats.dividends}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">投資資金記録数</h3>
          <p className="text-2xl font-semibold">{stats.investmentFunds}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">ポートフォリオ数</h3>
          <p className="text-2xl font-semibold">{stats.portfolios}</p>
        </div>
      </div>

      {/* ポートフォリオ管理 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">ポートフォリオ管理</h2>
        <p className="text-gray-600 mb-4">
          複数のポートフォリオを作成して、投資を分けて管理することができます。
          各ポートフォリオには、銘柄、購入記録、配当金記録、投資資金を関連付けることができます。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/portfolios"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ポートフォリオ管理へ
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link
            href="/set-default-portfolio"
            className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            デフォルトポートフォリオ設定
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link
            href="/update-purchases-portfolio"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            購入記録ポートフォリオID一括更新
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link
            href="/update-dividends-portfolio"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            配当記録ポートフォリオID一括更新
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link
            href="/update-funds-portfolio"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            投資資金ポートフォリオID一括更新
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>

      {/* データ管理 */}
      <DataManagement />

      {/* データベース編集 */}
      <div className="mt-8">
        <DbEditor />
      </div>
    </div>
  );
} 