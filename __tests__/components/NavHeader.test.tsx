import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NavHeader } from '@/app/components/NavHeader';
import { dbHelper, Portfolio } from '@/app/lib/db';

// モックの設定
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

jest.mock('@/app/lib/db', () => ({
  dbHelper: {
    portfolios: {
      findMany: jest.fn(),
    },
  },
  Portfolio: jest.fn(),
}));

// localStorage のモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// location.reload のモック
Object.defineProperty(window, 'location', {
  value: {
    reload: jest.fn(),
  },
  writable: true
});

describe('NavHeader Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  test('ポートフォリオが正しく表示される', async () => {
    const mockPortfolios: Portfolio[] = [
      { id: 1, name: 'ポートフォリオ1', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'ポートフォリオ2', createdAt: new Date(), updatedAt: new Date() },
    ];

    (dbHelper.portfolios.findMany as jest.Mock).mockResolvedValue(mockPortfolios);

    render(<NavHeader />);

    // 最初は読み込み中が表示される
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();

    // データが読み込まれるとポートフォリオ名が表示される
    await waitFor(() => {
      expect(screen.getByText('ポートフォリオ1')).toBeInTheDocument();
    });
  });

  test('ポートフォリオ選択が機能する', async () => {
    const mockPortfolios: Portfolio[] = [
      { id: 1, name: 'ポートフォリオ1', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'ポートフォリオ2', createdAt: new Date(), updatedAt: new Date() },
    ];

    (dbHelper.portfolios.findMany as jest.Mock).mockResolvedValue(mockPortfolios);

    render(<NavHeader />);

    // ポートフォリオデータが読み込まれるのを待つ
    await waitFor(() => {
      expect(screen.getByText('ポートフォリオ1')).toBeInTheDocument();
    });

    // ドロップダウンをクリック
    fireEvent.click(screen.getByText('ポートフォリオ1'));

    // ドロップダウン内のアイテムが表示される
    await waitFor(() => {
      expect(screen.getByText('ポートフォリオ2')).toBeInTheDocument();
    });

    // 2番目のポートフォリオを選択
    fireEvent.click(screen.getByText('ポートフォリオ2'));

    // localStorageに保存されたか確認
    expect(localStorageMock.setItem).toHaveBeenCalledWith('currentPortfolioId', '2');
    
    // リロードが呼ばれたか確認
    expect(window.location.reload).toHaveBeenCalled();
  });

  test('ポートフォリオが存在しない場合の表示', async () => {
    (dbHelper.portfolios.findMany as jest.Mock).mockResolvedValue([]);

    render(<NavHeader />);

    // データが読み込まれると「ポートフォリオがありません」が表示される
    await waitFor(() => {
      expect(screen.getByText('ポートフォリオなし')).toBeInTheDocument();
    });

    // ドロップダウンをクリック
    fireEvent.click(screen.getByText('ポートフォリオなし'));

    // メッセージが表示される
    await waitFor(() => {
      expect(screen.getByText('ポートフォリオがありません')).toBeInTheDocument();
    });

    // ポートフォリオ管理リンクが表示される
    expect(screen.getByText('ポートフォリオ管理')).toBeInTheDocument();
  });

  test('ナビゲーションリンクが正しく表示される', async () => {
    (dbHelper.portfolios.findMany as jest.Mock).mockResolvedValue([]);

    render(<NavHeader />);

    // 各ナビゲーションリンクが表示される
    expect(screen.getByText('ホーム')).toBeInTheDocument();
    expect(screen.getByText('株式')).toBeInTheDocument();
    expect(screen.getByText('購入記録')).toBeInTheDocument();
    expect(screen.getByText('配当')).toBeInTheDocument();
    expect(screen.getByText('資金')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
  });
}); 