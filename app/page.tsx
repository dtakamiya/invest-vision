"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { openDB, dbHelper, Stock, Purchase, Portfolio } from "@/app/lib/db";
import { StockPrice, fetchMultipleStockPrices } from "@/app/lib/stockApi";
import { toast } from 'react-hot-toast';
import { useExchangeRate } from "@/app/hooks/useExchangeRate";
import { ExchangeRateDisplay } from "@/app/components/ExchangeRateDisplay";
import { UpdateIndicator } from './components/UpdateIndicator';

interface Fund {
  id: number;
  amount: number;
  date: Date;
  notes?: string;
}

// リバランス提案用のコンポーネント
const RebalanceSuggestion = ({ suggestion, loading }: { suggestion: { difference: number, targetCountry: string }, loading: boolean }) => {
  const targetColor = suggestion.targetCountry === '日本株' ? 'text-red-600' : 'text-blue-600';
  
  return (
    <section className="py-4">
      <div className={`bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden ${loading ? 'animate-pulse' : ''}`}>
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-3">
          <h2 className="text-2xl font-bold text-white flex items-center">
            リバランス提案
            {loading && (
              <span className="inline-flex ml-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            )}
          </h2>
          <p className="text-green-100 text-sm">最適な資産配分のための提案です</p>
        </div>
        
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="mb-2">
                <span className="text-sm text-gray-600">追加購入推奨：</span>
                <span className={`text-lg font-bold ${targetColor}`}>{suggestion.targetCountry}</span>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg shadow-sm border border-green-200 animate-pulse-slow">
                <p className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat('ja-JP', { 
                    style: 'currency', 
                    currency: 'JPY',
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                    notation: 'compact',
                    currencyDisplay: 'narrowSymbol'
                  }).format(suggestion.difference)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ※売却せず追加購入のみで最適化する提案です
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <Link
                href="/stocks"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm9 4a1 1 0 10-2 0v6a1 1 0 102 0V7zm-3 2a1 1 0 10-2 0v4a1 1 0 102 0V9zm-3 3a1 1 0 10-2 0v1a1 1 0 102 0v-1z" clipRule="evenodd" />
                </svg>
                銘柄一覧を見る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [totalFunds, setTotalFunds] = useState(0);
  const [totalInvestment, setTotalInvestment] = useState(0);
  const [totalDividends, setTotalDividends] = useState(0);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stockPrices, setStockPrices] = useState<Map<string, StockPrice>>(new Map());
  const [stockQuantities, setStockQuantities] = useState<Map<number, number>>(new Map());
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [currentPortfolioId, setCurrentPortfolioId] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  
  // 為替レート関連の状態はカスタムフックに移動
  const { 
    exchangeRate, 
    exchangeRateLoading, 
    updateExchangeRate,
    updateComplete
  } = useExchangeRate();
  
  // 手動で為替レートを更新する関数
  const updateExchangeRateManually = () => {
    updateExchangeRate(true); // trueを渡してトースト表示を有効にする
  };

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
      japanTotal: Math.round(japanTotal * 10) / 10,
      usTotal: Math.round(usTotal * 10) / 10,
      total: Math.round(total * 10) / 10
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

        // 基本データの取得が完了したら、画面を表示
        setLoading(false);

        // DBから株価情報を取得
        await loadPricesFromDB(stocksData);
        
        // 株価情報の取得（非同期）
        if (stocksData.length > 0) {
          fetchPriceData(stocksData);
        }

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
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // DBから株価情報を取得する関数
  const loadPricesFromDB = async (stocksData: Stock[]) => {
    try {
      const pricesMap = new Map<string, StockPrice>();
      
      // 各銘柄の最新の株価情報を取得
      for (const stock of stocksData) {
        if (!stock.id) continue;
        
        const latestPrice = await dbHelper.stockPrices.findLatestByStockId(stock.id);
        if (latestPrice) {
          pricesMap.set(stock.symbol, {
            symbol: latestPrice.symbol,
            price: latestPrice.price,
            change: latestPrice.change,
            changePercent: latestPrice.changePercent,
            currency: latestPrice.currency,
            lastUpdated: new Date(latestPrice.lastUpdated)
          });
          console.log(`DBから株価情報を取得: ${stock.symbol}, 価格: ${latestPrice.price}${latestPrice.currency}`);
        }
      }
      
      // 株価情報をセット
      setStockPrices(pricesMap);
      
      console.log(`DBから株価情報を取得完了: ${pricesMap.size}件`);
    } catch (error) {
      console.error('DBからの株価情報取得に失敗しました:', error);
    }
  };

  // 株価と保有量のデータを取得する関数
  const fetchPriceData = async (stocksData: Stock[]) => {
    try {
      setPriceLoading(true);
      
      if (stocksData.length === 0) {
        setPriceLoading(false);
        return;
      }
      
      console.log('株価情報取得を開始します');
      
      // 株式と投資信託に分ける
      const stockSymbols: string[] = [];
      const fundSymbols: string[] = [];
      
      stocksData.forEach(stock => {
        if (stock.assetType === 'fund') {
          fundSymbols.push(stock.symbol);
        } else {
          stockSymbols.push(stock.symbol);
        }
      });
      
      console.log('株価取得: 株式と投資信託に分類', { 
        stocks: stockSymbols.length, 
        funds: fundSymbols.length
      });
      
      // シンボルの配列を作成
      const symbols = stocksData.map(stock => stock.symbol);
      console.log('株価取得: 取得するシンボル一覧', symbols);
      
      // 株価情報を取得
      const prices = await fetchMultipleStockPrices(symbols);
      
      // 株価情報を設定
      setStockPrices(prices);
      console.log(`株価情報取得完了: ${prices.size}件`);
      
      // 注：為替レート更新はカスタムフックで自動的に行われるため、ここでは省略
    } catch (error) {
      console.error('価格情報の取得に失敗しました:', error);
    } finally {
      setPriceLoading(false);
    }
  };

  // 10分おきに株価情報を更新するuseEffect
  // 注：為替レート更新はカスタムフックに移行したためここでは株価情報の更新のみ行う
  useEffect(() => {
    const updatePrices = async () => {
      try {
        // 株価情報の更新が必要かチェック
        let shouldUpdatePrices = false;
        
        // 株価情報の最終更新時刻を確認
        if (stockPrices.size > 0) {
          // 最も古い株価情報の更新時刻を取得
          const oldestUpdate = Array.from(stockPrices.values()).reduce((oldest, price) => {
            return price.lastUpdated < oldest ? price.lastUpdated : oldest;
          }, new Date());
          
          // 5分以上経過しているかチェック
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          shouldUpdatePrices = oldestUpdate < fiveMinutesAgo;
          
          console.log('定期更新: 株価情報の更新チェック:', {
            oldestUpdate,
            fiveMinutesAgo,
            shouldUpdate: shouldUpdatePrices
          });
        } else {
          // 株価情報がない場合は更新が必要
          shouldUpdatePrices = true;
        }
        
        // 株価情報の更新が必要な場合のみAPIリクエストを実行
        if (shouldUpdatePrices && stocks.length > 0) {
          console.log('定期更新: 株価情報の更新を開始します');
          const symbols = stocks.map(stock => stock.symbol);
          const prices = await fetchMultipleStockPrices(symbols);
          
          // 既存の株価情報と統合
          const updatedPrices = new Map(stockPrices);
          prices.forEach((price, symbol) => {
            console.log(`価格情報を更新: ${symbol}, 価格: ${price.price}${price.currency}`);
            updatedPrices.set(symbol, price);
          });
          
          setStockPrices(updatedPrices);
          console.log(`価格情報更新完了: ${prices.size}件, 全体: ${updatedPrices.size}件`);
        } else {
          console.log('定期更新: 株価情報は最新のため、更新をスキップします');
        }
        
        // 注：為替レート更新はカスタムフックで自動的に行われるため、ここでは省略
      } catch (error) {
        console.error('価格情報の更新に失敗しました:', error);
      }
    };
    
    // 更新間隔を10分に設定
    const interval = setInterval(updatePrices, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [stocks, stockPrices]);

  return (
    <div className="flex flex-col gap-6 sm:gap-12 animate-fadeIn">
      {/* リバランス提案セクション（最上部に配置） */}
      {calculateRebalanceSuggestion().targetCountry && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-xl border border-blue-100 mb-6 shadow-lg relative overflow-hidden">
          {/* 装飾的な背景要素 */}
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full opacity-5 blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-gradient-to-tr from-purple-400 to-pink-400 rounded-full opacity-5 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row gap-6">
            {/* 左側：提案内容 */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">投資提案</h3>
                  <p className="text-sm text-gray-600">最適な資産配分のための提案です</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-2 h-10 rounded-full ${calculateRebalanceSuggestion().targetCountry === '日本株' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <p className="text-sm text-gray-600">次回の投資では</p>
                    <p className="text-xl font-bold text-gray-900">
                      {calculateRebalanceSuggestion().targetCountry === '日本株' ? '日本株' : '米国株'}
                      <span className="text-sm font-normal text-gray-600 ml-2">がおすすめです</span>
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">追加推奨額</span>
                    <span className="text-lg font-bold text-gray-900">
                      {new Intl.NumberFormat('ja-JP', { 
                        style: 'currency', 
                        currency: 'JPY',
                        notation: 'compact',
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                        currencyDisplay: 'narrowSymbol'
                      }).format(calculateRebalanceSuggestion().difference)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">※売却せず追加購入のみの提案です</p>
                </div>
              </div>
            </div>

            {/* 右側：現在の配分状況 */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                    <path d="M3.6 9h16.8"/>
                    <path d="M3.6 15h16.8"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">現在の資産配分</h3>
                  <p className="text-sm text-gray-600">各国の投資比率と評価額</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 space-y-4">
                {/* 日本株 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                      <span className="text-sm font-medium text-gray-900">日本株</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {((calculateTotalValueByCountry().japanTotal / calculateTotalValueByCountry().total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(calculateTotalValueByCountry().japanTotal / calculateTotalValueByCountry().total) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 flex justify-between items-center">
                    <span className="text-xs text-gray-500">評価額</span>
                    <span className="text-sm font-medium text-red-600">
                      {new Intl.NumberFormat('ja-JP', { 
                        style: 'currency', 
                        currency: 'JPY',
                        notation: 'compact',
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                        currencyDisplay: 'narrowSymbol'
                      }).format(calculateTotalValueByCountry().japanTotal)}
                    </span>
                  </div>
                </div>

                {/* 米国株 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                      <span className="text-sm font-medium text-gray-900">米国株</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {((calculateTotalValueByCountry().usTotal / calculateTotalValueByCountry().total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(calculateTotalValueByCountry().usTotal / calculateTotalValueByCountry().total) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 flex justify-between items-center">
                    <span className="text-xs text-gray-500">評価額</span>
                    <span className="text-sm font-medium text-blue-600">
                      {new Intl.NumberFormat('ja-JP', { 
                        style: 'currency', 
                        currency: 'JPY',
                        notation: 'compact',
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                        currencyDisplay: 'narrowSymbol'
                      }).format(calculateTotalValueByCountry().usTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ポートフォリオ概要セクション - 強調表示 */}
      {!loading && (
        <section className="py-6">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4">
              <h2 className="text-3xl font-bold text-white">ポートフォリオ概要</h2>
              <p className="text-indigo-100 text-sm mt-1">あなたの投資状況を一目で確認できます</p>
              {priceLoading && (
                <div className="mt-2 flex items-center text-white">
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  株価情報を取得中です...
                </div>
              )}
            </div>
            
            {/* 概要カード - ヒーローセクションから移動 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-6">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200 hover:shadow-md transition-all">
                <div className="text-2xl font-bold text-indigo-700">{stocks.length}</div>
                <div className="text-indigo-600 font-medium">登録銘柄数</div>
              </div>
              <div className={`bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 hover:shadow-md transition-all price-update ${updateComplete ? 'price-updated' : ''}`}>
                <div className="text-lg font-bold text-purple-700">
                  {new Intl.NumberFormat('ja-JP', { 
                    style: 'currency', 
                    currency: 'JPY', 
                    maximumFractionDigits: 1, 
                    notation: 'compact',
                    currencyDisplay: 'narrowSymbol'
                  }).format(calculateTotalValueByCountry().total)}
                  {priceLoading && (
                    <span className="inline-block ml-2">
                      <svg className="animate-spin h-3 w-3 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  )}
                </div>
                <div className="text-purple-600 font-medium">評価額合計</div>
                {totalInvestment > 0 && (
                  <div className="text-xs text-purple-800 mt-1 flex items-center">
                    <span className="font-semibold">利回り: {((calculateTotalValueByCountry().total / totalInvestment) * 100 - 100).toFixed(2)}%</span>
                    <span className="ml-1">（評価額÷投資総額）</span>
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200 hover:shadow-md transition-all">
                <div className="text-lg font-bold text-teal-700">
                  {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(totalFunds - totalInvestment + totalDividends)}
                </div>
                <div className="text-teal-600 font-medium">投資可能額</div>
                <div className="flex items-center mt-1 text-xs text-teal-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  投資資金 - 投資総額 + 配当金
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 hover:shadow-md transition-all">
                <div className="text-lg font-bold text-green-700">
                  {new Intl.NumberFormat('ja-JP', { 
                    style: 'currency', 
                    currency: 'JPY', 
                    minimumFractionDigits: 1, 
                    maximumFractionDigits: 1, 
                    notation: 'compact',
                    currencyDisplay: 'narrowSymbol'
                  }).format(totalInvestment)}
                </div>
                <div className="text-green-600 font-medium">投資総額</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200 hover:shadow-md transition-all">
                <div className="text-lg font-bold text-amber-700">
                  {new Intl.NumberFormat('ja-JP', { 
                    style: 'currency', 
                    currency: 'JPY', 
                    minimumFractionDigits: 1, 
                    maximumFractionDigits: 1, 
                    notation: 'compact',
                    currencyDisplay: 'narrowSymbol'
                  }).format(totalDividends)}
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

            {/* 評価額サマリーセクション */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">評価額サマリー</h2>
                <UpdateIndicator 
                  isLoading={priceLoading} 
                  lastUpdate={exchangeRate.lastUpdated.getTime()}
                  updateComplete={updateComplete}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <h3 className="text-lg font-medium text-purple-700 mb-2">評価額合計</h3>
                  <p className="text-2xl font-bold text-purple-800">
                    {new Intl.NumberFormat('ja-JP', { 
                      style: 'currency', 
                      currency: 'JPY', 
                      maximumFractionDigits: 1, 
                      notation: 'compact',
                      currencyDisplay: 'narrowSymbol'
                    }).format(calculateTotalValueByCountry().total)}
                  </p>
                  {totalInvestment > 0 && (
                    <p className="text-sm text-purple-600 mt-1">
                      利回り: {((calculateTotalValueByCountry().total / totalInvestment) * 100 - 100).toFixed(2)}%
                    </p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                  <h3 className="text-lg font-medium text-red-700 mb-2">日本株評価額</h3>
                  <p className="text-2xl font-bold text-red-800">
                    {new Intl.NumberFormat('ja-JP', { 
                      style: 'currency', 
                      currency: 'JPY', 
                      maximumFractionDigits: 1, 
                      notation: 'compact',
                      currencyDisplay: 'narrowSymbol'
                    }).format(calculateTotalValueByCountry().japanTotal)}
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    割合: {Math.round((calculateTotalValueByCountry().japanTotal / calculateTotalValueByCountry().total) * 100)}%
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <h3 className="text-lg font-medium text-blue-700 mb-2">米国株評価額</h3>
                  <p className="text-2xl font-bold text-blue-800">
                    {new Intl.NumberFormat('ja-JP', { 
                      style: 'currency', 
                      currency: 'JPY', 
                      maximumFractionDigits: 1, 
                      notation: 'compact',
                      currencyDisplay: 'narrowSymbol'
                    }).format(calculateTotalValueByCountry().usTotal)}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    割合: {Math.round((calculateTotalValueByCountry().usTotal / calculateTotalValueByCountry().total) * 100)}%
                  </p>
                  {exchangeRate && (
                    <p className="text-xs text-blue-500 mt-1">
                      為替レート: {exchangeRate.rate.toFixed(2)}円/$
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 評価額とリバランスセクション */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 pt-0">
              {/* 円グラフによる資産配分の可視化 - 左側に配置 */}
              <div className={`lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 price-update ${updateComplete ? 'price-updated' : ''}`}>
                <h3 className="text-xl font-semibold text-gray-700 mb-4">
                  資産配分
                  {priceLoading && (
                    <span className="inline-block ml-2">
                      <svg className="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  )}
                </h3>
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
                      <span className="text-sm text-gray-700">日本株 ({Math.round((calculateTotalValueByCountry().japanTotal / calculateTotalValueByCountry().total) * 100)}%)</span>
                      <span className="ml-auto font-semibold text-sm text-gray-900">
                        {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', notation: 'compact' }).format(calculateTotalValueByCountry().japanTotal)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                      <span className="text-sm text-gray-700">米国株 ({Math.round((calculateTotalValueByCountry().usTotal / calculateTotalValueByCountry().total) * 100)}%)</span>
                      <span className="ml-auto font-semibold text-sm text-gray-900">
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
                        <ExchangeRateDisplay
                          exchangeRate={exchangeRate}
                          loading={exchangeRateLoading}
                          onRefresh={updateExchangeRateManually}
                          updateComplete={updateComplete}
                          showUpdateTime={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* リバランス提案 - 幅を広げる */}
              <div className={`md:col-span-3 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm border border-indigo-100 hover:shadow-md transition-shadow price-update ${updateComplete ? 'price-updated' : ''}`}>
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  リバランス提案
                  {priceLoading && (
                    <span className="inline-block ml-2">
                      <svg className="animate-spin h-3 w-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  )}
                </h3>
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
                        <div className="bg-white p-3 rounded-lg shadow-sm border border-green-200">
                          <p className="text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat('ja-JP', { 
                              style: 'currency', 
                              currency: 'JPY',
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                              notation: 'compact',
                              currencyDisplay: 'narrowSymbol'
                            }).format(difference)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            ※売却せず追加購入のみの提案です
                          </p>
                        </div>
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

            {/* アクションボタン */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <Link
                href="/stocks"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm9 4a1 1 0 10-2 0v6a1 1 0 102 0V7zm-3 2a1 1 0 10-2 0v4a1 1 0 102 0V9zm-3 3a1 1 0 10-2 0v1a1 1 0 102 0v-1z" clipRule="evenodd" />
                </svg>
                全銘柄一覧を見る
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ヒーローセクション */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
        <div className="relative z-10 px-4 sm:px-8 py-8 sm:py-12 md:px-12 md:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-3 sm:mb-4 text-3xl sm:text-4xl font-bold tracking-tight md:text-5xl">
              InvestVision
            </h1>
            {currentPortfolio && (
              <p className="mb-4 sm:mb-6 text-lg sm:text-xl font-medium text-indigo-100">
                {currentPortfolio.name}
              </p>
            )}
            <p className="mb-6 sm:mb-10 text-base sm:text-lg text-indigo-100">
              あなたの投資を可視化し、より良い投資判断をサポートします
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <Link
                href="/stocks"
                className="btn px-4 sm:px-6 py-2 sm:py-3 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all hover:translate-y-[-2px] text-sm sm:text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                銘柄一覧を見る
              </Link>
              <Link
                href="/stocks/new"
                className="btn px-4 sm:px-6 py-2 sm:py-3 bg-purple-500 text-white hover:bg-purple-600 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all hover:translate-y-[-2px] text-sm sm:text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                新しい銘柄を追加
              </Link>
            </div>
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

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.animate-slideIn {
  animation: slideIn 0.5s ease-out forwards;
}

.price-update {
  transition: background-color 0.5s ease;
}

.price-updated {
  background-color: rgba(34, 197, 94, 0.1);
}
`;

// スタイルをヘッドに追加
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
