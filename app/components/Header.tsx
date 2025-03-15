"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dbHelper, Portfolio } from '@/app/lib/db';

export default function Header() {
  const pathname = usePathname();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 現在のパスがアクティブかどうかを判定する関数
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  // ポートフォリオの取得
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        setIsLoading(true);
        const portfoliosData = await dbHelper.portfolios.findMany();
        setPortfolios(portfoliosData);
        
        // 現在選択されているポートフォリオIDを取得
        const storedPortfolioId = localStorage.getItem('currentPortfolioId');
        if (storedPortfolioId && portfoliosData.length > 0) {
          const currentId = Number(storedPortfolioId);
          const current = portfoliosData.find(p => p.id === currentId);
          if (current) {
            setCurrentPortfolio(current);
          } else {
            // 保存されているIDが見つからない場合は最初のポートフォリオを選択
            setCurrentPortfolio(portfoliosData[0]);
            localStorage.setItem('currentPortfolioId', String(portfoliosData[0].id));
          }
        } else if (portfoliosData.length > 0) {
          // ポートフォリオIDが保存されていない場合は最初のポートフォリオを選択
          setCurrentPortfolio(portfoliosData[0]);
          localStorage.setItem('currentPortfolioId', String(portfoliosData[0].id));
        }
      } catch (error) {
        console.error('ポートフォリオの取得中にエラーが発生しました:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPortfolios();
  }, []);

  // ポートフォリオの選択
  const selectPortfolio = (portfolio: Portfolio) => {
    setCurrentPortfolio(portfolio);
    localStorage.setItem('currentPortfolioId', String(portfolio.id));
    setIsDropdownOpen(false);
    
    // ページをリロードして選択したポートフォリオのデータを表示
    window.location.reload();
  };
  
  return (
    <header className="glass sticky top-0 z-50 backdrop-blur-md bg-white/80 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="flex justify-between items-center mb-4 md:mb-0">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text hover-scale">
              InvestVision
            </Link>
            
            {/* ポートフォリオ選択ドロップダウン */}
            <div className="relative ml-4">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center px-4 py-2 neumorphic hover-lift text-sm font-medium text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    読み込み中...
                  </span>
                ) : currentPortfolio ? (
                  <span className="font-medium">{currentPortfolio.name}</span>
                ) : (
                  <span>ポートフォリオなし</span>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 glass rounded-xl shadow-lg z-10 overflow-hidden">
                  <div className="py-2">
                    {portfolios.length > 0 ? (
                      <>
                        {portfolios.map((portfolio) => (
                          <button
                            key={portfolio.id}
                            onClick={() => selectPortfolio(portfolio)}
                            className={`block w-full text-left px-4 py-2 text-sm hover-scale transition-all ${
                              currentPortfolio?.id === portfolio.id
                                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {portfolio.name}
                          </button>
                        ))}
                        <div className="border-t border-gray-100 my-1"></div>
                        <Link
                          href="/portfolios"
                          className="block px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 hover-scale transition-all"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          ポートフォリオ管理
                        </Link>
                      </>
                    ) : (
                      <>
                        <div className="px-4 py-2 text-sm text-gray-500">
                          ポートフォリオがありません
                        </div>
                        <div className="border-t border-gray-100 my-1"></div>
                        <Link
                          href="/portfolios"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          ポートフォリオ管理
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* モバイル用メニューボタン（実装は省略） */}
          </div>
          
          <nav className="flex flex-wrap items-center gap-2 md:gap-3">
            <Link
              href="/"
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium hover-scale transition-all ${
                isActive('/') 
                  ? 'neumorphic text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${isActive('/') ? 'text-indigo-600' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              ホーム
            </Link>
            
            <Link
              href="/stocks"
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium hover-scale transition-all ${
                isActive('/stocks') 
                  ? 'neumorphic text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${isActive('/stocks') ? 'text-indigo-600' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              株式
            </Link>
            
            <Link
              href="/purchases"
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium hover-scale transition-all ${
                isActive('/purchases') 
                  ? 'neumorphic text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${isActive('/purchases') ? 'text-indigo-600' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
              購入記録
            </Link>
            
            <Link
              href="/dividends"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/dividends') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              配当
            </Link>
            
            <Link
              href="/funds"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/funds') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
              資金
            </Link>
            
            <Link
              href="/settings"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/settings') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              設定
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
} 