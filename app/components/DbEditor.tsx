"use client";

import { useState, useEffect } from 'react';
import { dbHelper } from '@/app/lib/db';
import Link from 'next/link';

// テーブル名の型定義
type TableName = 'portfolios' | 'stocks' | 'purchases' | 'dividends' | 'investmentFunds';

export default function DbEditor() {
  const [selectedTable, setSelectedTable] = useState<TableName | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // テーブルデータを取得する関数
  const fetchTableData = async (tableName: TableName) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dbHelper[tableName].findMany();
      setTableData(data);
    } catch (err) {
      console.error(`テーブル ${tableName} のデータ取得中にエラーが発生しました:`, err);
      setError(`テーブル ${tableName} のデータ取得中にエラーが発生しました`);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  // テーブル選択時にデータを取得
  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  // テーブル名の表示名マッピング
  const tableDisplayNames: Record<TableName, string> = {
    portfolios: 'ポートフォリオ',
    stocks: '銘柄',
    purchases: '購入記録',
    dividends: '配当記録',
    investmentFunds: '投資資金'
  };

  // 各テーブルの詳細画面へのリンクを生成する関数
  const getDetailLink = (tableName: TableName, id: number) => {
    switch (tableName) {
      case 'portfolios':
        return `/db-editor/portfolios/${id}`;
      case 'stocks':
        return `/db-editor/stocks/${id}`;
      case 'purchases':
        return `/db-editor/purchases/${id}`;
      case 'dividends':
        return `/db-editor/dividends/${id}`;
      case 'investmentFunds':
        return `/db-editor/investment-funds/${id}`;
      default:
        return '#';
    }
  };

  // テーブルデータの表示
  const renderTableData = () => {
    if (!selectedTable) return null;
    if (loading) return <div className="text-center py-4">データを読み込み中...</div>;
    if (error) return <div className="text-red-500 py-4">{error}</div>;
    if (tableData.length === 0) return <div className="text-center py-4">データがありません</div>;

    // テーブルのカラム名を取得
    const columns = Object.keys(tableData[0]).filter(col => 
      // 複雑なオブジェクトや長すぎるデータは表示しない
      typeof tableData[0][col] !== 'object' || tableData[0][col] === null
    );

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              {columns.map(column => (
                <th key={column} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column}
                </th>
              ))}
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map(column => (
                  <td key={`${rowIndex}-${column}`} className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {formatCellValue(row[column])}
                  </td>
                ))}
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {row.id && (
                    <Link
                      href={getDetailLink(selectedTable, row.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      詳細/編集
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // セルの値をフォーマットする関数
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toLocaleString('ja-JP');
    if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
    return String(value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">データベース編集</h2>
      <p className="text-gray-600 mb-4">
        各テーブルのデータを表示・編集することができます。編集は慎重に行ってください。
      </p>

      {/* テーブル選択 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">テーブルを選択</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(tableDisplayNames) as TableName[]).map(tableName => (
            <button
              key={tableName}
              onClick={() => setSelectedTable(tableName)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedTable === tableName
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tableDisplayNames[tableName]}
            </button>
          ))}
        </div>
      </div>

      {/* テーブルデータ表示 */}
      {selectedTable && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {tableDisplayNames[selectedTable]}テーブル
            </h3>
            <Link
              href={`/db-editor/${selectedTable}/new`}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
            >
              新規作成
            </Link>
          </div>
          {renderTableData()}
        </div>
      )}
    </div>
  );
} 