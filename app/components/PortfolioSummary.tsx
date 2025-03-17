'use client';

import { useState } from 'react';
import { Stock } from '@/app/lib/db/types';
import { StockPrice } from '@/app/lib/stockApi';
import { InvestmentFund } from '@/app/lib/db/types';
import { 
  calculateTotalValueByCountry,
  calculateRebalanceSuggestion,
  calculateInvestmentReturn,
  formatCurrency,
  formatPercent
} from '@/app/utils/calculations';

interface PortfolioSummaryProps {
  loadingPrices: boolean;
  totalFunds: number;
  totalInvestment: number;
  stocks: Stock[];
  stockPrices: Map<string, StockPrice>;
  stockQuantities: Map<string, number>;
  investmentFunds: InvestmentFund[];
  usdToJpy: number;
  lastPriceUpdate: number | null;
  updateExchangeRateManually: () => Promise<{ success: boolean; error?: string }>;
  fetchPriceData: (forceUpdate?: boolean) => Promise<void>;
}

export default function PortfolioSummary({
  loadingPrices,
  totalFunds,
  totalInvestment,
  stocks,
  stockPrices,
  stockQuantities,
  investmentFunds,
  usdToJpy,
  lastPriceUpdate,
  updateExchangeRateManually,
  fetchPriceData
}: PortfolioSummaryProps) {
  const [updatingRate, setUpdatingRate] = useState(false);

  // 登録されている株式数
  const registeredStocksCount = stocks.length;
  
  // 株価が取得できている株式数
  const stocksWithPricesCount = Array.from(stockPrices.keys()).length;
  
  // 国別の総投資額を計算
  const totalsByCountry = calculateTotalValueByCountry(
    stocks,
    stockPrices,
    stockQuantities,
    usdToJpy
  );
  
  // 総資産額
  const totalValue = totalsByCountry.japan + totalsByCountry.us;
  
  // 投資収益率
  const investmentReturn = calculateInvestmentReturn(totalValue, totalInvestment);
  
  // リバランス提案
  const rebalanceSuggestion = calculateRebalanceSuggestion(totalsByCountry);

  // 為替レート更新ハンドラー
  const handleUpdateExchangeRate = async () => {
    setUpdatingRate(true);
    try {
      const result = await updateExchangeRateManually();
      if (result.success) {
        alert('為替レートを更新しました');
      } else {
        alert(`為替レートの更新に失敗しました: ${result.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('為替レート更新中にエラーが発生しました:', error);
      alert('為替レートの更新中にエラーが発生しました');
    } finally {
      setUpdatingRate(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">ポートフォリオの概要</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => fetchPriceData(true)}
            disabled={loadingPrices}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
          >
            {loadingPrices ? '更新中...' : '株価を更新'}
          </button>
          <button
            onClick={handleUpdateExchangeRate}
            disabled={updatingRate}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-green-300 transition-colors"
          >
            {updatingRate ? '更新中...' : '為替レートを更新'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">登録銘柄数</h3>
          <p className="text-2xl font-bold">{registeredStocksCount}銘柄</p>
          <p className="text-xs text-gray-500">{stocksWithPricesCount}銘柄の株価情報があります</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">総投資額</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(totalInvestment)}
          </p>
          <p className="text-xs text-gray-500">投資信託を含む</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">総資産額</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(totalValue)}
          </p>
          <p className={`text-xs ${investmentReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercent(investmentReturn)} ({new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(totalValue - totalInvestment)})
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">USD/JPY</h3>
          <p className="text-2xl font-bold">{usdToJpy.toFixed(2)}</p>
          <p className="text-xs text-gray-500">
            {lastPriceUpdate 
              ? `最終更新: ${new Date(lastPriceUpdate).toLocaleString('ja-JP')}` 
              : '未更新'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded shadow-sm">
          <h3 className="text-lg font-semibold mb-2">日本株投資額</h3>
          <p className="text-2xl font-bold mb-1">
            {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(totalsByCountry.japan)}
          </p>
          <p className="text-sm text-gray-600">
            割合: {formatPercent(rebalanceSuggestion.jpPercent)}
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded shadow-sm">
          <h3 className="text-lg font-semibold mb-2">米国株投資額(円換算)</h3>
          <p className="text-2xl font-bold mb-1">
            {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(totalsByCountry.us)}
          </p>
          <p className="text-sm text-gray-600">
            割合: {formatPercent(rebalanceSuggestion.usPercent)}
          </p>
        </div>
      </div>

      {rebalanceSuggestion.suggestedCountry && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">投資アドバイス</h3>
          <p className="text-sm text-blue-700">
            ポートフォリオのバランスを改善するために、次の投資では
            <span className="font-bold">
              {rebalanceSuggestion.suggestedCountry === 'japan' ? '日本株' : '米国株'}
            </span>
            への投資を検討しましょう。
          </p>
          <p className="text-xs text-blue-600 mt-1">
            現在の日本株と米国株の比率差: {formatPercent(rebalanceSuggestion.difference)}
          </p>
        </div>
      )}

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-2">投資資金の動き</h3>
        {investmentFunds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">種類</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">説明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {investmentFunds.slice(0, 5).map((fund) => (
                  <tr key={fund.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {new Date(fund.date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {fund.type === 'deposit' ? '入金' : '出金'}
                    </td>
                    <td className={`px-4 py-2 whitespace-nowrap text-sm ${
                      fund.type === 'deposit' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {fund.type === 'deposit' ? '+' : '-'}{formatCurrency(fund.amount)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {fund.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">資金の入出金記録がありません</p>
        )}
      </div>
    </div>
  );
} 