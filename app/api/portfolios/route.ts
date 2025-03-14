import { NextRequest, NextResponse } from 'next/server';
import { openDB } from '@/app/lib/db';

// ポートフォリオの取得
export async function GET() {
  try {
    const db = await openDB();
    const tx = db.transaction('portfolios', 'readonly');
    const store = tx.objectStore('portfolios');
    const portfolios = await store.getAll();
    
    return NextResponse.json({ success: true, data: portfolios });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ポートフォリオの追加・編集・削除
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { action, portfolio } = data;
    const db = await openDB();
    
    if (action === 'add') {
      // ポートフォリオの追加
      const tx = db.transaction('portfolios', 'readwrite');
      const store = tx.objectStore('portfolios');
      const { name, description } = portfolio;
      
      return new Promise<Response>((resolve) => {
        const request = store.add({ name, description });
        
        request.onsuccess = () => {
          const id = request.result;
          resolve(NextResponse.json({ success: true, id }, { status: 201 }));
        };
        
        request.onerror = () => {
          resolve(NextResponse.json({ success: false, error: 'Failed to add portfolio' }, { status: 500 }));
        };
      });
    } else if (action === 'edit') {
      // ポートフォリオの編集
      const tx = db.transaction('portfolios', 'readwrite');
      const store = tx.objectStore('portfolios');
      const { id, name, description } = portfolio;
      
      return new Promise<Response>(async (resolve) => {
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          if (!getRequest.result) {
            resolve(NextResponse.json({ success: false, error: 'Portfolio not found' }, { status: 404 }));
            return;
          }
          
          const updateRequest = store.put({ id, name, description });
          
          updateRequest.onsuccess = () => {
            resolve(NextResponse.json({ success: true }, { status: 200 }));
          };
          
          updateRequest.onerror = () => {
            resolve(NextResponse.json({ success: false, error: 'Failed to update portfolio' }, { status: 500 }));
          };
        };
        
        getRequest.onerror = () => {
          resolve(NextResponse.json({ success: false, error: 'Failed to get portfolio' }, { status: 500 }));
        };
      });
    } else if (action === 'delete') {
      // ポートフォリオの削除
      const tx = db.transaction('portfolios', 'readwrite');
      const store = tx.objectStore('portfolios');
      const { id } = portfolio;
      
      return new Promise<Response>((resolve) => {
        const request = store.delete(id);
        
        request.onsuccess = () => {
          resolve(NextResponse.json({ success: true }, { status: 200 }));
        };
        
        request.onerror = () => {
          resolve(NextResponse.json({ success: false, error: 'Failed to delete portfolio' }, { status: 500 }));
        };
      });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}