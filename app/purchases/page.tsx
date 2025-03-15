"use client";

import Link from "next/link";
import { dbHelper, Purchase, Stock, Portfolio } from "@/app/lib/db";
import { useEffect, useState } from "react";
import { formatDateLocale } from "@/app/utils/formatDate";
import { formatNumber, formatJPY } from "@/app/utils/formatCurrency";

type PurchaseWithStock = Purchase & {
  stock: Stock;
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInvestment, setTotalInvestment] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    const fetchPurchases = async () => {
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
        const purchasesData = await dbHelper.purchases.findMany({
          where: { portfolioId },
          include: {
            stock: true,
          },
          orderBy: {
            purchaseDate: 'desc',
          },
        }) as PurchaseWithStock[];

        setPurchases(purchasesData);
        
        // 購入金額の合計を計算
        const investment = purchasesData.reduce((sum, purchase) => {
          // 投資信託の場合は数量*単価/10000で計算
          if (purchase.stock.assetType === 'fund') {
            return sum + Math.round(purchase.price * purchase.quantity / 10000);
          }
          // 株式の場合は数量*単価で計算
          return sum + (purchase.price * purchase.quantity);
        }, 0);
        setTotalInvestment(investment);
        
        // 手数料の合計を計算
        const fees = purchasesData.reduce((sum, purchase) => sum + purchase.fee, 0);
        setTotalFees(fees);
      } catch (error) {
        console.error('購入記録の取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, []);

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
            株式購入記録
            {currentPortfolio && (
              <span className="ml-2 text-xl font-normal">
                ({currentPortfolio.name})
              </span>
            )}
          </h1>
          <Link
            href="/purchases/new"
            className="btn btn-sm btn-secondary flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            新しい購入記録を追加
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">総投資額</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(totalInvestment)}円</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">総手数料</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(totalFees)}円</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">購入記録数</p>
              <p className="text-2xl font-bold text-foreground">{purchases.length}件</p>
            </div>
          </div>
        </div>
      </div>

      {purchases.length === 0 ? (
        <div className="bg-card p-8 rounded-xl text-center shadow-sm border border-border">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-muted-foreground mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p className="text-foreground text-lg mb-6">登録されている購入記録がありません。</p>
          <Link
            href="/purchases/new"
            className="btn btn-primary flex items-center gap-2 mx-auto w-fit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            最初の購入記録を追加する
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="table-header">
                <tr className="table-row">
                  <th className="table-head">購入日</th>
                  <th className="table-head">銘柄</th>
                  <th className="table-head">数量</th>
                  <th className="table-head">単価</th>
                  <th className="table-head">合計</th>
                  <th className="table-head">手数料</th>
                  <th className="table-head">メモ</th>
                  <th className="table-head text-right">操作</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {purchases.map((purchase) => {
                  const totalAmount = purchase.quantity * purchase.price;
                  return (
                    <tr key={purchase.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          <span className="text-sm text-foreground">
                            {formatDateLocale(purchase.purchaseDate)}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <span className="badge badge-secondary mr-2">
                            {purchase.stock.symbol}
                          </span>
                          <span className="text-sm text-foreground">{purchase.stock.name}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-foreground">
                          {purchase.quantity.toLocaleString()}
                          {purchase.stock.assetType === 'fund' ? '口' : '株'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-foreground">{formatNumber(purchase.price)}円</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>
                          <span className="text-sm font-medium text-foreground">
                            {purchase.stock.assetType === 'fund' 
                              ? Math.round(purchase.quantity * purchase.price / 10000).toLocaleString()
                              : totalAmount.toLocaleString()}円
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-destructive mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                          </svg>
                          <span className="text-sm text-foreground">{formatNumber(purchase.fee)}円</span>
                        </div>
                      </td>
                      <td className="table-cell max-w-xs">
                        <div className="flex items-start">
                          {purchase.notes ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground mr-1.5 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                              <span className="text-sm text-foreground truncate">{purchase.notes}</span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">-</span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex justify-end space-x-3">
                          <Link
                            href={`/purchases/${purchase.id}/edit`}
                            className="text-primary hover:text-primary/80 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            編集
                          </Link>
                          <Link
                            href={`/purchases/${purchase.id}/delete`}
                            className="text-destructive hover:text-destructive/80 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            削除
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 