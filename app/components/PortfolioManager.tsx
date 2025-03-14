import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Portfolio {
  id: number;
  name: string;
  description: string;
}

const PortfolioManager: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    // ポートフォリオの取得
    const fetchPortfolios = async () => {
      try {
        const response = await fetch('/api/portfolios');
        const data = await response.json();
        if (data.success) {
          setPortfolios(data.portfolios);
        } else {
          toast.error('ポートフォリオの取得に失敗しました');
        }
      } catch (error) {
        console.error('ポートフォリオの取得中にエラーが発生しました:', error);
        toast.error('ポートフォリオの取得に失敗しました');
      }
    };
    fetchPortfolios();
  }, []);

  const addPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data = await response.json();
      if (data.success) {
        setPortfolios([...portfolios, { id: data.id, name, description }]);
        setName('');
        setDescription('');
        toast.success('ポートフォリオを追加しました');
      } else {
        toast.error('ポートフォリオの追加に失敗しました');
      }
    } catch (error) {
      console.error('ポートフォリオの追加中にエラーが発生しました:', error);
      toast.error('ポートフォリオの追加に失敗しました');
    }
  };

  const editPortfolio = async (id: number) => {
    try {
      const response = await fetch('/api/portfolios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, description }),
      });
      const data = await response.json();
      if (data.success) {
        setPortfolios(portfolios.map(p => (p.id === id ? { id, name, description } : p)));
        toast.success('ポートフォリオを編集しました');
      } else {
        toast.error('ポートフォリオの編集に失敗しました');
      }
    } catch (error) {
      console.error('ポートフォリオの編集中にエラーが発生しました:', error);
      toast.error('ポートフォリオの編集に失敗しました');
    }
  };

  const deletePortfolio = async (id: number) => {
    try {
      const response = await fetch('/api/portfolios', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (data.success) {
        setPortfolios(portfolios.filter(p => p.id !== id));
        toast.success('ポートフォリオを削除しました');
      } else {
        toast.error('ポートフォリオの削除に失敗しました');
      }
    } catch (error) {
      console.error('ポートフォリオの削除中にエラーが発生しました:', error);
      toast.error('ポートフォリオの削除に失敗しました');
    }
  };

  return (
    <div>
      <h2>ポートフォリオ管理</h2>
      <div>
        <input
          type="text"
          placeholder="ポートフォリオ名"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="説明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button onClick={addPortfolio}>追加</button>
      </div>
      <ul>
        {portfolios.map((portfolio) => (
          <li key={portfolio.id}>
            <span>{portfolio.name}</span>
            <span>{portfolio.description}</span>
            <button onClick={() => editPortfolio(portfolio.id)}>編集</button>
            <button onClick={() => deletePortfolio(portfolio.id)}>削除</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PortfolioManager; 