"use client";

import Link from "next/link";
import { dbHelper, Stock, Portfolio } from "@/app/lib/db";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewDividendPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockId, setStockId] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 現在選択されているポートフォリオIDを取得
        const storedPortfolioId = localStorage.getItem('currentPortfolioId');
        
        if (storedPortfolioId) {
          const portfolioId = Number(storedPortfolioId);
          
          // 現在のポートフォリオ情報を取得
          const portfolio = await dbHelper.portfolios.findUnique({ 
            where: { id: portfolioId } 
          });
          
          if (portfolio) {
            setCurrentPortfolio(portfolio);
          }
        }
        
        // 株式銘柄の取得
        const stocksData = await dbHelper.stocks.findMany({
          orderBy: {
            symbol: 'asc',
          },
        });
        setStocks(stocksData);
      } catch (error) {
        console.error('データの取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // バリデーション
      if (!stockId || !amount || !receivedDate) {
        alert("銘柄、配当金額、受取日は必須です");
        setIsSubmitting(false);
        return;
      }
      
      // 現在のポートフォリオIDを取得
      const portfolioId = currentPortfolio?.id;
      
      if (!portfolioId) {
        alert("ポートフォリオが選択されていません");
        setIsSubmitting(false);
        return;
      }

      // IndexedDBに保存
      await dbHelper.dividends.create({
        data: {
          stockId: parseInt(stockId),
          portfolioId,
          amount: parseFloat(amount),
          receivedDate: new Date(receivedDate),
          taxAmount: taxAmount ? parseFloat(taxAmount) : undefined,
          notes: notes || undefined,
        }
      });

      // 成功したら配当金記録一覧ページにリダイレクト
      router.push("/dividends");
    } catch (error) {
      console.error("配当金記録の作成中にエラーが発生しました:", error);
      alert("配当金記録の作成中にエラーが発生しました");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-white">
            新しい配当金記録を追加
            {currentPortfolio && (
              <span className="ml-2 text-xl font-normal">
                ({currentPortfolio.name})
              </span>
            )}
          </h1>
          <Link
            href="/dividends"
            className="btn btn-sm btn-secondary flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            配当金記録一覧に戻る
          </Link>
        </div>
      </div>

      {stocks.length === 0 ? (
        <div className="bg-card p-8 rounded-xl text-center shadow-sm border border-border">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-muted-foreground mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p className="text-foreground text-lg mb-6">
            配当金記録を追加するには、まず銘柄を登録する必要があります。
          </p>
          <Link
            href="/stocks/new"
            className="btn btn-primary flex items-center gap-2 mx-auto w-fit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            銘柄を追加する
          </Link>
        </div>
      ) : (
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="stockId" className="form-label block">
                  銘柄 <span className="text-destructive">*</span>
                </label>
                <select
                  id="stockId"
                  value={stockId}
                  onChange={(e) => setStockId(e.target.value)}
                  required
                  className="form-select"
                >
                  <option value="">銘柄を選択してください</option>
                  {stocks.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.symbol} - {stock.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="amount" className="form-label block">
                  配当金額（円） <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="0"
                  step="1"
                  className="form-input"
                  placeholder="例: 5000"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="receivedDate" className="form-label block">
                  受取日 <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  id="receivedDate"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="taxAmount" className="form-label block">
                  税額（円）
                </label>
                <input
                  type="number"
                  id="taxAmount"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  min="0"
                  step="1"
                  className="form-input"
                  placeholder="例: 1000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="form-label block">
                メモ
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="form-textarea"
                placeholder="メモを入力（任意）"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Link
                href="/dividends"
                className="btn btn-outline btn-md"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !currentPortfolio}
                className={`btn btn-primary btn-md ${(isSubmitting || !currentPortfolio) ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 