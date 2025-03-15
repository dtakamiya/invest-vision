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
      <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">設定</h1>
      
      {/* データ統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        <div className="glass hover-lift p-6 rounded-xl">
          <h3 className="text-sm font-medium text-gray-500 mb-2">登録銘柄数</h3>
          <p className="text-3xl font-bold text-indigo-600">{stats.stocks}</p>
        </div>
        <div className="glass hover-lift p-6 rounded-xl">
          <h3 className="text-sm font-medium text-gray-500 mb-2">購入記録数</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.purchases}</p>
        </div>
        <div className="glass hover-lift p-6 rounded-xl">
          <h3 className="text-sm font-medium text-gray-500 mb-2">配当記録数</h3>
          <p className="text-3xl font-bold text-green-600">{stats.dividends}</p>
        </div>
        <div className="glass hover-lift p-6 rounded-xl">
          <h3 className="text-sm font-medium text-gray-500 mb-2">投資資金記録数</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.investmentFunds}</p>
        </div>
        <div className="glass hover-lift p-6 rounded-xl">
          <h3 className="text-sm font-medium text-gray-500 mb-2">ポートフォリオ数</h3>
          <p className="text-3xl font-bold text-amber-600">{stats.portfolios}</p>
        </div>
      </div>

      {/* ポートフォリオ管理 */}
      <div className="neumorphic p-8 mb-10">
        <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">ポートフォリオ管理</h2>
        <p className="text-gray-600 mb-6">
          複数のポートフォリオを作成して、投資を分けて管理することができます。
          各ポートフォリオには、銘柄、購入記録、配当金記録、投資資金を関連付けることができます。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/portfolios"
            className="gradient-btn hover-scale inline-flex items-center"
          >
            ポートフォリオ管理へ
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>

      {/* データ管理 */}
      <div className="card-3d mb-10">
        <div className="card-3d-content">
          <DataManagement />
        </div>
      </div>

      {/* データベース編集 */}
      <div className="mt-10">
        <DbEditor />
      </div>
    </div>
  );
} 