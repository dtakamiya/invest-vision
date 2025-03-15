/**
 * 指定したミリ秒だけ処理を遅延させるPromiseを返す関数
 * @param ms 遅延させるミリ秒
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 