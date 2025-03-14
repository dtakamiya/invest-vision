"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dbHelper, InvestmentFund, Portfolio } from "@/app/lib/db";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, Trash2 } from "lucide-react";

export default function FundsPage() {
  const [funds, setFunds] = useState<InvestmentFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFunds, setTotalFunds] = useState(0);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    const fetchFunds = async () => {
      try {
        // 現在選択されているポートフォリオIDを取得
        const storedPortfolioId = localStorage.getItem('currentPortfolioId');
        let portfolioId: number | undefined;
        
        if (storedPortfolioId) {
          portfolioId = Number(storedPortfolioId);
          
          // 現在のポートフォリオ情報を取得
          const portfolio = await dbHelper.portfolios.findUnique({ 
            where: { id: portfolioId } 
          });
          
          if (portfolio) {
            setCurrentPortfolio(portfolio);
          }
        }
        
        // 選択されたポートフォリオのデータのみを取得
        const fundsData = await dbHelper.investmentFunds.findMany({
          where: { portfolioId },
          orderBy: {
            date: 'desc',
          },
        });
        setFunds(fundsData);
        
        // 選択されたポートフォリオの投資資金の合計を計算
        const total = await dbHelper.investmentFunds.getTotalFunds({
          where: { portfolioId }
        });
        setTotalFunds(total);
      } catch (error) {
        console.error('投資資金の取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFunds();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('この記録を削除してもよろしいですか？')) {
      return;
    }

    try {
      await dbHelper.investmentFunds.delete({ where: { id } });
      
      // 現在選択されているポートフォリオIDを取得
      const storedPortfolioId = localStorage.getItem('currentPortfolioId');
      const portfolioId = storedPortfolioId ? Number(storedPortfolioId) : undefined;
      
      // 再取得
      const fundsData = await dbHelper.investmentFunds.findMany({
        where: { portfolioId },
        orderBy: {
          date: 'desc',
        },
      });
      setFunds(fundsData);
      
      // 投資資金の合計を再計算
      const total = await dbHelper.investmentFunds.getTotalFunds({
        where: { portfolioId }
      });
      setTotalFunds(total);
    } catch (error) {
      console.error('投資資金の削除に失敗しました:', error);
      alert('投資資金の削除に失敗しました');
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
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-white">
            投資資金管理
            {currentPortfolio && (
              <span className="ml-2 text-xl font-normal">
                ({currentPortfolio.name})
              </span>
            )}
          </h1>
          <div className="flex gap-2">
            <Link
              href="/funds/deposit"
              className="btn btn-sm btn-secondary flex items-center gap-2"
            >
              <ArrowUpCircle className="w-4 h-4" />
              入金を記録
            </Link>
            <Link
              href="/funds/withdrawal"
              className="btn btn-sm btn-secondary flex items-center gap-2"
            >
              <ArrowDownCircle className="w-4 h-4" />
              出金を記録
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <h2 className="text-lg font-medium text-muted-foreground mb-2">現在の投資資金</h2>
          <p className="text-3xl font-bold">
            {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(totalFunds)}
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <h2 className="text-lg font-medium text-muted-foreground mb-2">入金合計</h2>
          <p className="text-3xl font-bold text-green-600">
            {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(
              funds.filter(fund => fund.type === 'deposit').reduce((sum, fund) => sum + fund.amount, 0)
            )}
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <h2 className="text-lg font-medium text-muted-foreground mb-2">出金合計</h2>
          <p className="text-3xl font-bold text-red-600">
            {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(
              funds.filter(fund => fund.type === 'withdrawal').reduce((sum, fund) => sum + fund.amount, 0)
            )}
          </p>
        </div>
      </div>

      {funds.length === 0 ? (
        <div className="bg-card p-8 rounded-xl text-center shadow-sm border border-border">
          <div className="w-16 h-16 mx-auto mb-4 text-muted-foreground">
            <PlusCircle className="w-full h-full" />
          </div>
          <h2 className="text-xl font-semibold mb-2">投資資金の記録がありません</h2>
          <p className="text-muted-foreground mb-6">
            「入金を記録」または「出金を記録」ボタンから投資資金の記録を追加してください。
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/funds/deposit"
              className="btn btn-primary btn-md"
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              入金を記録
            </Link>
            <Link
              href="/funds/withdrawal"
              className="btn btn-primary btn-md"
            >
              <ArrowDownCircle className="w-4 h-4 mr-2" />
              出金を記録
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-muted/50">
                <tr className="table-row">
                  <th className="table-head">日付</th>
                  <th className="table-head">種類</th>
                  <th className="table-head">金額</th>
                  <th className="table-head">説明</th>
                  <th className="table-head w-[100px]">操作</th>
                </tr>
              </thead>
              <tbody>
                {funds.map((fund) => (
                  <tr key={fund.id} className="table-row">
                    <td className="table-cell">
                      {new Date(fund.date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        fund.type === 'deposit' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {fund.type === 'deposit' ? '入金' : '出金'}
                      </span>
                    </td>
                    <td className="table-cell font-medium">
                      <span className={fund.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                        {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(fund.amount)}
                      </span>
                    </td>
                    <td className="table-cell">
                      {fund.description || '-'}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleDelete(fund.id as number)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 