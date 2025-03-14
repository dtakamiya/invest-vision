"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { dbHelper, Portfolio } from "@/app/lib/db";
import { ArrowLeft, Save } from "lucide-react";

export default function WithdrawalPage() {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const router = useRouter();

  // 現在のポートフォリオを取得
  useEffect(() => {
    const fetchCurrentPortfolio = async () => {
      const storedPortfolioId = localStorage.getItem('currentPortfolioId');
      
      if (storedPortfolioId) {
        try {
          const portfolioId = Number(storedPortfolioId);
          const portfolio = await dbHelper.portfolios.findUnique({ 
            where: { id: portfolioId } 
          });
          
          if (portfolio) {
            setCurrentPortfolio(portfolio);
          }
        } catch (error) {
          console.error('ポートフォリオの取得中にエラーが発生しました:', error);
        }
      }
    };
    
    fetchCurrentPortfolio();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!amount || !date) {
        alert("金額と日付は必須です");
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

      await dbHelper.investmentFunds.create({
        data: {
          amount: parseFloat(amount),
          date: new Date(date),
          description: description || undefined,
          type: 'withdrawal',
          portfolioId
        }
      });

      router.push("/funds");
    } catch (error) {
      console.error("出金記録の作成中にエラーが発生しました:", error);
      alert("出金記録の作成中にエラーが発生しました");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-white">
            出金を記録
            {currentPortfolio && (
              <span className="ml-2 text-xl font-normal">
                ({currentPortfolio.name})
              </span>
            )}
          </h1>
          <Link
            href="/funds"
            className="btn btn-sm btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            投資資金一覧に戻る
          </Link>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="amount" className="form-label block">
                出金額（円） <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                step="1"
                className="form-input"
                placeholder="例: 50000"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="date" className="form-label block">
                出金日 <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="form-label block">
              説明
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="form-textarea"
              placeholder="説明を入力（任意）"
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Link
              href="/funds"
              className="btn btn-outline btn-md"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !currentPortfolio}
              className={`btn btn-primary btn-md ${(isSubmitting || !currentPortfolio) ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 