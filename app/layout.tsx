import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// アプリケーションのバージョン情報
const APP_VERSION = '0.1.6';

export const metadata: Metadata = {
  title: "投資ビジョン - 配当金・株式購入記録アプリ",
  description: "配当金の受け取りと株式購入を記録・管理するアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} antialiased bg-gray-50 min-h-screen flex flex-col`}>
        <Header />
        <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-grow">
          {children}
        </main>
        <Toaster position="top-right" />
        <footer className="bg-gray-800 text-gray-300 py-8 mt-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">投資ビジョン</h3>
                <p className="text-sm">
                  配当金の受け取りと株式購入を簡単に記録・管理できるアプリケーション
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">クイックリンク</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/funds" className="hover:text-white transition-colors">投資資金</Link></li>
                  <li><Link href="/stocks" className="hover:text-white transition-colors">銘柄一覧</Link></li>
                  <li><Link href="/purchases" className="hover:text-white transition-colors">購入記録</Link></li>
                  <li><Link href="/dividends" className="hover:text-white transition-colors">配当金記録</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">データについて</h3>
                <p className="text-sm">
                  すべてのデータはブラウザのIndexedDBに保存され、サーバーには送信されません。
                </p>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm">
              <p>© {new Date().getFullYear()} 投資ビジョン - 配当金・株式購入記録アプリ</p>
              <p className="mt-2 text-gray-400">バージョン {APP_VERSION}</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
