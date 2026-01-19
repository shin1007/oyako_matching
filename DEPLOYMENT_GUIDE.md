# マッチ一覧API最適化 - デプロイ手順

## ⚠️ デプロイ前に必ず実行すること

### 1. データベースマイグレーション

以下のマイグレーションファイルを実行する必要があります：
- `supabase/migrations/027_matches_with_details_view.sql`

#### ローカル環境での実行方法

```bash
# Supabase CLIを使用
supabase migration up
```

#### 本番環境での実行方法

1. Supabaseダッシュボードにログイン
2. SQL Editorを開く
3. `supabase/migrations/027_matches_with_details_view.sql` の内容をコピー＆ペースト
4. 実行ボタンをクリック

### 2. 動作確認

マイグレーション後、以下のクエリで新しいビューが作成されていることを確認：

```sql
SELECT * FROM matches_with_details LIMIT 1;
```

### 3. アプリケーションのデプロイ

マイグレーションが成功したら、アプリケーションをデプロイします。

```bash
npm run build
# 本番環境にデプロイ
```

## API使用方法

### デフォルト（最初の20件を取得）
```
GET /api/messages/matches
```

### ページネーション
```
GET /api/messages/matches?page=2
GET /api/messages/matches?limit=50
GET /api/messages/matches?page=3&limit=30
```

## 注意事項

- **互換性**: 既存のクライアントコードは変更不要です
- **新機能**: レスポンスに `pagination` オブジェクトが追加されます
- **デフォルト件数**: 20件に制限されます（最大100件）
- **全件取得**: `?limit=100` で最大100件まで取得可能

## ロールバック方法

万が一問題が発生した場合：

```sql
-- ビューを削除
DROP VIEW IF EXISTS matches_with_details;

-- インデックスを削除（オプション）
DROP INDEX IF EXISTS idx_messages_match_sender_read;
DROP INDEX IF EXISTS idx_messages_match_created;
DROP INDEX IF EXISTS idx_matches_created_desc;
```

## サポート

詳細なドキュメント：
- `docs/MATCHES_API_OPTIMIZATION.md` - 技術詳細
- `docs/MATCHES_API_IMPLEMENTATION_SUMMARY.md` - 実装サマリー
