import { useState, useEffect, useCallback } from 'react';
import { fetchUSDJPYRate } from '@/app/lib/exchangeApi';
import { toast } from 'react-hot-toast';

export interface ExchangeRateState {
  rate: number;
  lastUpdated: Date;
}

export interface UseExchangeRateResult {
  exchangeRate: ExchangeRateState;
  exchangeRateLoading: boolean;
  updateExchangeRate: (showToast?: boolean) => Promise<ExchangeRateState | null>;
  updateComplete: boolean;
}

export const DEFAULT_EXCHANGE_RATE: ExchangeRateState = {
  rate: 150,
  lastUpdated: new Date()
};

/**
 * 為替レート情報を取得・管理するカスタムフック
 * @param autoUpdateInterval 自動更新する間隔（ミリ秒）、デフォルトは10分
 * @param initialAutoUpdate 初回ロード時に自動更新するかどうか、デフォルトはtrue
 * @returns 為替レート情報と制御関数
 */
export function useExchangeRate(
  autoUpdateInterval: number = 10 * 60 * 1000,
  initialAutoUpdate: boolean = true
): UseExchangeRateResult {
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateState>(DEFAULT_EXCHANGE_RATE);
  const [exchangeRateLoading, setExchangeRateLoading] = useState<boolean>(false);
  const [updateComplete, setUpdateComplete] = useState<boolean>(false);

  // 為替レートを更新する関数
  const updateExchangeRate = useCallback(async (showToast: boolean = false) => {
    try {
      setExchangeRateLoading(true);
      setUpdateComplete(false);
      
      const rate = await fetchUSDJPYRate();
      console.log('為替レートを更新しました:', rate);
      setExchangeRate(rate);
      
      if (showToast) {
        toast.success('為替レートを更新しました');
      }
      
      // 更新完了のアニメーションを表示
      setUpdateComplete(true);
      
      // 3秒後にアニメーションを非表示
      setTimeout(() => {
        setUpdateComplete(false);
      }, 3000);
      
      return rate;
    } catch (error) {
      console.error('為替レートの更新中にエラーが発生しました:', error);
      if (showToast) {
        toast.error('為替レートの更新に失敗しました');
      }
      return null;
    } finally {
      setExchangeRateLoading(false);
    }
  }, []);

  // 初回ロード時の更新
  useEffect(() => {
    if (initialAutoUpdate) {
      updateExchangeRate();
    }
  }, [initialAutoUpdate, updateExchangeRate]);

  // 定期的な更新処理
  useEffect(() => {
    if (autoUpdateInterval <= 0) return;

    const interval = setInterval(() => {
      updateExchangeRate();
    }, autoUpdateInterval);

    return () => clearInterval(interval);
  }, [autoUpdateInterval, updateExchangeRate]);

  return {
    exchangeRate,
    exchangeRateLoading,
    updateExchangeRate,
    updateComplete
  };
} 