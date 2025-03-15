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
    <div className="glass p-8 rounded-xl">
      <h2 className="text-2xl font-semibold mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-transparent bg-clip-text">データ管理</h2>
      
      {/* 最後のバックアップ日時 */}
      {lastBackup && (
        <div className="mb-6 text-sm text-gray-600">
          <p>最後のバックアップ: {new Date(lastBackup).toLocaleString('ja-JP')}</p>
        </div>
      )}
      
      <div className="space-y-8">
        {/* エクスポート */}
        <div className="hover-lift transition-all">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full gradient-btn hover-scale disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                エクスポート中...
              </span>
            ) : 'データをエクスポート'}
          </button>
          <p className="text-sm text-gray-600 mt-3">
            すべてのデータをJSONファイルとしてダウンロードします
          </p>
        </div>
        
        {/* インポート */}
        <div className="neumorphic-inset p-6 rounded-xl">
          <label className="block">
            <span className="text-lg font-medium text-gray-700 mb-3 block">データをインポート</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={importing}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-gradient-to-r file:from-blue-600 file:to-cyan-600 file:text-white
                hover:file:opacity-90
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </label>
          <p className="text-sm text-gray-600 mt-3">
            {importing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                インポート中...
              </span>
            ) : 'JSONファイルからデータをインポートします'}
          </p>
          <p className="text-sm text-red-500 mt-2">
            注意: インポートすると既存のデータはすべて上書きされます
          </p>
        </div>

        {/* 注意事項 */}
        <div className="glass-dark p-6 rounded-xl text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <svg className="h-6 w-6 mr-2 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            データ管理に関する注意事項
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start hover-scale transition-all">
              <svg className="h-6 w-6 text-amber-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>ブラウザのデータを消去すると、保存したデータも削除されます</span>
            </li>
            <li className="flex items-start hover-scale transition-all">
              <svg className="h-6 w-6 text-amber-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>異なるブラウザやデバイス間でデータは共有されません</span>
            </li>
            <li className="flex items-start hover-scale transition-all">
              <svg className="h-6 w-6 text-amber-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>定期的なデータのバックアップを推奨します（週1回程度）</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
} 