"use client";

import Link from "next/link";
import { dbHelper, Stock, Purchase, Portfolio } from "@/app/lib/db";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMultipleStockPrices, StockPrice } from "@/app/lib/stockApi";
import { fetchMultipleFundPrices, FundPrice } from "@/app/lib/fundApi";
import { fetchUSDJPYRate } from "@/app/lib/exchangeApi";
import { toast } from 'react-hot-toast';

// 評価額を計算する関数
function calculateValue(
  stock: Stock,
  stockPrice: StockPrice | undefined,
  fundPrice: FundPrice | undefined,
  exchangeRate: { rate: number; lastUpdated: Date },
  quantity: number
): { value: number | null; currency: string } {
  // 投資信託の場合
  if (stock.assetType === 'fund' && fundPrice) {
    return {
      value: Math.round(fundPrice.price * quantity / 10000),
      currency: '円'
    };
  }
  
  // 株式の場合
  if (!stockPrice || quantity === 0) return { value: null, currency: '円' };
  
  // USDの場合、為替レートを適用
  if (stockPrice.currency === 'USD') {
    return {
      value: Math.round(stockPrice.price * quantity * exchangeRate.rate),
      currency: '円'
    };
  }
  
  return {
    value: Math.round(stockPrice.price * quantity),
    currency: '円'
  };
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stockPrices, setStockPrices] = useState<Map<string, StockPrice>>(new Map());
  const [fundPrices, setFundPrices] = useState<Map<string, FundPrice>>(new Map());
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; lastUpdated: Date }>({ 
    rate: 148.0, 
    lastUpdated: new Date() 
  });
  const [stockQuantities, setStockQuantities] = useState<Map<number, number>>(new Map());
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const router = useRouter();

  // 為替レートを更新する関数
  const updateExchangeRate = async () => {
    try {
      setExchangeRateLoading(true);
      const rate = await fetchUSDJPYRate();
      console.log('為替レートを更新しました:', rate);
      setExchangeRate(rate);
      return rate;
    } catch (error) {
      console.error('為替レートの更新に失敗しました:', error);
      throw error;
    } finally {
      setExchangeRateLoading(false);
    }
  };

  // 10分おきに為替レートを更新
  useEffect(() => {
    // 初回実行
    updateExchangeRate();

    // 1分おきに更新（テスト用）
    const interval = setInterval(updateExchangeRate, 1 * 60 * 1000);

    // クリーンアップ関数
    return () => clearInterval(interval);
  }, []);

  /**
   * 株価情報と投資信託基準価格を取得する共通関数
   * @param stocksList 株式と投資信託のリスト
   * @param logPrefix ログ出力時のプレフィックス（初期ロード時か更新時かを区別するため）
   */
  const fetchPriceData = async (stocksList: Stock[], logPrefix: string = '取得') => {
    if (stocksList.length === 0) return;
    
    setPriceLoading(true);
    
    try {
      // 株式と投資信託に分ける
      const stockSymbols: string[] = [];
      const fundSymbols: string[] = [];
      
      stocksList.forEach(stock => {
        if (stock.assetType === 'fund') {
          fundSymbols.push(stock.symbol);
        } else {
          stockSymbols.push(stock.symbol);
        }
      });
      
      console.log(`${logPrefix}: 株式と投資信託に分類`, { 
        stocks: stockSymbols.length, 
        funds: fundSymbols.length,
        fundSymbols
      });
      
      // 株価情報を取得
      if (stockSymbols.length > 0) {
        try {
          const prices = await fetchMultipleStockPrices(stockSymbols);
          setStockPrices(prices);
          console.log(`株価情報${logPrefix}完了: ${prices.size}件`);
        } catch (error) {
          console.error(`株価情報の${logPrefix}中にエラーが発生しました:`, error);
        }
      }
      
      // 投資信託基準価格を取得
      if (fundSymbols.length > 0) {
        try {
          console.log(`投資信託基準価格の${logPrefix}を開始:`, fundSymbols);
          const prices = await fetchMultipleFundPrices(fundSymbols);
          console.log(`投資信託基準価格の${logPrefix}結果:`, { 
            [`${logPrefix}成功`]: prices.size, 
            [`${logPrefix}失敗`]: fundSymbols.length - prices.size,
            [`${logPrefix}したシンボル`]: Array.from(prices.keys())
          });
          setFundPrices(prices);
        } catch (error) {
          console.error(`投資信託基準価格の${logPrefix}中にエラーが発生しました:`, error);
        }
      }
    } finally {
      setPriceLoading(false);
    }
  };

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        
        // 為替レートを取得
        await updateExchangeRate();
        
        // 選択されたポートフォリオIDを取得
        const storedPortfolioId = localStorage.getItem('selectedPortfolioId');
        const portfolioId = storedPortfolioId ? Number(storedPortfolioId) : undefined;
        
        // 選択されたポートフォリオの情報を取得
        if (portfolioId) {
          try {
            const portfolio = await dbHelper.portfolios.findUnique({
              where: { id: portfolioId }
            });
            if (portfolio) {
              setCurrentPortfolio(portfolio);
              console.log('選択されたポートフォリオ:', portfolio.name);
            }
          } catch (error) {
            console.error('ポートフォリオの取得に失敗しました:', error);
          }
        }
        
        const stocksData = await dbHelper.stocks.findMany({
          orderBy: {
            symbol: 'asc',
          },
        });
        setStocks(stocksData);
        
        // 株価情報と投資信託基準価格を取得
        if (stocksData.length > 0) {
          await fetchPriceData(stocksData, '取得');
          
          // 各銘柄の所有数を計算（選択されたポートフォリオのみ）
          const quantities = new Map<number, number>();
          
          // 選択されたポートフォリオの購入記録を取得
          const purchases = await dbHelper.purchases.findMany({
            where: { portfolioId },
            orderBy: { purchaseDate: 'desc' }
          }) as Purchase[];
          
          for (const stock of stocksData) {
            // 銘柄IDでフィルタリング
            const stockPurchases = purchases.filter(purchase => purchase.stockId === stock.id);
            
            // 所有数を計算（購入数量の合計）
            const totalQuantity = stockPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
            if (stock.id !== undefined) {
              quantities.set(stock.id, totalQuantity);
            }
          }
          
          setStockQuantities(quantities);
        }
      } catch (error) {
        console.error('株式銘柄の取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  // 株価情報を手動で更新する関数
  const refreshPrices = async () => {
    if (stocks.length === 0) return;
    
    try {
      // 株価と投資信託の基準価格を取得
      await fetchPriceData(stocks, '更新');
      
      // 為替レートも更新
      try {
        const rate = await fetchUSDJPYRate();
        setExchangeRate(rate);
        console.log('為替レート更新完了:', rate);
      } catch (error) {
        console.error('為替レートの更新中にエラーが発生しました:', error);
      }
    } catch (error) {
      console.error('株価情報の更新に失敗しました:', error);
    }
  };

  // 為替レートを手動で更新する関数
  const updateExchangeRateManually = async () => {
    try {
      setExchangeRateLoading(true);
      
      // Server Actionを呼び出し
      const { updateExchangeRateManually } = await import('@/app/actions/exchange-rate');
      console.log('手動更新: Server Actionを呼び出します');
      const result = await updateExchangeRateManually();
      
      console.log('手動更新: Server Action結果:', result);
      
      if (result.success && result.rate) {
        setExchangeRate({
          rate: result.rate,
          lastUpdated: result.lastUpdated instanceof Date 
            ? result.lastUpdated 
            : new Date() // lastUpdatedがDateでない場合は現在時刻を使用
        });
        toast.success('為替レートを更新しました');
      } else {
        console.error('手動更新: 為替レート更新エラー:', result.error);
        toast.error(result.error || '為替レートの更新に失敗しました');
      }
    } catch (error) {
      console.error('手動更新: 為替レートの更新に失敗しました:', error);
      toast.error(error instanceof Error ? error.message : '為替レートの更新に失敗しました');
    } finally {
      setExchangeRateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-white">
            銘柄一覧
            {currentPortfolio && (
              <span className="ml-2 text-xl font-normal">
                (ポートフォリオ: {currentPortfolio.name})
              </span>
            )}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={refreshPrices}
              disabled={priceLoading}
              className="btn px-4 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${priceLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              {priceLoading ? '更新中...' : '株価を更新'}
            </button>
            <Link
              href="/stocks/new"
              className="btn px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              新しい銘柄を追加
            </Link>
          </div>
        </div>
        <div className="mt-4 text-white text-sm bg-indigo-500 bg-opacity-30 rounded-lg p-3">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            株価情報と為替レートは10分ごとに自動更新されます。手動で更新する場合は「株価を更新」ボタンをクリックしてください。
          </div>
        </div>
      </div>

      {stocks.length === 0 ? (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-8 rounded-xl text-center shadow-sm border border-amber-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-amber-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p className="text-amber-800 text-lg mb-6">登録されている銘柄がありません。</p>
          <Link
            href="/stocks/new"
            className="btn px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium shadow-md hover:shadow-lg transition-all inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            最初の銘柄を追加する
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    銘柄コード
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    銘柄名
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    投資国
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    資産タイプ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    現在値
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    評価額
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    所有数
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    購入記録
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    配当金記録
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stocks.map((stock: Stock) => {
                  const stockPrice = stockPrices.get(stock.symbol);
                  const fundPrice = fundPrices.get(stock.symbol);
                  return (
                    <tr key={stock.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                          {stock.symbol}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                        {stock.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded ${stock.country === '日本' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                          {stock.country}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded ${stock.assetType === 'stock' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                          {stock.assetType === 'stock' ? '株式' : '投資信託'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {stock.assetType === 'fund' ? (
                          fundPrice ? (
                            <span className="font-medium">
                              {fundPrice.price.toLocaleString()} 円
                            </span>
                          ) : (
                            <span className="text-gray-400">取得中...</span>
                          )
                        ) : (
                          stockPrice ? (
                            <span className="font-medium">
                              {stockPrice.price.toLocaleString()} {stockPrice.currency}
                            </span>
                          ) : (
                            <span className="text-gray-400">取得中...</span>
                          )
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {stock.id !== undefined && stockQuantities.has(stock.id) ? (
                          (() => {
                            const quantity = stockQuantities.get(stock.id) || 0;
                            const { value, currency } = calculateValue(
                              stock,
                              stockPrice,
                              fundPrice,
                              exchangeRate,
                              quantity
                            );
                            return value !== null ? (
                              <span className="font-medium text-green-600">
                                {value.toLocaleString()} {currency}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            );
                          })()
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {stock.id !== undefined && stockQuantities.has(stock.id) ? (
                          <span className="font-medium">
                            {stockQuantities.get(stock.id)?.toLocaleString() || 0}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/stocks/${stock.id}/purchases`}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          購入記録を見る
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/stocks/${stock.id}/dividends`}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          配当金記録を見る
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/stocks/${stock.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          編集
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm(`${stock.name}を削除してもよろしいですか？`)) {
                              if (stock.id !== undefined) {
                                dbHelper.stocks.delete({ where: { id: stock.id } }).then(() => {
                                  setStocks(stocks.filter(s => s.id !== stock.id));
                                  toast.success(`${stock.name}を削除しました`);
                                });
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}