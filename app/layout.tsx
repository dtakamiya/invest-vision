import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Toaster } from 'react-hot-toast';
import { NavHeader } from './components/NavHeader';
import { APP_VERSION } from './lib/version';
import { AnimationStyles } from './components/animation-styles';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "投資ビジョン - 配当金・株式購入記録アプリ",
  description: "配当金の受け取りと株式購入を記録・管理するアプリケーション",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="overflow-x-hidden">
      <body className={`${inter.variable} antialiased bg-gray-50 min-h-screen flex flex-col overflow-x-hidden`}>
        <AnimationStyles />
        <NavHeader />
        <main className="container mx-auto px-3 py-4 sm:px-6 lg:px-8 flex-grow">
          {children}
        </main>
        <Toaster position="top-right" />
        <footer className="glass-dark text-gray-300 py-6 sm:py-10 mt-auto">
          <div className="container mx-auto px-3 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
              <div className="hover-lift">
                <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">投資ビジョン</h3>
                <p className="text-sm text-gray-400">
                  配当金の受け取りと株式購入を簡単に記録・管理できるアプリケーション
                </p>
              </div>
              <div className="hover-lift">
                <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">クイックリンク</h3>
                <ul className="space-y-3 text-sm">
                  <li className="hover-scale transition-all">
                    <Link href="/funds" className="hover:text-white transition-colors flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                      投資資金
                    </Link>
                  </li>
                  <li className="hover-scale transition-all">
                    <Link href="/stocks" className="hover:text-white transition-colors flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                      銘柄一覧
                    </Link>
                  </li>
                  <li className="hover-scale transition-all">
                    <Link href="/purchases" className="hover:text-white transition-colors flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                      </svg>
                      購入記録
                    </Link>
                  </li>
                  <li className="hover-scale transition-all">
                    <Link href="/dividends" className="hover:text-white transition-colors flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                      配当金記録
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="hover-lift">
                <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">データについて</h3>
                <p className="text-sm text-gray-400">
                  すべてのデータはブラウザのIndexedDBに保存され、サーバーには送信されません。
                </p>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-6 sm:mt-8 pt-4 sm:pt-6 text-center text-sm">
              <p>© {new Date().getFullYear()} 投資ビジョン - 配当金・株式購入記録アプリ</p>
              <p className="mt-2 text-gray-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                バージョン {APP_VERSION}
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
