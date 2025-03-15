import { fetchUSDJPYRate } from '@/app/lib/exchangeApi';

// fetchのモック
global.fetch = jest.fn();

describe('fetchUSDJPYRate', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    jest.resetAllMocks();
  });

  it('正常なレスポンスを処理できること', async () => {
    // モックレスポンスの設定
    const mockResponse = {
      rate: 148.61,
      lastUpdated: new Date().toISOString()
    };
    
    // fetchのモック実装
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    });

    // 関数を実行
    const result = await fetchUSDJPYRate();

    // 期待する結果の検証
    expect(result.rate).toBe(148.61);
    expect(result.lastUpdated).toBeInstanceOf(Date);
    
    // fetchが正しく呼び出されたか検証
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/exchange-rate\?_t=\d+/),
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        })
      })
    );
  });

  it('エラー発生時にデフォルト値を返すこと', async () => {
    // fetchがエラーを投げるようにモック
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    // 関数を実行
    const result = await fetchUSDJPYRate();

    // デフォルト値が返されることを検証
    expect(result.rate).toBe(150);
    expect(result.lastUpdated).toBeInstanceOf(Date);
    
    // コンソールエラーが呼び出されたことを検証
    expect(console.error).toHaveBeenCalledWith(
      '為替レートの取得中にエラーが発生しました:',
      expect.any(Error)
    );
  });

  it('手動更新フラグが正しく設定されること', async () => {
    // モックレスポンスの設定
    const mockResponse = {
      rate: 148.61,
      lastUpdated: new Date().toISOString()
    };
    
    // fetchのモック実装
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    });

    // 手動更新フラグをtrueにして関数を実行
    await fetchUSDJPYRate(true);

    // fetchが正しく呼び出されたか検証
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/exchange-rate\?_t=\d+&manual=true/),
      expect.any(Object)
    );
  });
});

// コンソールエラーのモック
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
}); 