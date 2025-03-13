"use client";

import { useState, useEffect } from 'react';
import DataManagement from '@/app/components/DataManagement';
import { dbHelper } from '@/app/lib/db';

export default function SettingsPage() {
  const [stats, setStats] = useState({
    stocks: 0,
    purchases: 0,
    dividends: 0,
    investmentFunds: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [stocks, purchases, dividends, funds] = await Promise.all([
        dbHelper.stocks.findMany(),
        dbHelper.purchases.findMany(),
        dbHelper.dividends.findMany(),
        dbHelper.investmentFunds.findMany()
      ]);

      setStats({
        stocks: stocks.length,
        purchases: purchases.length,
        dividends: dividends.length,
        investmentFunds: funds.length
      });
    };

    fetchStats().catch(console.error);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">設定</h1>
      
      {/* データ統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      </div>

      {/* データ管理 */}
      <DataManagement />
    </div>
  );
} 