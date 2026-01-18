# テストモード設定ガイド

## 概要

開発環境でのテストを容易にするため、マイナンバー認証とサブスクリプション決済を個別にバイパスできるテストモードを実装しました。

## ⚠️ 重要な注意事項

**このテストモードは開発環境（`NODE_ENV=development`）でのみ動作します。**

本番環境（`NODE_ENV=production`）では、テスト用環境変数が設定されていても無効化され、通常の認証・認可フローが適用されます。

## 設定方法

### 1. 環境変数の設定

`.env.local`ファイルまたは`.env`ファイルに以下の環境変数を追加してください：

```bash
# 開発環境
NODE_ENV=development

# テストモード設定
# マイナンバー認証をバイパス（true: バイパス有効 / false: 通常チェック）
TEST_MODE_BYPASS_VERIFICATION=true

# サブスクリプションをバイパス（true: バイパス有効 / false: 通常チェック）
TEST_MODE_BYPASS_SUBSCRIPTION=false
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

## テストシナリオ

### シナリオ1: マイナンバー認証のみテスト

マイナンバー認証をバイパスして、サブスクリプションは通常チェック

```bash
TEST_MODE_BYPASS_VERIFICATION=true
TEST_MODE_BYPASS_SUBSCRIPTION=false
```

**動作：**
- ✅ マッチング機能（`/matching`）にアクセス可能（マイナンバー認証不要）
- ✅ メッセージ機能（`/messages`）にアクセス可能（マイナンバー認証不要）
- 🔒 親ユーザーはサブスクリプション登録が必要

**表示：**
- 青いバナー：「テストモード: マイナンバー認証がスキップされています」

### シナリオ2: サブスクリプションのみテスト

サブスクリプションをバイパスして、マイナンバー認証は通常チェック

```bash
TEST_MODE_BYPASS_VERIFICATION=false
TEST_MODE_BYPASS_SUBSCRIPTION=true
```

**動作：**
- 🔒 マッチング機能にアクセスするにはマイナンバー認証が必要
- 🔒 メッセージ機能にアクセスするにはマイナンバー認証が必要
- ✅ 親ユーザーはサブスクリプション登録不要

**表示：**
- 紫色のバナー：「テストモード: サブスクリプションがスキップされています」

### シナリオ3: 両方テスト

マイナンバー認証とサブスクリプション両方をバイパス

```bash
TEST_MODE_BYPASS_VERIFICATION=true
TEST_MODE_BYPASS_SUBSCRIPTION=true
```

**動作：**
- ✅ マッチング機能にアクセス可能
- ✅ メッセージ機能にアクセス可能
- すべての制限が解除される

**表示：**
- 青いバナー＋紫色のバナー両方表示

### シナリオ4: テストモード無効

通常の運用モード（全チェック有効）

```bash
TEST_MODE_BYPASS_VERIFICATION=false
TEST_MODE_BYPASS_SUBSCRIPTION=false
```

**動作：**
- 🔒 マイナンバー認証が必須
- 🔒 サブスクリプション登録が必須（親ユーザー）

## テストモード状態の確認

ダッシュボード（`/dashboard`）、マッチングページ（`/matching`）、メッセージページ（`/messages`）の上部にバナーが表示されます：

- **青いバナー** = マイナンバー認証バイパス中
- **紫色のバナー** = サブスクリプションバイパス中

## テストモードで依然として必要なこと

テストモードでも以下は必須です：

- ユーザー登録（メールアドレス + パスワード）
- ログイン（認証済みユーザーである必要があります）
- プロフィール情報の登録（マッチングアルゴリズムに必要）

## 実装の詳細

### 影響を受けるAPIルート

1. **`/api/matching/search`**
   - `TEST_MODE_BYPASS_VERIFICATION=true` で `verification_status`チェックをバイパス
   - `TEST_MODE_BYPASS_SUBSCRIPTION=true` でサブスクリプションチェックをバイパス

2. **`/api/matching/create`**
   - `TEST_MODE_BYPASS_SUBSCRIPTION=true` でサブスクリプションチェックをバイパス

3. **ダッシュボード（`/dashboard`）**
   - `TEST_MODE_BYPASS_VERIFICATION=true` で本人確認不要表示に変更
   - `TEST_MODE_BYPASS_SUBSCRIPTION=true` でサブスクリプション不要表示に変更

### コード例

```typescript
import { 
  isTestModeBypassVerificationEnabled, 
  isTestModeBypassSubscriptionEnabled 
} from '@/lib/utils/testMode';

// マイナンバー認証チェック
const bypassVerification = isTestModeBypassVerificationEnabled();
if (!bypassVerification && userData.verification_status !== 'verified') {
  return NextResponse.json(
    { error: '本人確認が必要です' },
    { status: 403 }
  );
}

// サブスクリプションチェック
const bypassSubscription = isTestModeBypassSubscriptionEnabled();
if (!bypassSubscription && userData.role === 'parent') {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single();

  if (!subscription || subscription.status !== 'active') {
    return NextResponse.json(
      { error: 'アクティブなサブスクリプションが必要です' },
      { status: 403 }
    );
  }
}
```

## セキュリティ上の注意

- **本番環境では絶対にテストモードを有効にしないでください**
- テストモードは開発・デバッグ目的でのみ使用してください
- `.env.local`ファイルはGitにコミットしないでください（`.gitignore`に含まれています）

## トラブルシューティング

### テストモードが動作しない

1. `NODE_ENV`が`development`に設定されているか確認
   ```bash
   echo $env:NODE_ENV  # Windows PowerShell
   # または
   echo $NODE_ENV      # Linux/Mac
   ```

2. `.env.local`または`.env`に環境変数が設定されているか確認

3. 開発サーバーを再起動
   ```bash
   # サーバーを停止して再起動
   npm run dev
   ```

### ダッシュボードのリンクがアクティブにならない

- ページをリロード（F5 または Ctrl+R）してください
- ブラウザのキャッシュをクリアしてください（Ctrl+Shift+Delete）

### 依然として認証エラーが発生する

- ログインしているか確認してください（テストモードでもログインは必須です）
- プロフィール情報が登録されているか確認してください

## 関連ファイル

- `.env.local` / `.env.example` - 環境変数設定
- `lib/utils/testMode.ts` - テストモード判定関数
- `app/api/matching/search/route.ts` - マッチング検索API
- `app/api/matching/create/route.ts` - マッチング作成API
- `app/api/test-mode/status/route.ts` - テストモード状態確認API
- `app/dashboard/page.tsx` - ダッシュボード
- `app/matching/page.tsx` - マッチングページ
- `app/messages/page.tsx` - メッセージページ
