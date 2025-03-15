/**
 * 日付をフォーマットする関数
 * @param date フォーマットする日付
 * @param format フォーマット形式
 * @returns フォーマットされた日付文字列
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: 'date' | 'datetime' | 'full' | 'monthday' | 'time' | 'iso' | 'slash' = 'date'
): string {
  // nullやundefinedの場合は空文字を返す
  if (date === null || date === undefined) return '';
  
  // 文字列の場合はDateオブジェクトに変換
  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  // 無効な日付の場合は空文字を返す
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const seconds = dateObj.getSeconds();
  
  // 2桁表示のための関数
  const pad = (num: number): string => num.toString().padStart(2, '0');
  
  switch (format) {
    case 'date':
      return `${year}年${month}月${day}日`;
    case 'datetime':
      return `${year}年${month}月${day}日 ${pad(hours)}:${pad(minutes)}`;
    case 'full':
      return `${year}年${month}月${day}日 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    case 'monthday':
      return `${month}月${day}日`;
    case 'time':
      return `${pad(hours)}:${pad(minutes)}`;
    case 'iso':
      return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    case 'slash':
      return `${year}/${pad(month)}/${pad(day)}`;
    default:
      return `${year}年${month}月${day}日`;
  }
} 