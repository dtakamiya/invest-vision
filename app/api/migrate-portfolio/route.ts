// このファイルは不要になったため、削除します。
// データ移行はクライアントサイドで実行されるようになりました。

export async function GET() {
  return new Response(JSON.stringify({ message: 'このAPIは廃止されました' }), {
    status: 410,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 