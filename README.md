# Invest Vision 📈

投資ポートフォリオを効率的に管理・分析するためのWebアプリケーション

## 機能 🚀

- **ポートフォリオ管理**
  - 日本株・米国株の一元管理（`PortfolioManager`コンポーネント）
  - リアルタイムの為替レート反映（`ExchangeRateDisplay`コンポーネント）
  - 資産配分の可視化（`PortfolioSummary`コンポーネント）
  - リアルタイム更新インジケータ（`UpdateIndicator`コンポーネント）

- **投資分析**
  - スマートなリバランス提案
  - 国別・通貨別のパフォーマンス分析
  - 配当金の統合管理（`/dividends`ルート）
  - データベース編集機能（`DbEditor`コンポーネント）

- **資金管理**
  - 入出金記録（`/funds`ルート）
  - 投資可能額の自動計算
  - 取引履歴の詳細管理（`/purchases`ルート）
  - データ管理機能（`DataManagement`コンポーネント）

## 技術スタック 🛠

- **フロントエンド**
  - Next.js 14.1.0（App Router採用）
  - React 18.2.0
  - TailwindCSS 3.4.0
  - TypeScript 5.8.3

- **機能・ライブラリ**
  - リアルタイム更新（Socket.IO）
  - ダークモード対応（next-themes）
  - モダンUI（@heroicons/react, lucide-react）
  - フォーム最適化（@tailwindcss/forms）
  - アニメーション（animation-styles.tsx）

## プロジェクト構造 📁

```
app/
├── actions/        # サーバーアクション
├── api/           # APIエンドポイント
│   ├── exchange-rate/
│   ├── fund/
│   ├── portfolios/
│   ├── purchases/
│   ├── stock/
│   ├── stocks/
│   └── dividends/
├── components/    # 共有コンポーネント
│   ├── UpdateIndicator.tsx
│   ├── DataManagement.tsx
│   ├── DbEditor.tsx
│   ├── ExchangeRateDisplay.tsx
│   ├── Header.tsx
│   ├── NavHeader.tsx
│   ├── PortfolioManager.tsx
│   └── PortfolioSummary.tsx
├── hooks/        # カスタムフック
├── lib/         # ユーティリティ関数
├── utils/       # ヘルパー関数
└── [各機能ページ]/  # 機能別ページコンポーネント
```

## セットアップ 🔧

### 必要条件

- Node.js 18.0.0以上
- npm 9.0.0以上

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/invest-vision.git
cd invest-vision

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

### 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## 主要機能の使用方法 📱

1. **ポートフォリオの作成と管理**
   - PortfolioManagerコンポーネントを使用
   - 資産配分の設定と監視
   - リアルタイムの更新状態確認

2. **取引の記録**
   - `/purchases/new`で新規取引を記録
   - 取引履歴の管理と編集
   - 自動為替レート反映

3. **配当金の管理**
   - `/dividends`で配当金情報を記録
   - 通貨別の配当集計
   - 税引前/税引後の管理

4. **データ管理**
   - DataManagementコンポーネントでバックアップ
   - DbEditorで詳細なデータ編集
   - データの整合性チェック

## 開発者向け情報 👩‍💻

### 利用可能なスクリプト

```bash
# 開発サーバーの起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバーの起動
npm run start

# テストの実行
npm run test

# リンターの実行
npm run lint

# バンドル分析
npm run analyze
```

### コンポーネント設計

- **UpdateIndicator**: データ更新状態の視覚的フィードバック
- **PortfolioSummary**: 資産配分の包括的な表示
- **DataManagement**: データのバックアップと復元
- **DbEditor**: 詳細なデータ編集インターフェース

## アップデート履歴 📝

### v1.3.0
- リッチなUIデザインの実装
  - グラデーションとアニメーションの追加
  - カードデザインの改善
  - インタラクティブな要素の強化
- パフォーマンス最適化
  - バンドルサイズの最適化
  - 依存パッケージの更新
- アクセシビリティの向上
  - カラーコントラストの改善
  - フォーカス状態の視認性向上

### v1.2.0
- ダークモードのサポート追加
- パフォーマンス最適化（バンドルサイズ削減）
- アニメーション効果の実装
- UIの全体的な改善
- リアルタイム更新インジケータの追加

### v1.1.0
- リバランス提案機能の実装
- 為替レートの自動更新システム
- レスポンシブデザインの強化
- データ管理機能の拡充

## ライセンス 📄

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。

## 貢献 🤝

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## サポート 💬

問題や提案がありましたら、GitHubのIssueを作成してください。
