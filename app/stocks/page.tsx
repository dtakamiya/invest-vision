"use client";

import Link from "next/link";
import { dbHelper, Stock, Purchase } from "@/app/lib/db";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMultipleStockPrices, StockPrice } from "@/app/lib/stockApi";
import { fetchUSDJPYRate } from "@/app/lib/exchangeApi";

// 評価額を計算する関数
function calculateValue(
  stock: Stock,
  stockPrice: StockPrice | undefined,
  exchangeRate: { rate: number; lastUpdated: Date },
  quantity: number
): { value: number | null; currency: string } {
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
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; lastUpdated: Date }>({ rate: 150, lastUpdated: new Date() });
  const [stockQuantities, setStockQuantities] = useState<Map<number, number>>(new Map());
  const router = useRouter();

  // 10分おきに為替レートを更新
  useEffect(() => {
    const updateExchangeRate = async () => {
      try {
        const rate = await fetchUSDJPYRate();
        setExchangeRate(rate);
      } catch (error) {
        console.error('為替レートの更新に失敗しました:', error);
      }
    };

    // 初回実行
    updateExchangeRate();

    // 10分おきに更新
    const interval = setInterval(updateExchangeRate, 10 * 60 * 1000);

    // クリーンアップ関数
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const stocksData = await dbHelper.stocks.findMany({
          orderBy: {
            symbol: 'asc',
          },
        });
        setStocks(stocksData);
        
        // 株価情報を取得
        if (stocksData.length > 0) {
          setPriceLoading(true);
          const symbols = stocksData.map(stock => stock.symbol);
          const prices = await fetchMultipleStockPrices(symbols);
          setStockPrices(prices);
          
          // 各銘柄の所有数を計算
          const quantities = new Map<number, number>();
          
          for (const stock of stocksData) {
            // 購入記録を取得
            const purchases = await dbHelper.purchases.findMany({
              orderBy: { purchaseDate: 'desc' }
            }) as Purchase[];
            
            // 銘柄IDでフィルタリング
            const stockPurchases = purchases.filter(purchase => purchase.stockId === stock.id);
            
            // 所有数を計算（購入数量の合計）
            const totalQuantity = stockPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
            if (stock.id !== undefined) {
              quantities.set(stock.id, totalQuantity);
            }
          }
          
          setStockQuantities(quantities);
          setPriceLoading(false);
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
      setPriceLoading(true);
      const symbols = stocks.map(stock => stock.symbol);
      const prices = await fetchMultipleStockPrices(symbols);
      setStockPrices(prices);
      
      // 為替レートも更新
      const rate = await fetchUSDJPYRate();
      setExchangeRate(rate);
    } catch (error) {
      console.error('株価情報の更新に失敗しました:', error);
    } finally {
      setPriceLoading(false);
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
          <h1 className="text-3xl font-bold text-white">銘柄一覧</h1>
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
                        {stockPrice ? (
                          <div className="space-y-1">
                            <div className="font-bold text-gray-800">
                              {stockPrice.price.toLocaleString()} {stockPrice.currency}
                            </div>
                            <div className={`flex items-center ${stockPrice.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {stockPrice.change >= 0 ? (
                                  <polyline points="18 15 12 9 6 15"></polyline>
                                ) : (
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                )}
                              </svg>
                              {stockPrice.change.toLocaleString()} ({stockPrice.changePercent.toFixed(2)}%)
                            </div>
                            <div className="text-xs text-gray-500">
                              更新: {stockPrice.lastUpdated.toLocaleString('ja-JP')}
                              <span className="ml-1 text-green-600 inline-flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                                </svg>
                              </span>
                            </div>
                          </div>
                        ) : priceLoading ? (
                          <div className="flex items-center text-gray-500">
                            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            読み込み中...
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">取得できませんでした</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {stockPrice ? (
                          <div className="font-bold text-gray-800">
                            {calculateValue(
                              stock, 
                              stockPrice, 
                              exchangeRate, 
                              stock.id !== undefined ? stockQuantities.get(stock.id as number) || 0 : 0
                            ).value?.toLocaleString()} 円
                            {stockPrice.currency === 'USD' && (
                              <div className="text-xs text-gray-500">
                                （為替レート: {exchangeRate.rate.toFixed(2)}円/$）
                                <div>
                                  更新: {exchangeRate.lastUpdated.toLocaleString('ja-JP')}
                                  <span className="ml-1 text-green-600 inline-flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                                    </svg>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-bold text-gray-800">
                          {stock.id !== undefined ? stockQuantities.get(stock.id as number)?.toLocaleString() || 0 : 0}株
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/stocks/${stock.id}/purchases`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
                            <rect x="9" y="3" width="6" height="4" rx="2"></rect>
                            <path d="M9 14l2 2 4-4"></path>
                          </svg>
                          購入記録を見る
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/stocks/${stock.id}/dividends`}
                          className="text-amber-600 hover:text-amber-800 font-medium flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                            <path d="M12 18V6"></path>
                          </svg>
                          配当金記録を見る
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/stocks/${stock.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <span className="sr-only">編集</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                          </Link>
                        </div>
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