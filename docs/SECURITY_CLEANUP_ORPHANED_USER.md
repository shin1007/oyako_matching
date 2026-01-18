# セキュリティ対応: cleanup-orphaned-user API の保護

## 概要

`/api/auth/cleanup-orphaned-user` エンドポイントのセキュリティ脆弱性を修正しました。

## 問題点（修正前）

### 脆弱性の内容

- **認証不要**: 誰でもAPIにアクセス可能
- **任意のメール削除**: 他人のメールアドレスを指定して auth.users からユーザーを削除可能
- **監査ログなし**: 削除操作の記録が不十分
- **レート制限なし**: 大量のリクエストによる攻撃の可能性

### セキュリティリスク

1. **悪意のある攻撃者が任意のユーザーアカウントを削除できる**
2. **正規ユーザーのアカウントを削除することでサービス妨害が可能**
3. **攻撃の追跡が困難**

## 実装した対策

### 1. 認証の追加

```typescript
// ログインユーザーの取得
const supabase = await createClient();
const {
  data: { user: authenticatedUser },
  error: authError,
} = await supabase.auth.getUser();

// 認証されていない場合は401エラー
if (authError || !authenticatedUser) {
  return NextResponse.json(
    { error: '認証が必要です。ログインしてください。' },
    { status: 401 }
  );
}
```

### 2. 認可チェック（自分のアカウントのみ）

```typescript
// ユーザーは自分自身のメールアドレスのみクリーンアップ可能
if (authenticatedUser.email !== email) {
  return NextResponse.json(
    { error: '他のユーザーのアカウントをクリーンアップすることはできません。' },
    { status: 403 }
  );
}
```

### 3. 監査ログの追加

すべての重要な操作にAUDITログを追加：

- **認証試行**: 誰がどのメールをクリーンアップしようとしたか
- **不正アクセス試行**: 未認証または他人のアカウントへのアクセス
- **削除操作**: 削除の開始、成功、失敗
- **エラー**: すべてのエラーの詳細

## API仕様（修正後）

### エンドポイント
```
POST /api/auth/cleanup-orphaned-user
```

### 認証
**必須**: ログインセッションが必要

### リクエスト
```json
{
  "email": "user@example.com"
}
```

### レスポンス

#### 成功（200）
```json
{
  "success": true,
  "message": "孤立したユーザーレコードを削除しました。再登録できます。"
}
```

#### 認証エラー（401）
```json
{
  "error": "認証が必要です。ログインしてください。"
}
```

#### 権限エラー（403）
```json
{
  "error": "他のユーザーのアカウントをクリーンアップすることはできません。"
}
```

#### バリデーションエラー（400）
```json
{
  "error": "メールアドレスが必要です"
}
```

## テストケース

### 1. 未認証アクセスのテスト

**期待結果**: 401 エラー

```bash
# ログインなしでリクエスト
curl -X POST http://localhost:3000/api/auth/cleanup-orphaned-user \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 期待レスポンス
# {"error":"認証が必要です。ログインしてください。"}
```

### 2. 他人のアカウントのクリーンアップ試行

**期待結果**: 403 エラー

```bash
# user1@example.com でログインして user2@example.com を削除しようとする
# 期待レスポンス
# {"error":"他のユーザーのアカウントをクリーンアップすることはできません。"}
```

### 3. 自分のアカウントの正常なクリーンアップ

**期待結果**: 200 成功

```bash
# user@example.com でログインして user@example.com の孤立アカウントを削除
# 期待レスポンス（孤立している場合）
# {"success":true,"message":"孤立したユーザーレコードを削除しました。再登録できます。"}
```

## 監査ログの確認方法

サーバーログで以下のパターンを検索：

```bash
# 不正アクセス試行
grep "Unauthorized access attempt" logs/

# 権限エラー（他人のアカウントへのアクセス）
grep "Forbidden: User" logs/

# 削除操作の監査ログ
grep "AUDIT:" logs/
```

### ログ出力例

```
[CleanupOrphanedUser] Unauthorized access attempt for email: victim@example.com
[CleanupOrphanedUser] Forbidden: User attacker@example.com attempted to cleanup victim@example.com
[CleanupOrphanedUser] AUDIT: User user@example.com is deleting orphaned account with ID: abc-123-def
[CleanupOrphanedUser] AUDIT: Successfully deleted orphaned account for user@example.com
[CleanupOrphanedUser] AUDIT: Failed to delete orphaned account for user@example.com Error: Database error
```

## 今後の検討事項

### 実装済み ✅
- 認証の追加
- 認可チェック（自分のアカウントのみ）
- 監査ログの追加

### 今後の改善候補
1. **レート制限の追加**: 短時間に大量のリクエストを防ぐ（例: 1ユーザーあたり1時間に3回まで）
2. **データベース監査ログ**: コンソールログだけでなく、データベースにも記録
3. **管理者通知**: 異常な削除パターンが検出された場合の管理者への通知
4. **IP制限**: 特定の地域からのアクセス制限（必要に応じて）

## セキュリティチェックリスト

- [x] 認証が必須になっている
- [x] 他人のアカウントを削除できない
- [x] すべての操作が監査ログに記録される
- [x] エラーメッセージが適切（情報漏洩なし）
- [x] 401/403のHTTPステータスコードが適切に使用されている
- [ ] レート制限の実装（今後の改善）
- [ ] データベース監査ログ（今後の改善）

## 関連ファイル

- `/app/api/auth/cleanup-orphaned-user/route.ts`: 修正されたAPIエンドポイント
- `/lib/supabase/server.ts`: 認証用のSupabaseクライアント
- `/lib/supabase/admin.ts`: 管理操作用のSupabaseクライアント

## 参照

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
