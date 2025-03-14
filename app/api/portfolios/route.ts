import { NextApiRequest, NextApiResponse } from 'next';
import { openDB } from '@/app/lib/db';

// ポートフォリオの追加
export async function addPortfolio(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await openDB();
    const tx = db.transaction('portfolios', 'readwrite');
    const store = tx.objectStore('portfolios');
    const { name, description } = req.body;
    const id = await store.add({ name, description });
    tx.oncomplete = () => {
      res.status(201).json({ success: true, id });
    };
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ポートフォリオの編集
export async function editPortfolio(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await openDB();
    const tx = db.transaction('portfolios', 'readwrite');
    const store = tx.objectStore('portfolios');
    const { id, name, description } = req.body;
    const existing = await store.get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }
    await store.put({ id, name, description });
    tx.oncomplete = () => {
      res.status(200).json({ success: true });
    };
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ポートフォリオの削除
export async function deletePortfolio(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await openDB();
    const tx = db.transaction('portfolios', 'readwrite');
    const store = tx.objectStore('portfolios');
    const { id } = req.body;
    await store.delete(id);
    tx.oncomplete = () => {
      res.status(200).json({ success: true });
    };
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
} 