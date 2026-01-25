# 認証セキュリティの実装

## 概要

このドキュメントでは、アプリケーションの認証セキュリティの実装について説明します。

## 認証保護の階層

### 1. ミドルウェアレベル（第一防御線）

**ファイル**: `lib/supabase/middleware.ts`

ミドルウェアは全てのリクエストに対して実行され、保護されたルートへのアクセスをチェックします。

#### 保護されたルート

以下のルートは認証が必要です：

- `/dashboard` - ダッシュボード
- `/matching` - マッチング検索
- `/messages` - メッセージ機能
- `/forum` - 掲示板機能
- `/payments` - 決済関連

#### 動作

1. Supabaseセッションから認証ユーザーを取得
2. 現在のパスが保護されたルートかチェック
3. 保護されたルートで未認証の場合：
   - `/auth/login`にリダイレクト
   - 元のURLをクエリパラメータ`redirect`に保存（ログイン後に元のページに戻れるよう）
   - Supabaseのクッキーを適切に保持

#### コード例

```typescript
// 保護されたルートで未認証の場合、ログインページにリダイレクト
if (isProtectedRoute && !user) {
  const redirectUrl = new URL('/auth/login', request.url);
  redirectUrl.searchParams.set('redirect', pathname);
  
  const response = NextResponse.redirect(redirectUrl);
  // クッキーを保持
  const cookies = supabaseResponse.cookies.getAll();
  cookies.forEach(({ name, value, ...options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}
```

### 2. クライアントコンポーネント（第二防御線）

**ファイル**: 
- `app/matching/page.tsx`
- `app/messages/page.tsx`
- `app/forum/page.tsx`

クライアントコンポーネントは`useEffect`フック内で認証をチェックします。これは以下の目的があります：

1. **UX向上**: ミドルウェアのリダイレクトを待たずに即座にリダイレクト
2. **フォールバック**: 何らかの理由でミドルウェアが機能しない場合の保険
3. **状態管理**: 認証状態に基づいてUIを動的に更新

#### コード例

```typescript
const checkAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    router.push('/auth/login');
  }
};

useEffect(() => {
  checkAuth();
  // ...
}, []);
```

### 3. サーバーコンポーネント（推奨パターン）

**ファイル**: `app/dashboard/page.tsx`

サーバーコンポーネントはサーバーサイドで認証をチェックし、未認証の場合は即座にリダイレクトします。

#### コード例

```typescript
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }
  
  // ...
}
```

## セキュリティ保証

### 実装された保護

✅ **未認証アクセス防止**: ミドルウェアが全ての保護されたルートへのアクセスをブロック
✅ **セッション検証**: Supabaseセッションの有効性を確認
✅ **クッキー保持**: リダイレクト時にセッションクッキーを適切に保持
✅ **統一されたパターン**: 全ての保護されたルートで一貫した認証チェック

### セキュリティリスクの軽減

- **データ漏洩**: 未認証ユーザーが保護されたページにアクセスできない
- **不正操作**: APIエンドポイントへのアクセスも認証が必要
- **セッションハイジャック**: Supabaseの安全なセッション管理を使用

## テストモード

開発環境では、テストモードを使用して認証チェックをバイパスできます。

**⚠️ 重要なセキュリティ警告:**
- テストモードは**開発環境でのみ使用**してください
- **本番環境では絶対に有効にしないでください**
- これらの環境変数が本番環境で設定されていると、重大なセキュリティリスクになります
- 本番環境では`NODE_ENV=production`が設定され、テスト用環境変数は自動的に無効化されます

### 環境変数

```bash
# .env.local
TEST_MODE_BYPASS_VERIFICATION=true  # マイナンバー認証をバイパス
TEST_MODE_BYPASS_SUBSCRIPTION=true  # サブスクリプションをバイパス
```

**セキュリティチェックリスト:**
- [ ] `.env.local`は`.gitignore`に含まれている
- [ ] 本番環境の環境変数にテストモード設定が含まれていない
- [ ] CI/CDパイプラインがテストモード環境変数を設定していない
- [ ] 本番デプロイ前にテストモード設定を削除している

詳細は`TEST_MODE.md`を参照してください。

## ミドルウェアの設定

**ファイル**: `proxy.ts`

Next.js 16では、ミドルウェアは`proxy.ts`ファイルで設定します。

```typescript
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // 静的ファイルと画像最適化を除外
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

## トラブルシューティング

### ログイン後にリダイレクトされない

1. ブラウザのクッキーが有効か確認
2. Supabaseセッションが正しく設定されているか確認
3. `redirect`クエリパラメータが正しく渡されているか確認

### 無限リダイレクトループ

1. `/auth/login`が保護されたルートに含まれていないことを確認
2. Supabaseの設定が正しいか確認
3. ミドルウェアのエラーログを確認

### テストモードが機能しない

1. `NODE_ENV=development`に設定されているか確認
2. `.env.local`ファイルが正しく読み込まれているか確認
3. 開発サーバーを再起動

## 今後の改善

- [x] ログインAPIへのレート制限実装（IPアドレス単位、1分5回・1時間20回）
- [x] 他のAPIエンドポイントへのレート制限適用
- [ ] 多要素認証（MFA）のサポート
- [ ] セッションタイムアウトの設定
- [x] 監査ログの実装
- [ ] CSRFトークンの追加

## 関連ドキュメント

- [TEST_MODE.md](./TEST_MODE.md) - テストモードの詳細
- [SETUP.md](./SETUP.md) - セットアップ手順
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
