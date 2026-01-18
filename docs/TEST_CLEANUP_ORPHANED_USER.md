# cleanup-orphaned-user API テストケース

## 概要

このドキュメントは `/api/auth/cleanup-orphaned-user` エンドポイントのセキュリティ修正後のテストケースを記載しています。

## テスト環境

- エンドポイント: `POST /api/auth/cleanup-orphaned-user`
- 認証: Supabase Auth セッション
- Content-Type: `application/json`

## テストケース

### 1. 未認証アクセスのテスト

**目的**: 認証なしでアクセスできないことを確認

**前提条件**: ログインしていない状態

**リクエスト**:
```bash
curl -X POST http://localhost:3000/api/auth/cleanup-orphaned-user \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**期待結果**:
- ステータスコード: `401`
- レスポンス: 
```json
{
  "error": "認証が必要です。ログインしてください。"
}
```
- サーバーログ: 
```
[CleanupOrphanedUser] Unauthorized access attempt to cleanup endpoint. Target: test@example.com
```

**検証項目**:
- [ ] 401 ステータスコードが返される
- [ ] エラーメッセージが適切
- [ ] サーバーログに未認証アクセスが記録される

---

### 2. 他人のアカウントのクリーンアップ試行

**目的**: 他人のアカウントをクリーンアップできないことを確認

**前提条件**: `user1@example.com` としてログイン済み

**リクエスト**:
```bash
# user1@example.com でログインした状態で
curl -X POST http://localhost:3000/api/auth/cleanup-orphaned-user \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"email":"user2@example.com"}'
```

**期待結果**:
- ステータスコード: `403`
- レスポンス:
```json
{
  "error": "他のユーザーのアカウントをクリーンアップすることはできません。"
}
```
- サーバーログ:
```
[CleanupOrphanedUser] Forbidden: User user1@example.com attempted to cleanup a different account
```

**検証項目**:
- [ ] 403 ステータスコードが返される
- [ ] エラーメッセージが適切
- [ ] サーバーログに権限エラーが記録される
- [ ] 対象アカウントのメールアドレスがログに含まれない（情報漏洩防止）

---

### 3. バリデーションエラー（メールアドレスなし）

**目的**: 必須パラメータのバリデーションが機能することを確認

**前提条件**: `user@example.com` としてログイン済み

**リクエスト**:
```bash
curl -X POST http://localhost:3000/api/auth/cleanup-orphaned-user \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{}'
```

**期待結果**:
- ステータスコード: `400`
- レスポンス:
```json
{
  "error": "メールアドレスが必要です"
}
```

**検証項目**:
- [ ] 400 ステータスコードが返される
- [ ] エラーメッセージが適切

---

### 4. 孤立アカウントが存在しない場合

**目的**: 孤立していないアカウントのクリーンアップ試行時の挙動を確認

**前提条件**: 
- `user@example.com` としてログイン済み
- `user@example.com` のアカウントは `auth.users` と `public.users` の両方に存在

**リクエスト**:
```bash
curl -X POST http://localhost:3000/api/auth/cleanup-orphaned-user \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"email":"user@example.com"}'
```

**期待結果**:
- ステータスコード: `200`
- レスポンス:
```json
{
  "success": true,
  "message": "ユーザーは正常に登録されています"
}
```
- サーバーログ:
```
[CleanupOrphanedUser] Authenticated cleanup attempt for: user@example.com
[CleanupOrphanedUser] User exists in both auth and public tables - not orphaned
```

**検証項目**:
- [ ] 200 ステータスコードが返される
- [ ] 成功メッセージが適切
- [ ] アカウントが削除されていない
- [ ] サーバーログに正常な判定が記録される

---

### 5. 孤立アカウントの正常なクリーンアップ

**目的**: 自分の孤立アカウントを正常にクリーンアップできることを確認

**前提条件**:
- `orphaned@example.com` としてログイン済み
- `orphaned@example.com` のアカウントは `auth.users` にのみ存在し、`public.users` には存在しない

**リクエスト**:
```bash
curl -X POST http://localhost:3000/api/auth/cleanup-orphaned-user \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"email":"orphaned@example.com"}'
```

**期待結果**:
- ステータスコード: `200`
- レスポンス:
```json
{
  "success": true,
  "message": "孤立したユーザーレコードを削除しました。再登録できます。"
}
```
- サーバーログ:
```
[CleanupOrphanedUser] Authenticated cleanup attempt for: orphaned@example.com
[CleanupOrphanedUser] Found orphaned auth user, deleting...
[CleanupOrphanedUser] AUDIT: User orphaned@example.com is deleting orphaned account with ID: xxx-xxx-xxx
[CleanupOrphanedUser] AUDIT: Successfully deleted orphaned account for orphaned@example.com
[CleanupOrphanedUser] Successfully deleted orphaned user
```

**検証項目**:
- [ ] 200 ステータスコードが返される
- [ ] 成功メッセージが適切
- [ ] `auth.users` からアカウントが削除される
- [ ] サーバーログに監査ログが記録される
- [ ] 監査ログに削除操作の開始と成功が記録される

---

### 6. 存在しないメールアドレスのクリーンアップ

**目的**: 存在しないメールアドレスでの挙動を確認

**前提条件**:
- `user@example.com` としてログイン済み
- `user@example.com` のアカウントは `auth.users` に存在しない

**リクエスト**:
```bash
curl -X POST http://localhost:3000/api/auth/cleanup-orphaned-user \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"email":"user@example.com"}'
```

**期待結果**:
- ステータスコード: `200`
- レスポンス:
```json
{
  "success": true,
  "message": "該当するユーザーが見つかりません"
}
```
- サーバーログ:
```
[CleanupOrphanedUser] Authenticated cleanup attempt for: user@example.com
[CleanupOrphanedUser] No auth user found for email
```

**検証項目**:
- [ ] 200 ステータスコードが返される
- [ ] メッセージが適切
- [ ] エラーではなく成功として扱われる

---

### 7. 削除エラーが発生した場合

**目的**: 削除処理でエラーが発生した場合の挙動を確認

**前提条件**:
- データベースエラーまたはSupabase APIエラーが発生する状態

**期待結果**:
- ステータスコード: `500`
- レスポンス:
```json
{
  "error": "孤立したユーザーの削除に失敗しました"
}
```
- サーバーログ:
```
[CleanupOrphanedUser] Error deleting orphaned user: <error details>
[CleanupOrphanedUser] AUDIT: Failed to delete orphaned account for <email> Error type: <error type>
```

**検証項目**:
- [ ] 500 ステータスコードが返される
- [ ] エラーメッセージが適切
- [ ] サーバーログにエラーが記録される
- [ ] 監査ログに削除失敗が記録される
- [ ] エラーの詳細メッセージがログには記録されるが、レスポンスには含まれない

---

## セキュリティ検証項目

### 認証・認可
- [ ] 未認証アクセスが 401 エラーで拒否される
- [ ] 他人のアカウントへのアクセスが 403 エラーで拒否される
- [ ] 自分のアカウントのみアクセス可能

### 監査ログ
- [ ] すべての認証試行がログに記録される
- [ ] 削除操作の開始、成功、失敗が監査ログに記録される
- [ ] 不正アクセス試行が警告ログとして記録される
- [ ] ログに適切な情報が含まれる（セキュリティ監視に必要）

### 情報漏洩防止
- [ ] エラーレスポンスに内部情報が含まれない
- [ ] データベースエラーの詳細がユーザーに公開されない
- [ ] 監査ログのエラー詳細が適切にサニタイズされる

### CodeQL セキュリティスキャン
- [ ] CodeQL スキャンでセキュリティ問題が検出されない

---

## 自動テストの実装（推奨）

以下のようなテストコードを作成することを推奨します:

```typescript
// __tests__/api/auth/cleanup-orphaned-user.test.ts

describe('POST /api/auth/cleanup-orphaned-user', () => {
  it('should return 401 when not authenticated', async () => {
    // テストコード
  });

  it('should return 403 when trying to cleanup another user', async () => {
    // テストコード
  });

  it('should return 400 when email is missing', async () => {
    // テストコード
  });

  it('should successfully cleanup orphaned account', async () => {
    // テストコード
  });

  it('should return success when account is not orphaned', async () => {
    // テストコード
  });
});
```

---

## 実施者記入欄

| テストケース | 実施日 | 結果 | 備考 |
|------------|--------|------|------|
| 1. 未認証アクセス | | | |
| 2. 他人のアカウント | | | |
| 3. バリデーションエラー | | | |
| 4. 孤立していない | | | |
| 5. 正常なクリーンアップ | | | |
| 6. 存在しないメール | | | |
| 7. 削除エラー | | | |

## まとめ

このテストケースを実施することで、`/api/auth/cleanup-orphaned-user` エンドポイントが以下の要件を満たしていることを確認できます:

1. ✅ 未認証アクセスで削除不可
2. ✅ 認可済み経路（自分のアカウント）のみが動作
3. ✅ 監査ログが残る
4. ✅ セキュリティが適切に実装されている
