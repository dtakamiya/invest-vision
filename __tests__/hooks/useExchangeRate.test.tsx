import { renderHook, waitFor, act } from '@testing-library/react';
import { useExchangeRate } from '@/app/hooks/useExchangeRate';
import { fetchUSDJPYRate } from '@/app/lib/exchangeApi';

// fetchUSDJPYRateのモック
jest.mock('@/app/lib/exchangeApi', () => ({
  fetchUSDJPYRate: jest.fn()
}));

// toastのモック
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

describe('useExchangeRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // fetchUSDJPYRateの戻り値をモック
    (fetchUSDJPYRate as jest.Mock).mockResolvedValue({
      rate: 145.5,
      lastUpdated: new Date('2023-01-01T12:00:00Z')
    });
    
    // setTimeout のモック
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  it('初期値が正しく設定されること', () => {
    const { result } = renderHook(() => useExchangeRate(0, false)); // 自動更新を無効化
    
    expect(result.current.exchangeRate.rate).toBe(150);
    expect(result.current.exchangeRateLoading).toBe(false);
    expect(result.current.updateComplete).toBe(false);
  });

  it('updateExchangeRate関数を呼び出すと為替レートが更新されること', async () => {
    const { result } = renderHook(() => useExchangeRate(0, false)); // 自動更新を無効化
    
    // 最初のレンダリング後の状態を確認
    expect(result.current.exchangeRate.rate).toBe(150);
    
    // updateExchangeRate関数を呼び出す
    await act(async () => {
      await result.current.updateExchangeRate();
    });
    
    // 更新後の状態を確認
    expect(result.current.exchangeRate.rate).toBe(145.5);
    expect(result.current.exchangeRateLoading).toBe(false);
    expect(result.current.updateComplete).toBe(true);
    
    // 3秒後にupdateCompleteがfalseになることを確認
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    expect(result.current.updateComplete).toBe(false);
  });

  it('初回ロード時に自動更新されること', async () => {
    const { result } = renderHook(() => useExchangeRate(0, true));
    
    // 非同期更新の完了を待つ
    await waitFor(() => {
      expect(result.current.exchangeRateLoading).toBe(false);
    });
    
    // 更新後の状態を確認
    expect(result.current.exchangeRate.rate).toBe(145.5);
  });

  it('定期的に自動更新されること', async () => {
    const { result } = renderHook(() => useExchangeRate(5000, false));
    
    // 初期状態を確認
    expect(result.current.exchangeRate.rate).toBe(150);
    
    // 5秒経過させる
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // 非同期更新の完了を待つ
    await waitFor(() => {
      expect(fetchUSDJPYRate).toHaveBeenCalled();
    });
    
    // 非同期更新を反映させる
    await act(async () => {
      await Promise.resolve();
    });
    
    // 更新後の状態を確認
    expect(result.current.exchangeRate.rate).toBe(145.5);
  });

  it('API呼び出しが失敗した場合にエラー処理が行われること', async () => {
    // API呼び出しが失敗するようにモックを設定
    (fetchUSDJPYRate as jest.Mock).mockRejectedValue(new Error('API error'));
    
    const { result } = renderHook(() => useExchangeRate(0, true));
    
    // 非同期処理の完了を待つ
    await waitFor(() => {
      expect(fetchUSDJPYRate).toHaveBeenCalled();
    });
    
    // エラー後の状態を確認
    expect(result.current.exchangeRateLoading).toBe(false);
    // デフォルト値が維持されること
    expect(result.current.exchangeRate.rate).toBe(150);
  });
}); 