"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateDividendsPortfolio } from '@/app/actions/update-dividends-portfolio';

export default function UpdateDividendsPortfolioPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    updatedCount?: number;
    message?: string;
  }>({});

  const handleUpdateDividends = async () => {
    if (!confirm('すべての配当記録のポートフォリオIDを5に変更します。この操作は元に戻せません。よろしいですか？')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await updateDividendsPortfolio();
      setResult(result);
      
      if (result.success) {
        // 3秒後に設定画面に遷移
        setTimeout(() => {
          router.push('/settings');
        }, 3000);
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold mb-1">
            データベース操作
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            配当記録のポートフォリオID一括更新
          </h1>
          <p className="text-gray-600 mb-6">
            すべての配当記録のポートフォリオIDを5に変更します。この操作は元に戻せません。
          </p>

          <div className="mb-6">
            <button
              onClick={handleUpdateDividends}
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  処理中...
                </span>
              ) : (
                'ポートフォリオIDを一括更新'
              )}
            </button>
          </div>

          {result.success === true && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">成功!</strong>
              <span className="block sm:inline">
                {' '}
                {result.message}
              </span>
              <p className="mt-2 text-sm">
                3秒後に設定画面に移動します...
              </p>
            </div>
          )}

          {result.success === false && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">エラー!</strong>
              <span className="block sm:inline"> {result.error}</span>
            </div>
          )}

          <div className="mt-4 flex justify-between">
            <Link
              href="/settings"
              className="text-indigo-600 hover:text-indigo-800"
            >
              設定に戻る
            </Link>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-800"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 