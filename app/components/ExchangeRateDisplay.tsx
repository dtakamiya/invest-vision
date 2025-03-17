import React from 'react';
import { ExchangeRateState } from '@/app/hooks/useExchangeRate';
import { RefreshCw } from 'lucide-react';
import { formatDate } from '@/app/utils/formatter';

interface ExchangeRateDisplayProps {
  exchangeRate: ExchangeRateState;
  loading: boolean;
  onRefresh: () => void;
  showUpdateTime?: boolean;
  updateComplete?: boolean;
}

/**
 * 為替レート表示コンポーネント
 */
export function ExchangeRateDisplay({
  exchangeRate,
  loading,
  onRefresh,
  showUpdateTime = true,
  updateComplete = false
}: ExchangeRateDisplayProps) {
  return (
    <div className="flex items-center space-x-1">
      <div className="flex items-center">
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className="text-sm font-semibold">USD/JPY</span>
            <span className="ml-2 font-bold">
              {exchangeRate.rate.toFixed(2)}
            </span>
            <span className="ml-1 text-xs text-gray-500">円</span>
          </div>
          {showUpdateTime && (
            <span className="text-xs text-gray-500">
              {formatDate(exchangeRate.lastUpdated)}更新
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`ml-2 p-1 rounded-full transition-colors ${
            loading
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-100'
          } ${updateComplete ? 'text-green-500' : ''}`}
          title="為替レートを更新"
        >
          <RefreshCw
            size={16}
            className={`${loading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
    </div>
  );
} 