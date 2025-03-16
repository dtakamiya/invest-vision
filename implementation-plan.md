# 評価額表示を少数第一位まで表示する機能追加 実装計画

## 1. 変更が必要なファイルとコード

分析の結果、以下のファイルの修正が必要です：

1. `app/page.tsx`
   - `calculateTotalValueByCountry` 関数でMath.roundを使用して整数に丸めている部分を修正
   - 評価額を表示している部分（複数箇所）でNumberFormatのmaximumFractionDigitsを変更

2. `app/stocks/page.tsx` 
   - `calculateValue` 関数でMath.roundを使用して整数に丸めている部分を修正
   - 評価額表示部分のフォーマットを変更

## 2. 具体的な変更内容

### 2.1 app/page.tsx の変更

1. `calculateTotalValueByCountry` 関数の返り値を修正
   ```typescript
   return {
     japanTotal: Math.round(japanTotal * 10) / 10,
     usTotal: Math.round(usTotal * 10) / 10,
     total: Math.round(total * 10) / 10
   };
   ```

2. 評価額表示部分のフォーマット変更（複数箇所）
   ```typescript
   // 変更前
   new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0, notation: 'compact' }).format(calculateTotalValueByCountry().total)
   
   // 変更後
   new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 1, notation: 'compact' }).format(calculateTotalValueByCountry().total)
   ```

### 2.2 app/stocks/page.tsx の変更

1. `calculateValue` 関数の結果を修正
   ```typescript
   // 投資信託の場合
   return {
     value: Math.round(stockPrice.price * quantity / 10000 * 10) / 10,
     currency: '円'
   };
   
   // USDの場合
   return {
     value: Math.round(stockPrice.price * quantity * exchangeRate.rate * 10) / 10,
     currency: '円'
   };
   
   // JPYの場合
   return {
     value: Math.round(stockPrice.price * quantity * 10) / 10,
     currency: '円'
   };
   ```

2. 評価額表示部分のフォーマット変更は特に必要ありません。現在の実装では `value.toLocaleString()` を使用しており、これは自動的に適切なフォーマットを適用します。

## 3. テスト計画

1. 単体テスト
   - `calculateTotalValueByCountry` 関数のテスト
   - `calculateValue` 関数のテスト

2. 動作検証
   - トップページでの評価額表示の確認
   - 株式一覧ページでの評価額表示の確認
   - 異なる数値での表示確認（整数値、小数値など）

## 4. 実装手順

1. app/page.tsx の修正
2. app/stocks/page.tsx の修正
3. 単体テストの作成と実行
4. 必要に応じてリファクタリング
5. 動作検証
6. コミット
7. mainブランチへのマージ

## 5. 注意事項

- 既存の機能に影響を与えないように注意して実装する
- 数値計算の精度に注意する（JavaScript特有の浮動小数点数の扱い）
- 表示フォーマットが一貫していることを確認する 