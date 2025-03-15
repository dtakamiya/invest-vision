"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { openDB, dbHelper, Stock, Purchase, Portfolio } from "@/app/lib/db";
import { StockPrice, fetchMultipleStockPrices } from "@/app/lib/stockApi";
import { fetchUSDJPYRate } from "@/app/lib/exchangeApi";
import { toast } from 'react-hot-toast';

interface Fund {
  id: number;
  amount: number;
  date: Date;
  notes?: string;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [totalFunds, setTotalFunds] = useState(0);
  const [totalInvestment, setTotalInvestment] = useState(0);
  const [totalDividends, setTotalDividends] = useState(0);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stockPrices, setStockPrices] = useState<Map<string, StockPrice>>(new Map());
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; lastUpdated: Date }>({ rate: 150, lastUpdated: new Date() });
  const [stockQuantities, setStockQuantities] = useState<Map<number, number>>(new Map());
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [currentPortfolioId, setCurrentPortfolioId] = useState<number | null>(null);

  // 投資国ごとの評価額を計算する関数
  const calculateTotalValueByCountry = () => {
    const japanTotal = stocks
      .filter(stock => stock.country === '日本' && stock.id !== undefined)
      .reduce((sum, stock) => {
        const stockPrice = stockPrices.get(stock.symbol);
        const quantity = stockQuantities.get(stock.id as number) || 0;
        if (stockPrice && quantity > 0) {
          // 投資信託の場合は保有口数 * 基準価格 / 10000 で計算
          if (stock.assetType === 'fund') {
            return sum + (stockPrice.price * quantity / 10000);
          } else {
            return sum + (stockPrice.price * quantity);
          }
        }
        return sum;
      }, 0);

    const usTotal = stocks
      .filter(stock => stock.country === '米国' && stock.id !== undefined)
      .reduce((sum, stock) => {
        const stockPrice = stockPrices.get(stock.symbol);
        const quantity = stockQuantities.get(stock.id as number) || 0;
        if (stockPrice && quantity > 0) {
          // 投資信託の場合は保有口数 * 基準価格 / 10000 で計算
          if (stock.assetType === 'fund') {
            // 通貨がUSDの場合のみ為替レートを適用
            if (stockPrice.currency === 'USD') {
              return sum + (stockPrice.price * quantity * exchangeRate.rate / 10000);
            } else {
              return sum + (stockPrice.price * quantity / 10000);
            }
          } else {
            // 株式の場合
            // 通貨がUSDの場合のみ為替レートを適用
            if (stockPrice.currency === 'USD') {
              return sum + (stockPrice.price * quantity * exchangeRate.rate);
            } else {
              return sum + (stockPrice.price * quantity);
            }
          }
        }
        return sum;
      }, 0);

    const total = stocks
      .filter(stock => stock.id !== undefined)
      .reduce((sum, stock) => {
        const stockPrice = stockPrices.get(stock.symbol);
        const quantity = stockQuantities.get(stock.id as number) || 0;
        if (stockPrice && quantity > 0) {
          // 投資信託の場合は保有口数 * 基準価格 / 10000 で計算
          if (stock.assetType === 'fund') {
            if (stock.country === '米国' && stockPrice.currency === 'USD') {
              return sum + (stockPrice.price * quantity * exchangeRate.rate / 10000);
            } else {
              return sum + (stockPrice.price * quantity / 10000);
            }
          } else {
            // 株式の場合
            if (stock.country === '米国' && stockPrice.currency === 'USD') {
              return sum + (stockPrice.price * quantity * exchangeRate.rate);
            } else {
              return sum + (stockPrice.price * quantity);
            }
          }
        }
        return sum;
      }, 0);

    return {
      japanTotal: Math.round(japanTotal),
      usTotal: Math.round(usTotal),
      total: Math.round(total)
    };
  };

  // リバランス提案を計算する関数
  const calculateRebalanceSuggestion = () => {
    const { japanTotal, usTotal } = calculateTotalValueByCountry();
    
    // 日本株と米国株の評価額の差を計算
    const difference = Math.abs(japanTotal - usTotal);
    
    // どちらを追加購入すべきかを判断
    const targetCountry = japanTotal < usTotal ? '日本株' : '米国株';
    
    return {
      difference,
      targetCountry
    };
  };

  // 為替レートを手動で更新する関数
  const updateExchangeRateManually = async () => {
    try {
      setExchangeRateLoading(true);
      
      // Server Actionを呼び出し
      const { updateExchangeRateManually } = await import('@/app/actions/exchange-rate');
      const result = await updateExchangeRateManually();
      
      if (result.success && result.rate) {
        setExchangeRate({
          rate: result.rate,
          lastUpdated: result.lastUpdated instanceof Date 
            ? result.lastUpdated 
            : new Date() // lastUpdatedがDateでない場合は現在時刻を使用
        });
        toast.success('為替レートを更新しました');
      } else {
        toast.error(result.error || '為替レートの更新に失敗しました');
      }
    } catch (error) {
      console.error('為替レートの更新に失敗しました:', error);
      toast.error('為替レートの更新に失敗しました');
    } finally {
      setExchangeRateLoading(false);
    }
  };

  // IndexedDBの初期化
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 投資資金の取得
        const db = await openDB();
        
        // 現在選択されているポートフォリオIDを取得
        const storedPortfolioId = localStorage.getItem('currentPortfolioId');
        if (storedPortfolioId) {
          setCurrentPortfolioId(Number(storedPortfolioId));
        }
        
        // 現在のポートフォリオIDを取得
        const portfolioId = storedPortfolioId ? Number(storedPortfolioId) : undefined;
        
        // 選択されたポートフォリオの投資資金を取得
        const fundsData = await dbHelper.investmentFunds.getTotalFunds({
          where: { portfolioId }
        });
        setTotalFunds(fundsData);

        // 株式情報の取得
        const stocksData = await dbHelper.stocks.findMany();
        setStocks(stocksData);

        // 株価情報の取得
        if (stocksData.length > 0) {
          const symbols = stocksData.map(stock => stock.symbol);
          const prices = await fetchMultipleStockPrices(symbols);
          setStockPrices(prices);
        }

        // 為替レートの取得
        const rate = await fetchUSDJPYRate();
        setExchangeRate(rate);

        // 選択されたポートフォリオの購入記録を取得
        const purchasesData = await dbHelper.purchases.findMany({
          where: { portfolioId }
        });
        
        // 投資総額の計算（投資信託の場合は保有口数 * 基準価格 / 10000 で計算）
        const investment = purchasesData.reduce((sum, purchase) => {
          // 対応する株式情報を取得
          const stock = stocksData.find(s => s.id === purchase.stockId);
          
          // 投資信託の場合
          if (stock && stock.assetType === 'fund') {
            return sum + Math.round(purchase.price * purchase.quantity / 10000);
          } 
          // 株式の場合
          else {
            return sum + (purchase.price * purchase.quantity);
          }
        }, 0);
        
        setTotalInvestment(investment);

        // 各銘柄の所有数を計算
        const quantities = new Map<number, number>();
        for (const stock of stocksData) {
          if (stock.id !== undefined) {
            // 銘柄IDとポートフォリオIDでフィルタリング
            const stockPurchases = purchasesData.filter(purchase => 
              purchase.stockId === stock.id
            );
            // 所有数を計算（購入数量の合計）
            const totalQuantity = stockPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
            quantities.set(stock.id, totalQuantity);
          }
        }
        setStockQuantities(quantities);

        // 選択されたポートフォリオの配当金記録を取得
        const dividendsData = await dbHelper.dividends.findMany({
          where: { portfolioId }
        });
        const dividends = dividendsData.reduce((sum, dividend) => sum + dividend.amount, 0);
        setTotalDividends(dividends);
 
        // 現在のポートフォリオの取得
        if (storedPortfolioId) {
          const portfolioIdNumber = Number(storedPortfolioId);
          const portfolio = await dbHelper.portfolios.findUnique({
            where: { id: portfolioIdNumber },
          });
          setCurrentPortfolio(portfolio);
        }
      } catch (error) {
        console.error('データの取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 10分おきに為替レートと株価を更新
  useEffect(() => {
    const updatePrices = async () => {
      try {
        if (stocks.length > 0) {
          const symbols = stocks.map(stock => stock.symbol);
          const prices = await fetchMultipleStockPrices(symbols);
          setStockPrices(prices);
        }
        const rate = await fetchUSDJPYRate();
        console.log('TOPページで為替レートを更新しました:', rate);
        setExchangeRate(rate);
      } catch (error) {
        console.error('価格情報の更新に失敗しました:', error);
      }
    };

    // 初回ロード時にも更新を実行
    updatePrices();
    
    // 更新間隔を1分に変更（テスト用）
    const interval = setInterval(updatePrices, 1 * 60 * 1000);

    return () => clearInterval(interval);
  }, [stocks]);

  return (
    <div className="flex flex-col gap-12 animate-fadeIn">
      {/* ヒーローセクション */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
        <div className="relative z-10 px-8 py-12 md:px-12 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              InvestVision
            </h1>
            {currentPortfolio && (
              <p className="mb-6 text-xl font-medium text-indigo-100">
                {currentPortfolio.name}
              </p>
            )}
            <p className="mb-10 text-lg text-indigo-100">
              あなたの投資を可視化し、より良い投資判断をサポートします
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/stocks"
                className="btn px-6 py-3 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all hover:translate-y-[-2px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                銘柄一覧を見る
              </Link>
              <Link
                href="/stocks/new"
                className="btn px-6 py-3 bg-purple-500 text-white hover:bg-purple-600 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all hover:translate-y-[-2px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                新しい銘柄を追加
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ポートフォリオ概要セクション - 強調表示 */}
      {!loading && (
        <section className="py-6 -mt-6">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4">
              <h2 className="text-3xl font-bold text-white">ポートフォリオ概要</h2>
              <p className="text-indigo-100 text-sm mt-1">あなたの投資状況を一目で確認できます</p>
            </div>
            
            {/* 概要カード - ヒーローセクションから移動 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200 hover:shadow-md transition-all">
                <div className="text-2xl font-bold text-indigo-700">{stocks.length}</div>
                <div className="text-indigo-600 font-medium">登録銘柄数</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 hover:shadow-md transition-all">
                <div className="text-lg font-bold text-purple-700">
                  {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0, notation: 'compact' }).format(calculateTotalValueByCountry().total)}
                </div>
                <div className="text-purple-600 font-medium">評価額合計</div>
                {totalInvestment > 0 && (
                  <div className="text-xs text-purple-800 mt-1 flex items-center">
                    <span className="font-semibold">利回り: {((calculateTotalValueByCountry().total / totalInvestment) * 100 - 100).toFixed(2)}%</span>
                    <span className="ml-1">（評価額÷投資総額）</span>
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 hover:shadow-md transition-all">
                <div className="text-lg font-bold text-green-700">
                  {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0, notation: 'compact' }).format(totalInvestment)}
                </div>
                <div className="text-green-600 font-medium">投資総額</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200 hover:shadow-md transition-all">
                <div className="text-lg font-bold text-amber-700">
                  {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0, notation: 'compact' }).format(totalDividends)}
                </div>
                <div className="text-amber-600 font-medium">配当金合計</div>
                {totalInvestment > 0 && (
                  <div className="text-xs text-amber-800 mt-1 flex items-center">
                    <span className="font-semibold">利回り: {((totalDividends / totalInvestment) * 100).toFixed(2)}%</span>
                    <span className="ml-1">（配当金÷投資総額）</span>
                  </div>
                )}
              </div>
            </div>

            {/* 評価額とリバランスセクション */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 pt-0">
              {/* 円グラフによる資産配分の可視化 - 左側に配置 */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">資産配分</h3>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  {/* 円グラフ（CSSで実装） */}
                  <div className="relative w-48 h-48">
                    {(() => {
                      const japanPercent = Math.round((calculateTotalValueByCountry().japanTotal / calculateTotalValueByCountry().total) * 100);
                      const usPercent = 100 - japanPercent;
                      
                      return (
                        <>
                          <div 
                            className="absolute inset-0 rounded-full shadow-inner"
                            style={{
                              background: `conic-gradient(#ef4444 0% ${japanPercent}%, #3b82f6 ${japanPercent}% 100%)`
                            }}
                          ></div>
                          <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-sm font-bold text-gray-800">
                              {new Intl.NumberFormat('ja-JP', { notation: 'compact' }).format(calculateTotalValueByCountry().total)}円
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* 凡例 */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                      <span className="text-gray-700">日本株 ({Math.round((calculateTotalValueByCountry().japanTotal / calculateTotalValueByCountry().total) * 100)}%)</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(calculateTotalValueByCountry().japanTotal)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                      <span className="text-gray-700">米国株 ({Math.round((calculateTotalValueByCountry().usTotal / calculateTotalValueByCountry().total) * 100)}%)</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(calculateTotalValueByCountry().usTotal)}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                      <div className="inline-flex items-center text-green-600 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                        株価・為替レートは10分ごとに自動更新
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">
                          最終更新: {exchangeRate.lastUpdated.toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <button 
                          onClick={updateExchangeRateManually}
                          disabled={exchangeRateLoading}
                          className="ml-2 p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100 transition-colors flex items-center disabled:opacity-50"
                          title="為替レートを手動更新"
                        >
                          {exchangeRateLoading ? (
                            <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                            </svg>
                          )}
                          <span className="text-xs">手動更新</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 評価額カード - 右側に配置 */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-medium text-gray-500 mb-2">評価額合計</h3>
                  <p className="text-xl font-bold text-purple-600">
                    {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(calculateTotalValueByCountry().total)}
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-medium text-gray-500 mb-2">日本株評価額</h3>
                  <p className="text-xl font-bold text-red-600">
                    {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(calculateTotalValueByCountry().japanTotal)}
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-medium text-gray-500 mb-2">米国株評価額</h3>
                  <p className="text-xl font-bold text-blue-600">
                    {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(calculateTotalValueByCountry().usTotal)}
                  </p>
                  {exchangeRate && (
                    <p className="text-xs text-gray-500 mt-1">
                      為替レート: {exchangeRate.rate.toFixed(2)}円/$
                    </p>
                  )}
                </div>

                {/* リバランス提案 - 幅を広げる */}
                <div className="md:col-span-3 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm border border-indigo-100 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-medium text-gray-700 mb-2">リバランス提案</h3>
                  {(() => {
                    const { difference, targetCountry } = calculateRebalanceSuggestion();
                    const targetColor = targetCountry === '日本株' ? 'text-red-600' : 'text-blue-600';
                    
                    return (
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="mb-2">
                            <span className="text-sm text-gray-600">追加購入推奨：</span>
                            <span className={`text-lg font-bold ${targetColor}`}>{targetCountry}</span>
                          </div>
                          <p className="text-xl font-bold text-green-600">
                            {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(difference)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            ※売却せず追加購入のみの提案です
                          </p>
                        </div>
                        <div className="mt-4 md:mt-0 text-sm text-gray-600 bg-white p-3 rounded-lg shadow-sm">
                          <div className="flex justify-between mb-1">
                            <span>日本株比率:</span>
                            <span className="font-medium">
                              {Math.round((calculateTotalValueByCountry().japanTotal / calculateTotalValueByCountry().total) * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>米国株比率:</span>
                            <span className="font-medium">
                              {Math.round((calculateTotalValueByCountry().usTotal / calculateTotalValueByCountry().total) * 100)}%
                            </span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <span className="text-xs text-indigo-600">理想的な資産配分は投資家の目標やリスク許容度によって異なります</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <Link
                href="/stocks"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                銘柄詳細を見る
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 投資概要セクション */}
      {!loading && (
        <>
          {/* ポートフォリオ情報 */}
          {currentPortfolio && (
            <section className="py-4">
              <div className="glass p-8 rounded-xl hover-lift">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">{currentPortfolio.name}</h2>
                    {currentPortfolio.description && (
                      <p className="text-gray-600 mt-1">{currentPortfolio.description}</p>
                    )}
                  </div>
                  <div className="mt-4 md:mt-0">
                    <Link
                      href="/portfolios"
                      className="inline-flex items-center px-4 py-2 neumorphic hover-scale text-indigo-700 rounded-lg transition-all"
                    >
                      ポートフォリオを変更
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="py-6">
            <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">投資概要</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="glass p-6 rounded-xl hover-lift">
                <h3 className="text-lg font-medium text-gray-500 mb-2">投資資金</h3>
                <p className="text-xl font-bold text-blue-600">
                  {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(totalFunds)}
                </p>
                <div className="mt-4">
                  <Link
                    href="/funds"
                    className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors flex items-center hover-scale"
                  >
                    詳細を見る
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                </div>
              </div>
              
              <div className="glass p-6 rounded-xl hover-lift">
                <h3 className="text-lg font-medium text-gray-500 mb-2">投資可能額</h3>
                <p className="text-xl font-bold text-teal-600">
                  {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(totalFunds - totalInvestment + totalDividends)}
                </p>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  投資資金 - 投資総額 + 配当金
                </div>
              </div>
              
              <div className="glass p-6 rounded-xl hover-lift">
                <h3 className="text-lg font-medium text-gray-500 mb-2">投資総額</h3>
                <p className="text-xl font-bold text-green-600">
                  {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(totalInvestment)}
                </p>
                <div className="mt-4">
                  <Link
                    href="/purchases"
                    className="text-green-600 text-sm font-medium hover:text-green-800 transition-colors flex items-center hover-scale"
                  >
                    詳細を見る
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                </div>
              </div>
              
              <div className="glass p-6 rounded-xl hover-lift">
                <h3 className="text-lg font-medium text-gray-500 mb-2">配当金合計</h3>
                <p className="text-xl font-bold text-amber-600">
                  {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(totalDividends)}
                </p>
                <div className="mt-4">
                  <Link
                    href="/dividends"
                    className="text-amber-600 text-sm font-medium hover:text-amber-800 transition-colors flex items-center hover-scale"
                  >
                    詳細を見る
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                </div>
              </div>
              
              <div className="glass p-6 rounded-xl hover-lift">
                <h3 className="text-lg font-medium text-gray-500 mb-2">投資利回り</h3>
                <p className="text-xl font-bold text-purple-600">
                  {totalInvestment > 0 
                    ? `${((totalDividends / totalInvestment) * 100).toFixed(2)}%` 
                    : '0.00%'}
                </p>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  配当金 ÷ 投資総額
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* 機能紹介セクション */}
      <section className="py-8">
        <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">主な機能</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="glass p-8 rounded-xl card-3d">
            <div className="card-3d-content">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6 hover-scale">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">投資資金管理</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                投資に使用する資金を管理します。入金と出金を記録して、投資可能な資金を把握できます。
              </p>
              <Link
                href="/funds"
                className="inline-flex items-center text-blue-600 font-medium hover:text-blue-800 transition-colors hover-scale"
              >
                投資資金へ
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>

          <div className="glass p-8 rounded-xl card-3d">
            <div className="card-3d-content">
              <div className="w-14 h-14 bg-indigo-100 rounded-lg flex items-center justify-center mb-6 hover-scale">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">銘柄管理</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                保有している株式銘柄を簡単に管理できます。銘柄コードや名前を登録して、購入記録や配当金記録と紐づけます。
              </p>
              <Link
                href="/stocks"
                className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-800 transition-colors hover-scale"
              >
                銘柄一覧へ
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>

          <div className="glass p-8 rounded-xl card-3d">
            <div className="card-3d-content">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-6 hover-scale">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="2" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">購入記録</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                株式の購入記録を管理します。購入日、数量、価格、手数料などを記録して、投資履歴を把握できます。
              </p>
              <Link
                href="/purchases"
                className="inline-flex items-center text-green-600 font-medium hover:text-green-800 transition-colors hover-scale"
              >
                購入記録へ
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>

          <div className="glass p-8 rounded-xl card-3d">
            <div className="card-3d-content">
              <div className="w-14 h-14 bg-amber-100 rounded-lg flex items-center justify-center mb-6 hover-scale">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">配当金記録</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                受け取った配当金を記録します。受取日、金額、税額などを記録して、配当収入を管理できます。
              </p>
              <Link
                href="/dividends"
                className="inline-flex items-center text-amber-600 font-medium hover:text-amber-800 transition-colors hover-scale"
              >
                配当金記録へ
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 使い方セクション */}
      <section className="glass-dark p-8 rounded-xl">
        <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">使い方</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div className="glass p-6 rounded-lg flex flex-col items-center text-center hover-lift">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 hover-pulse">
              <span className="text-xl font-bold text-indigo-600">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">投資資金の登録</h3>
            <p className="text-gray-600">「投資資金管理」から入金記録を追加します。</p>
            <div className="mt-4 w-full">
              <Link
                href="/funds"
                className="inline-flex items-center justify-center w-full text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors py-2 neumorphic rounded-lg hover-scale"
              >
                投資資金へ
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>
          
          <div className="glass p-6 rounded-lg flex flex-col items-center text-center hover-lift">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 hover-pulse">
              <span className="text-xl font-bold text-indigo-600">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">銘柄登録</h3>
            <p className="text-gray-600">「銘柄一覧」から新しい株式銘柄を登録します。</p>
            <div className="mt-4 w-full">
              <Link
                href="/stocks"
                className="inline-flex items-center justify-center w-full text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors py-2 neumorphic rounded-lg hover-scale"
              >
                銘柄一覧へ
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>
          
          <div className="glass p-6 rounded-lg flex flex-col items-center text-center hover-lift">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 hover-pulse">
              <span className="text-xl font-bold text-indigo-600">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">購入記録</h3>
            <p className="text-gray-600">株式を購入したら「購入記録」から記録を追加します。</p>
            <div className="mt-4 w-full">
              <Link
                href="/purchases"
                className="inline-flex items-center justify-center w-full text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors py-2 neumorphic rounded-lg hover-scale"
              >
                購入記録へ
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>
          
          <div className="glass p-6 rounded-lg flex flex-col items-center text-center hover-lift">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 hover-pulse">
              <span className="text-xl font-bold text-indigo-600">4</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">配当金記録</h3>
            <p className="text-gray-600">配当金を受け取ったら「配当金記録」から記録を追加します。</p>
            <div className="mt-4 w-full">
              <Link
                href="/dividends"
                className="inline-flex items-center justify-center w-full text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors py-2 neumorphic rounded-lg hover-scale"
              >
                配当金記録へ
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>
          
          <div className="glass p-6 rounded-lg flex flex-col items-center text-center hover-lift">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 hover-pulse">
              <span className="text-xl font-bold text-indigo-600">5</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">管理</h3>
            <p className="text-gray-600">各ページで記録の確認、編集、削除ができます。</p>
            <div className="mt-4 w-full">
              <Link
                href="/settings"
                className="inline-flex items-center justify-center w-full text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors py-2 neumorphic rounded-lg hover-scale"
              >
                設定ページへ
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* IndexedDBについての説明 */}
      <section className="glass p-8 rounded-xl mb-8">
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">データの保存について</h2>
        <div className="max-w-4xl mx-auto">
          <div className="glass-dark p-6 rounded-xl mb-8 hover-lift">
            <p className="text-gray-300 mb-6 text-center text-lg">
              このアプリケーションでは、すべてのデータはブラウザの<span className="font-semibold text-indigo-400">IndexedDB</span>に保存されます。
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="glass p-6 rounded-lg hover-lift">
              <h3 className="text-xl font-semibold text-indigo-700 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                メリット
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start hover-scale">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>インターネット接続がなくても使用できます</span>
                </li>
                <li className="flex items-start hover-scale">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>データはあなたのデバイスにのみ保存され、サーバーには送信されません</span>
                </li>
                <li className="flex items-start hover-scale">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>プライバシーが保護されます</span>
                </li>
                <li className="flex items-start hover-scale">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>高速に動作します</span>
                </li>
              </ul>
            </div>
            
            <div className="glass p-6 rounded-lg hover-lift">
              <h3 className="text-xl font-semibold text-amber-700 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                注意点
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start hover-scale">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>ブラウザのデータを削除すると、保存したデータも削除されます</span>
                </li>
                <li className="flex items-start hover-scale">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>異なるデバイス間でデータは同期されません</span>
                </li>
                <li className="flex items-start hover-scale">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>定期的にデータをエクスポートしてバックアップすることをお勧めします</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="text-center">
            <Link
              href="/settings"
              className="inline-flex items-center px-6 py-3 gradient-btn hover-scale"
            >
              データのエクスポート/インポート
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* アニメーション用のスタイル */
const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.6s ease-out forwards;
}

.animation-delay-300 {
  animation-delay: 0.3s;
}

.animation-delay-500 {
  animation-delay: 0.5s;
}
`;

// スタイルをヘッドに追加
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
