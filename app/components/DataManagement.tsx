import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { dataManagement } from '@/app/lib/db';

export default function DataManagement() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  
  useEffect(() => {
    // ローカルストレージから最後のバックアップ日時を取得
    const lastBackupDate = localStorage.getItem('lastBackupDate');
    if (lastBackupDate) {
      setLastBackup(lastBackupDate);
    }
  }, []);

  // データをエクスポートする関数
  const handleExport = async () => {
    try {
      setExporting(true);
      
      // データをエクスポート
      const data = await dataManagement.exportData();
      
      // JSONファイルとしてダウンロード
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invest-vision-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // 最後のバックアップ日時を保存
      const now = new Date().toISOString();
      localStorage.setItem('lastBackupDate', now);
      setLastBackup(now);
      
      toast.success('データのエクスポートが完了しました');
    } catch (error) {
      console.error('エクスポート中にエラーが発生しました:', error);
      toast.error('データのエクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };
  
  // データをインポートする関数
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setImporting(true);
      
      // ファイルを読み込む
      const fileContent = await readFileAsText(file);
      const jsonData = JSON.parse(fileContent);
      
      // データをインポート
      await dataManagement.importData(jsonData);
      
      toast.success('データが正常にインポートされました');
      
      // ページをリロードして変更を反映
      window.location.reload();
    } catch (error) {
      console.error('インポート中にエラーが発生しました:', error);
      toast.error(`データのインポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setImporting(false);
      // ファイル選択をリセット
      event.target.value = '';
    }
  };
  
  // ファイルをテキストとして読み込む関数
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('ファイルの読み込みに失敗しました'));
        }
      };
      reader.onerror = () => reject(new Error('ファイルの読み込み中にエラーが発生しました'));
      reader.readAsText(file);
    });
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">データ管理</h2>
      
      {/* 最後のバックアップ日時 */}
      {lastBackup && (
        <div className="mb-6 text-sm text-gray-600">
          <p>最後のバックアップ: {new Date(lastBackup).toLocaleString('ja-JP')}</p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* エクスポート */}
        <div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {exporting ? 'エクスポート中...' : 'データをエクスポート'}
          </button>
          <p className="text-sm text-gray-600 mt-2">
            すべてのデータをJSONファイルとしてダウンロードします
          </p>
        </div>
        
        {/* インポート */}
        <div>
          <label className="block">
            <span className="sr-only">データをインポート</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={importing}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </label>
          <p className="text-sm text-gray-600 mt-2">
            {importing ? 'インポート中...' : 'JSONファイルからデータをインポートします'}
          </p>
          <p className="text-sm text-red-500 mt-1">
            注意: インポートすると既存のデータはすべて上書きされます
          </p>
        </div>

        {/* 注意事項 */}
        <div className="bg-amber-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            データ管理に関する注意事項
          </h3>
          <ul className="text-sm text-amber-700 space-y-2">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              ブラウザのデータを消去すると、保存したデータも削除されます
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              異なるブラウザやデバイス間でデータは共有されません
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              定期的なデータのバックアップを推奨します（週1回程度）
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
} 