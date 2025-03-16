"use client";

import Link from "next/link";
import { dbHelper, Stock, Purchase, Portfolio, StockPriceData } from "@/app/lib/db";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMultipleStockPrices, StockPrice } from "@/app/lib/stockApi";
import { fetchUSDJPYRate } from "@/app/lib/exchangeApi";
import { toast } from 'react-hot-toast';

// 評価額を計算する関数
function calculateValue(
  stock: Stock,
  stockPrice: StockPrice | undefined,
  exchangeRate: { rate: number; lastUpdated: Date },
  quantity: number
): { value: number | null; currency: string } {
  // 株価情報がない場合はnullを返す
  if (!stockPrice) return { value: null, currency: '円' };
  
  // 数量が0の場合は0を返す
  if (quantity === 0) return { value: 0, currency: '円' };
  
  // 投資信託の場合は「口数×現在値/10000」で計算
  if (stock.assetType === 'fund') {
    return {
      value: Math.round(stockPrice.price * quantity / 10000 * 10) / 10,
      currency: '円'
    };
  }
  
  // USDの場合、為替レートを適用
  if (stockPrice.currency === 'USD') {
    return {
      value: Math.round(stockPrice.price * quantity * exchangeRate.rate * 10) / 10,
      currency: '円'
    };
  }
  
  return {
    value: Math.round(stockPrice.price * quantity * 10) / 10,
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
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [dataStatus, setDataStatus] = useState<'loading' | 'partial' | 'complete'>('loading');
  const router = useRouter();

  // 10分おきに為替レートを更新
  useEffect(() => {
    const updateExchangeRate = async () => {
      try {
        setExchangeRateLoading(true);
        const rate = await fetchUSDJPYRate();
        console.log('銘柄一覧ページで為替レートを更新しました:', rate);
        setExchangeRate(rate);
      } catch (error) {
        console.error('為替レートの更新に失敗しました:', error);
      } finally {
        setExchangeRateLoading(false);
      }
    };

    // 初回実行
    updateExchangeRate();

    // 10分おきに更新
    const interval = setInterval(updateExchangeRate, 10 * 60 * 1000);

    // クリーンアップ関数
    return () => clearInterval(interval);
  }, []);

  // 基本データの取得（ポートフォリオと株式リスト）
  useEffect(() => {
    const fetchBasicData = async () => {
      try {
        setLoading(true);
        
        // 現在選択されているポートフォリオIDを取得
        const storedPortfolioId = localStorage.getItem('currentPortfolioId');
        let portfolioId: number | undefined;
        
        if (storedPortfolioId) {
          portfolioId = Number(storedPortfolioId);
          
          // 現在のポートフォリオ情報を取得
          const portfolio = await dbHelper.portfolios.findUnique({ 
            where: { id: portfolioId } 
          });
          
          if (portfolio) {
            setCurrentPortfolio(portfolio);
          }
        }
        
        // 全ての銘柄を取得
        const stocksData = await dbHelper.stocks.findMany({
          orderBy: {
            symbol: 'asc',
          },
        });
        
        setStocks(stocksData);
        
        // 各銘柄の所有数を計算（選択されたポートフォリオのみ）
        if (portfolioId) {
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
        
        // 基本データの読み込みが完了したら、画面を表示
        setLoading(false);
        setDataStatus('partial');
        
        // DBから株価情報を取得
        await loadPricesFromDB(stocksData);
        
        // 価格データを非同期で取得
        console.log('fetchBasicData: 価格データの取得を開始します', { stocksCount: stocksData.length });
        fetchPriceData(stocksData);
        console.log('fetchBasicData: 価格データの取得を開始しました（非同期）');
        
      } catch (error) {
        console.error('株式銘柄の取得に失敗しました:', error);
        setLoading(false);
        toast.error('株式データの取得に失敗しました');
      }
    };

    fetchBasicData();
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

  // 価格データを非同期で取得する関数
  const fetchPriceData = async (stocksData: Stock[]) => {
    console.log('fetchPriceData関数が呼び出されました', { stocksCount: stocksData.length });
    
    if (stocksData.length === 0) {
      console.log('銘柄データが空のため、株価取得をスキップします');
      return;
    }
    
    try {
      setPriceLoading(true);
      
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
      
      console.log('価格データ取得: 株式と投資信託に分類', { 
        stocks: stockSymbols.length, 
        funds: fundSymbols.length
      });
      
      // 全ての銘柄（株式と投資信託）のシンボルを集める
      const allSymbols = [...stockSymbols, ...fundSymbols];
      console.log('全ての銘柄の価格情報取得を開始:', allSymbols);
      
      // 全ての銘柄の価格情報を一度に取得
      try {
        const prices = await fetchMultipleStockPrices(allSymbols);
        console.log('全ての銘柄の価格情報取得結果:', prices);
        
        // 既存の株価情報と統合
        const updatedPrices = new Map(stockPrices);
        prices.forEach((price, symbol) => {
          console.log(`価格情報を更新: ${symbol}, 価格: ${price.price}${price.currency}`);
          updatedPrices.set(symbol, price);
        });
        
        setStockPrices(updatedPrices);
        console.log(`価格情報取得完了: ${prices.size}件, 全体: ${updatedPrices.size}件`);
      } catch (error) {
        console.error('価格情報の取得中にエラーが発生しました:', error);
        toast.error('価格情報の取得に失敗しました');
      }
      
      setDataStatus('complete');
    } catch (error) {
      console.error('価格データの取得に失敗しました:', error);
      toast.error('価格データの取得に失敗しました');
    } finally {
      setPriceLoading(false);
    }
  };

  // 株価情報を手動で更新する関数
  const refreshPrices = async () => {
    if (stocks.length === 0) return;
    
    try {
      setPriceLoading(true);
      setDataStatus('partial');
      
      // 株式と投資信託に分ける
      const stockSymbols: string[] = [];
      const fundSymbols: string[] = [];
      
      stocks.forEach(stock => {
        if (stock.assetType === 'fund') {
          fundSymbols.push(stock.symbol);
          console.log(`投資信託を検出: ${stock.symbol}, ${stock.name}`);
        } else {
          stockSymbols.push(stock.symbol);
        }
      });
      
      console.log('株価更新: 株式と投資信託に分類', { 
        stocks: stockSymbols.length, 
        funds: fundSymbols.length,
        fundSymbols: fundSymbols.join(', ')
      });
      
      // 全ての銘柄（株式と投資信託）のシンボルを集める
      const allSymbols = [...stockSymbols, ...fundSymbols];
      console.log('全ての銘柄の価格情報更新を開始:', allSymbols);
      
      // 更新前の投資信託価格を記録
      const beforeFundPrices = new Map<string, StockPrice>();
      fundSymbols.forEach(symbol => {
        const price = stockPrices.get(symbol);
        if (price) {
          beforeFundPrices.set(symbol, price);
          console.log(`更新前の投資信託価格: ${symbol}, 価格: ${price.price}円, 更新日時: ${price.lastUpdated.toISOString()}`);
        } else {
          console.log(`更新前の投資信託価格なし: ${symbol}`);
        }
      });
      
      // 全ての銘柄の価格情報を一度に取得
      try {
        const prices = await fetchMultipleStockPrices(allSymbols);
        console.log('全ての銘柄の価格情報更新結果:', prices);
        
        // 投資信託の更新結果を確認
        fundSymbols.forEach(symbol => {
          const newPrice = prices.get(symbol);
          if (newPrice) {
            console.log(`投資信託価格更新成功: ${symbol}, 新価格: ${newPrice.price}円, 更新日時: ${newPrice.lastUpdated.toISOString()}`);
            const oldPrice = beforeFundPrices.get(symbol);
            if (oldPrice) {
              console.log(`投資信託価格比較: ${symbol}, 旧価格: ${oldPrice.price}円, 新価格: ${newPrice.price}円, 差額: ${newPrice.price - oldPrice.price}円`);
              if (newPrice.lastUpdated.getTime() === oldPrice.lastUpdated.getTime()) {
                console.warn(`警告: 投資信託の更新日時が変わっていません: ${symbol}`);
              }
            }
          } else {
            console.warn(`投資信託価格更新失敗: ${symbol}`);
          }
        });
        
        // 既存の株価情報と統合
        const updatedPrices = new Map(stockPrices);
        prices.forEach((price, symbol) => {
          console.log(`価格情報を更新: ${symbol}, 価格: ${price.price}${price.currency}`);
          updatedPrices.set(symbol, price);
        });
        
        setStockPrices(updatedPrices);
        console.log(`価格情報更新完了: ${prices.size}件, 全体: ${updatedPrices.size}件`);
        toast.success('価格情報を更新しました');
      } catch (error) {
        console.error('価格情報の更新中にエラーが発生しました:', error);
        toast.error('価格情報の更新に失敗しました');
      }
      
      // 為替レートも更新
      try {
        setExchangeRateLoading(true);
        const rate = await fetchUSDJPYRate();
        setExchangeRate(rate);
        console.log('為替レート更新完了:', rate);
        toast.success('為替レートを更新しました');
      } catch (error) {
        console.error('為替レートの更新中にエラーが発生しました:', error);
        toast.error('為替レートの更新に失敗しました');
      } finally {
        setExchangeRateLoading(false);
      }
      
      setDataStatus('complete');
    } catch (error) {
      console.error('株価情報の更新に失敗しました:', error);
      toast.error('価格データの更新に失敗しました');
    } finally {
      setPriceLoading(false);
    }
  };

  // 為替レートを手動で更新する関数
  const updateExchangeRateManually = async () => {
    try {
      setExchangeRateLoading(true);
      
      // 為替レートを取得
      const rate = await fetchUSDJPYRate();
      setExchangeRate(rate);
      console.log('為替レート手動更新完了:', rate);
      toast.success('為替レートを更新しました');
    } catch (error) {
      console.error('為替レートの手動更新に失敗しました:', error);
      toast.error('為替レートの更新に失敗しました');
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
                (所有数: {currentPortfolio.name})
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
          {dataStatus === 'partial' && (
            <div className="mt-2 flex items-center text-white">
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              株価情報を取得中です...
            </div>
          )}
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
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32"
                  >
                    シンボル
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-64"
                  >
                    銘柄名
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24"
                  >
                    投資国
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24"
                  >
                    種別
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-48"
                  >
                    現在値
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-48"
                  >
                    評価額
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32"
                  >
                    保有数
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32"
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
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                          {stock.symbol}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800 break-words whitespace-pre-wrap max-w-xs">
                          {stock.name}
                        </div>
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
                          // 投資信託の場合
                          stockPrice ? (
                            <div className="space-y-1">
                              <div className="font-bold text-gray-800">
                                {stockPrice.price.toLocaleString()} 円
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
                          ) : (
                            <div className="flex items-center text-gray-500">
                              {priceLoading ? (
                                <>
                                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  読み込み中...
                                </>
                              ) : (
                                <span className="text-gray-400 italic">取得できませんでした</span>
                              )}
                            </div>
                          )
                        ) : (
                          // 株式の場合
                          stockPrice ? (
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
                          ) : (
                            <div className="flex items-center text-gray-500">
                              {priceLoading ? (
                                <>
                                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  読み込み中...
                                </>
                              ) : (
                                <span className="text-gray-400 italic">取得できませんでした</span>
                              )}
                            </div>
                          )
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {stock.assetType === 'fund' ? (
                          // 投資信託の場合
                          <div className="font-bold text-gray-800">
                            {stockPrice ? (
                              (() => {
                                const value = calculateValue(
                                  stock, 
                                  stockPrice,
                                  exchangeRate, 
                                  stock.id !== undefined ? stockQuantities.get(stock.id as number) || 0 : 0
                                ).value;
                                return value === null ? '-' : `${value.toLocaleString()} 円`;
                              })()
                            ) : priceLoading ? (
                              <div className="flex items-center text-gray-500">
                                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                計算中...
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </div>
                        ) : (
                          // 株式の場合
                          <div className="font-bold text-gray-800">
                            {stockPrice ? (
                              <>
                                {(() => {
                                  const value = calculateValue(
                                    stock, 
                                    stockPrice,
                                    exchangeRate, 
                                    stock.id !== undefined ? stockQuantities.get(stock.id as number) || 0 : 0
                                  ).value;
                                  return value === null ? '-' : `${value.toLocaleString()} 円`;
                                })()}
                                {stockPrice.currency === 'USD' && (
                                  <div className="text-xs text-gray-500">
                                    （為替レート: {exchangeRate.rate.toFixed(2)}円/$）
                                    <div className="flex items-center">
                                      <span>更新: {exchangeRate.lastUpdated.toLocaleString('ja-JP')}</span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          updateExchangeRateManually();
                                        }}
                                        disabled={exchangeRateLoading}
                                        className="ml-2 p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100 transition-colors"
                                        title="為替レートを手動更新"
                                      >
                                        {exchangeRateLoading ? (
                                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                        ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                                          </svg>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : priceLoading ? (
                              <div className="flex items-center text-gray-500">
                                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                計算中...
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-bold text-gray-800">
                          {stock.id !== undefined ? stockQuantities.get(stock.id as number)?.toLocaleString() || 0 : 0}
                          {stock.assetType === 'fund' ? '口' : '株'}
                        </div>
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