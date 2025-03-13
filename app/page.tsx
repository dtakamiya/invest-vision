"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { openDB, dbHelper, Stock, Purchase } from "@/app/lib/db";
import { StockPrice, fetchMultipleStockPrices } from "@/app/lib/stockApi";
import { fetchUSDJPYRate } from "@/app/lib/exchangeApi";

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

  // 投資国ごとの評価額を計算する関数
  const calculateTotalValueByCountry = () => {
    const japanTotal = stocks
      .filter(stock => stock.country === '日本')
      .reduce((sum, stock) => {
        const stockPrice = stockPrices.get(stock.symbol);
        const quantity = stockQuantities.get(stock.id) || 0;
        if (stockPrice && quantity > 0) {
          return sum + (stockPrice.price * quantity);
        }
        return sum;
      }, 0);

    const usTotal = stocks
      .filter(stock => stock.country === '米国')
      .reduce((sum, stock) => {
        const stockPrice = stockPrices.get(stock.symbol);
        const quantity = stockQuantities.get(stock.id) || 0;
        if (stockPrice && quantity > 0) {
          // 通貨がUSDの場合のみ為替レートを適用
          if (stockPrice.currency === 'USD') {
            return sum + (stockPrice.price * quantity * exchangeRate.rate);
          } else {
            return sum + (stockPrice.price * quantity);
          }
        }
        return sum;
      }, 0);

    const total = stocks.reduce((sum, stock) => {
      const stockPrice = stockPrices.get(stock.symbol);
      const quantity = stockQuantities.get(stock.id) || 0;
      if (stockPrice && quantity > 0) {
        if (stock.country === '米国' && stockPrice.currency === 'USD') {
          return sum + (stockPrice.price * quantity * exchangeRate.rate);
        } else {
          return sum + (stockPrice.price * quantity);
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

  // IndexedDBの初期化
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 投資資金の取得
        const db = await openDB();
        const fundsData = await dbHelper.investmentFunds.getTotalFunds();
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

        // 購入記録の取得
        const purchasesData = await dbHelper.purchases.findMany();
        const investment = purchasesData.reduce((sum, purchase) => sum + (purchase.price * purchase.quantity), 0);
        setTotalInvestment(investment);

        // 各銘柄の所有数を計算
        const quantities = new Map<number, number>();
        for (const stock of stocksData) {
          // 銘柄IDでフィルタリング
          const stockPurchases = purchasesData.filter(purchase => purchase.stockId === stock.id);
          // 所有数を計算（購入数量の合計）
          const totalQuantity = stockPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
          quantities.set(stock.id, totalQuantity);
        }
        setStockQuantities(quantities);

        // 配当金記録の取得
        const dividendsData = await dbHelper.dividends.findMany();
        const dividends = dividendsData.reduce((sum, dividend) => sum + dividend.amount, 0);
        setTotalDividends(dividends);
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
        setExchangeRate(rate);
      } catch (error) {
        console.error('価格情報の更新に失敗しました:', error);
      }
    };

    // 初回実行は不要（上のuseEffectで取得済み）
    const interval = setInterval(updatePrices, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [stocks]);

  return (
    <div className="flex flex-col gap-12 animate-fadeIn">
      {/* ヒーローセクション */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
        <div className="relative z-10 px-6 py-16 sm:px-12 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            投資ビジョン
          </h1>
          <p className="text-xl md:text-2xl text-indigo-100 mb-10 max-w-3xl mx-auto">
            配当金の受け取りと株式購入を簡単に記録・管理できる
            <br className="hidden sm:inline" />
            モダンなアプリケーション
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/stocks"
              className="btn px-6 py-3 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
              銘柄一覧を見る
            </Link>
            <Link
              href="/stocks/new"
              className="btn px-6 py-3 bg-purple-500 text-white hover:bg-purple-600 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              新しい銘柄を追加
            </Link>
          </div>
        </div>
      </section>

      {/* 評価額とリバランスセクション */}
      {!loading && (
        <section className="py-6">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">ポートフォリオ概要</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-medium text-gray-500 mb-2">評価額合計</h3>
              <p className="text-3xl font-bold text-purple-600">
                {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(calculateTotalValueByCountry().total)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="inline-flex items-center text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                  10分ごとに自動更新
                </span>
              </p>
              <div className="mt-4">
                <Link
                  href="/stocks"
                  className="text-purple-600 text-sm font-medium hover:text-purple-800 transition-colors flex items-center"
                >
                  詳細を見る
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-medium text-gray-500 mb-2">日本株評価額</h3>
              <p className="text-3xl font-bold text-red-600">
                {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(calculateTotalValueByCountry().japanTotal)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="inline-flex items-center text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                  株価は10分ごとに自動更新
                </span>
              </p>
              <div className="mt-4">
                <Link
                  href="/stocks"
                  className="text-red-600 text-sm font-medium hover:text-red-800 transition-colors flex items-center"
                >
                  詳細を見る
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-medium text-gray-500 mb-2">米国株評価額</h3>
              <p className="text-3xl font-bold text-blue-600">
                {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(calculateTotalValueByCountry().usTotal)}
              </p>
              {exchangeRate && (
                <p className="text-xs text-gray-500 mt-1">
                  為替レート: {exchangeRate.rate.toFixed(2)}円/$
                  <br />
                  更新: {exchangeRate.lastUpdated.toLocaleString('ja-JP')}
                  <br />
                  <span className="inline-flex items-center text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    株価・為替レートは10分ごとに自動更新
                  </span>
                </p>
              )}
              <div className="mt-4">
                <Link
                  href="/stocks"
                  className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors flex items-center"
                >
                  詳細を見る
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>
            </div>
            
            {/* リバランス提案 */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-medium text-gray-500 mb-2">リバランス提案</h3>
              {(() => {
                const { difference, targetCountry } = calculateRebalanceSuggestion();
                const targetColor = targetCountry === '日本株' ? 'text-red-600' : 'text-blue-600';
                
                return (
                  <>
                    <div className="mb-2">
                      <span className="text-sm text-gray-600">追加購入推奨：</span>
                      <span className={`text-lg font-bold ${targetColor}`}>{targetCountry}</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(difference)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ※売却せず追加購入のみの提案です
                    </p>
                    <div className="mt-4 text-sm text-gray-600">
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
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </section>
      )}

      {/* 投資概要セクション */}
      {!loading && (
        <section className="py-6">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">投資概要</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-medium text-gray-500 mb-2">投資資金</h3>
              <p className="text-3xl font-bold text-blue-600">
                {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(totalFunds)}
              </p>
              <div className="mt-4">
                <Link
                  href="/funds"
                  className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors flex items-center"
                >
                  詳細を見る
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-medium text-gray-500 mb-2">投資可能額</h3>
              <p className="text-3xl font-bold text-teal-600">
                {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(totalFunds - totalInvestment + totalDividends)}
              </p>
              <p className="text-sm text-gray-500 mt-1">投資資金 - 投資総額 + 配当金</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-medium text-gray-500 mb-2">投資総額</h3>
              <p className="text-3xl font-bold text-green-600">
                {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(totalInvestment)}
              </p>
              <div className="mt-4">
                <Link
                  href="/purchases"
                  className="text-green-600 text-sm font-medium hover:text-green-800 transition-colors flex items-center"
                >
                  詳細を見る
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-medium text-gray-500 mb-2">配当金合計</h3>
              <p className="text-3xl font-bold text-amber-600">
                {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(totalDividends)}
              </p>
              <div className="mt-4">
                <Link
                  href="/dividends"
                  className="text-amber-600 text-sm font-medium hover:text-amber-800 transition-colors flex items-center"
                >
                  詳細を見る
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-medium text-gray-500 mb-2">投資利回り</h3>
              <p className="text-3xl font-bold text-purple-600">
                {totalInvestment > 0 
                  ? `${((totalDividends / totalInvestment) * 100).toFixed(2)}%` 
                  : '0.00%'}
              </p>
              <p className="text-sm text-gray-500 mt-1">配当金 ÷ 投資総額</p>
            </div>
          </div>
        </section>
      )}

      {/* 機能紹介セクション */}
      <section className="py-8">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">主な機能</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-md card-hover border border-gray-100">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
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
              className="inline-flex items-center text-blue-600 font-medium hover:text-blue-800 transition-colors"
            >
              投資資金へ
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md card-hover border border-gray-100">
            <div className="w-14 h-14 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
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
              className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
            >
              銘柄一覧へ
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md card-hover border border-gray-100">
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-6">
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
              className="inline-flex items-center text-green-600 font-medium hover:text-green-800 transition-colors"
            >
              購入記録へ
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md card-hover border border-gray-100">
            <div className="w-14 h-14 bg-amber-100 rounded-lg flex items-center justify-center mb-6">
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
              className="inline-flex items-center text-amber-600 font-medium hover:text-amber-800 transition-colors"
            >
              配当金記録へ
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* 使い方セクション */}
      <section className="bg-gradient-to-r from-gray-50 to-gray-100 p-8 rounded-xl">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">使い方</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-indigo-600">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">投資資金の登録</h3>
            <p className="text-gray-600">「投資資金管理」から入金記録を追加します。</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-indigo-600">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">銘柄登録</h3>
            <p className="text-gray-600">「銘柄一覧」から新しい株式銘柄を登録します。</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-indigo-600">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">購入記録</h3>
            <p className="text-gray-600">株式を購入したら「購入記録」から記録を追加します。</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-indigo-600">4</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">配当金記録</h3>
            <p className="text-gray-600">配当金を受け取ったら「配当金記録」から記録を追加します。</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-indigo-600">5</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">管理</h3>
            <p className="text-gray-600">各ページで記録の確認、編集、削除ができます。</p>
          </div>
        </div>
      </section>

      {/* IndexedDBについての説明 */}
      <section className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-xl mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">データの保存について</h2>
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-700 mb-6 text-center">
            このアプリケーションでは、すべてのデータはブラウザのIndexedDBに保存されます。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-indigo-700 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                メリット
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>インターネット接続がなくても使用できます</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>サーバーにデータを送信しないため、プライバシーが保護されます</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>高速な動作が可能です</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-amber-700 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                注意点
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>ブラウザのデータを消去すると、保存したデータも削除されます</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>異なるブラウザやデバイス間でデータは共有されません</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>定期的にデータのバックアップをお勧めします</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
