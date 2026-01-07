# 開発ガイド

親子マッチングプラットフォームの開発に参加していただきありがとうございます。

## 開発環境のセットアップ

詳細は [SETUP.md](./SETUP.md) を参照してください。

## 開発ワークフロー

### ブランチ戦略

- `main` - 本番環境のコード
- `develop` - 開発環境のコード
- `feature/*` - 新機能開発
- `fix/*` - バグ修正
- `hotfix/*` - 緊急修正

### コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) の形式を推奨:

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメントの変更
style: コードスタイルの変更（機能変更なし）
refactor: リファクタリング
test: テストの追加・修正
chore: ビルドプロセスやツールの変更
```

例:
```
feat: Add AI growth photo generation
fix: Fix subscription webhook handling
docs: Update setup guide
```

## コーディング規約

### TypeScript

- 型を明示的に指定する
- `any` の使用は最小限に
- ESLint のルールに従う

### React / Next.js

- 関数コンポーネントを使用
- hooks を適切に使用
- Server Components と Client Components を適切に使い分ける

### CSS / Tailwind

- Tailwind CSS のユーティリティクラスを優先
- カスタム CSS は最小限に
- レスポンシブデザインを考慮

### ファイル構成

```
/app
  /api          - API ルート
  /auth         - 認証関連ページ
  /dashboard    - ダッシュボード
  /matching     - マッチング機能
  /messages     - メッセージ機能
  /payments     - 決済機能

/components     - 再利用可能なコンポーネント
  /auth         - 認証関連コンポーネント
  /matching     - マッチング関連
  /messages     - メッセージ関連
  /ui           - UI コンポーネント

/lib            - ユーティリティとヘルパー
  /supabase     - Supabase 設定
  /stripe       - Stripe 設定
  /openai       - OpenAI 設定
  /xid          - xID API 設定

/types          - TypeScript 型定義

/supabase       - Supabase マイグレーション
  /migrations   - マイグレーションファイル
  /seed         - シードデータ
```

## テスト

### 単体テスト

```bash
npm test
```

### 統合テスト

```bash
npm run test:integration
```

### E2E テスト

```bash
npm run test:e2e
```

## デバッグ

### ローカル開発

```bash
npm run dev
```

### ログ

- `console.log()` は開発環境のみ
- 本番環境では適切なロギングサービスを使用
- 機密情報をログに出力しない

## プルリクエスト

### 作成前のチェックリスト

- [ ] コードがビルドできる
- [ ] テストが通る
- [ ] ESLint エラーがない
- [ ] コミットメッセージが適切
- [ ] 関連する Issue がある場合はリンク

### PR テンプレート

```markdown
## 変更内容

[変更内容の説明]

## 関連 Issue

Closes #[Issue番号]

## テスト

- [ ] 単体テスト追加
- [ ] 統合テスト追加
- [ ] 手動テスト実施

## スクリーンショット

[必要に応じて]

## その他

[追加情報]
```

## セキュリティ

### 脆弱性の報告

セキュリティ上の脆弱性を発見した場合は、GitHub Issues ではなく、
直接メンテナーに連絡してください。

### セキュリティのベストプラクティス

- 機密情報をコードに含めない
- 環境変数を使用する
- SQL インジェクション対策
- XSS 対策
- CSRF 対策

## パフォーマンス

### 最適化のポイント

- 画像の最適化（Next.js Image コンポーネント使用）
- コード分割
- レンダリングの最適化
- データベースクエリの最適化

## アクセシビリティ

- セマンティック HTML を使用
- ARIA ラベルを適切に設定
- キーボードナビゲーションをサポート
- 色のコントラストを確保

## 国際化（将来対応）

- 多言語対応を考慮した設計
- ハードコードされたテキストは避ける
- 日付・通貨のフォーマットを適切に

## 質問・サポート

- GitHub Discussions で質問
- GitHub Issues でバグ報告
- コミュニティフォーラム（予定）

## ライセンス

このプロジェクトは Private ライセンスの下で提供されています。
