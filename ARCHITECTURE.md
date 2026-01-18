# アーキテクチャドキュメント

## システム概要

親子マッチングプラットフォームは、親子断絶・実子誘拐後の再会を支援するためのWebアプリケーションです。

## 技術スタック

### フロントエンド
- **Next.js 15** - React ベースのフルスタックフレームワーク
- **App Router** - 最新のルーティングシステム
- **TypeScript** - 型安全性の確保
- **Tailwind CSS** - ユーティリティファーストの CSS フレームワーク

### バックエンド
- **Supabase**
  - PostgreSQL データベース
  - 認証システム (Auth)
  - Row Level Security (RLS)
  - リアルタイム機能
  
- **API Routes**
  - Next.js API Routes で実装
  - サーバーレス関数として動作

### 外部サービス
- **xID API** - マイナンバーカード認証
- **Stripe** - サブスクリプション決済
- **OpenAI API** - AI 機能
  - テキスト埋め込み (text-embedding-3-small)
  - コンテンツモデレーション
  - 画像生成 (DALL-E 3)

## データベース設計

### テーブル構成

#### users
ユーザーの基本情報と認証状態

```sql
- id (UUID, PK)
- email (TEXT)
- role (TEXT: 'parent' | 'child')
- verification_status (TEXT: 'pending' | 'verified' | 'failed')
- mynumber_verified (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### profiles
ユーザーのプロフィール情報

```sql
- id (UUID, PK)
- user_id (UUID, FK -> users)
- last_name_kanji (TEXT)
- last_name_hiragana (TEXT)
- first_name_kanji (TEXT)
- first_name_hiragana (TEXT)
- birth_date (DATE)
- birthplace_prefecture (TEXT)
- birthplace_municipality (TEXT)
- gender (TEXT)
- profile_image_url (TEXT)
- bio (TEXT)
- forum_display_name (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### matches
マッチング情報

```sql
- id (UUID, PK)
- parent_id (UUID, FK -> users)
- child_id (UUID, FK -> users)
- similarity_score (DECIMAL)
- status (TEXT: 'pending' | 'accepted' | 'rejected' | 'blocked')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### messages
マッチング間のメッセージ

```sql
- id (UUID, PK)
- match_id (UUID, FK -> matches)
- sender_id (UUID, FK -> users)
- content (TEXT)
- created_at (TIMESTAMP)
- read_at (TIMESTAMP)
```

#### subscriptions
Stripe サブスクリプション管理

```sql
- id (UUID, PK)
- user_id (UUID, FK -> users)
- stripe_customer_id (TEXT)
- stripe_subscription_id (TEXT)
- status (TEXT: 'active' | 'canceled' | 'past_due' | 'incomplete')
- current_period_start (TIMESTAMP)
- current_period_end (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## セキュリティ設計

### Row Level Security (RLS)

Supabase の RLS により、各ユーザーは自分のデータのみアクセス可能:

- **users**: 自分の情報のみ閲覧・更新可能
- **profiles**: 自分のプロフィールのみ管理可能
- **matches**: 自分が関与するマッチングのみ閲覧可能
- **messages**: 承認済みマッチングのメッセージのみ閲覧可能

### 本人確認

1. **マイナンバーカード認証 (xID API)**
   - カード読み取りによる厳格な本人確認
   - 氏名と生年月日の取得
   - マイナンバー（個人番号）は取得しない

2. **年齢確認**
   - 子ユーザーは12歳以上必須
   - 生年月日による自動検証

### プライバシー保護

1. **非公開照合**
   - マッチング前に個人情報は非公開
   - 類似度スコアのみ表示
   - 双方の同意後にメッセージ可能

2. **コンテンツモデレーション**
   - OpenAI Moderation API による自動審査
   - 不適切なコンテンツの検出と拒否

3. **ストーカー規制法対応**
   - 拒否・ブロック機能
   - 一方的なコンタクト防止

## マッチングアルゴリズム

### マッチング機能

1. 生年月日による絞り込み
2. プロフィール情報によるマッチング
3. 双方の合意によるマッチング成立

### マッチング基準

- **生年月日**: 正確な一致が必要
- **役割**: parent と child のペアのみ

## 決済フロー

### サブスクリプション作成

1. ユーザーが「サブスクリプション開始」をクリック
2. Stripe Checkout セッションを作成
3. Stripe の決済ページへリダイレクト
4. 決済完了後、Webhook で subscriptions テーブルを更新
5. ダッシュボードへリダイレクト

### 継続課金

- Stripe が自動的に毎月請求
- Webhook で subscription status を更新
- `past_due` の場合、マッチング機能を制限

## AI 機能

### コンテンツモデレーション

```typescript
const moderation = await moderateContent(text);
if (moderation.flagged) {
  // コンテンツを拒否
}
```

### AI 成長写真生成

```typescript
const imageUrl = await generateGrowthPhoto(prompt, age);
// DALL-E 3 で生成
```

## スケーラビリティ

### パフォーマンス最適化

- **インデックス**: 頻繁にクエリされるカラムにインデックス
- **ベクトル検索**: ivfflat インデックスで高速化
- **キャッシング**: Next.js の組み込みキャッシュ
- **CDN**: 静的アセットは CDN 配信

### 水平スケーリング

- Next.js はステートレスなのでスケールアウト容易
- Supabase は自動スケーリング
- Vercel は自動スケーリング対応

## モニタリング

### 推奨ツール

- **Vercel Analytics** - パフォーマンス監視
- **Supabase Dashboard** - データベース監視
- **Stripe Dashboard** - 決済監視
- **Sentry** - エラートラッキング

### 主要メトリクス

- ユーザー登録数
- マッチング成功率
- サブスクリプション継続率
- API レスポンス時間
- エラー率

## 今後の拡張性

### 機能拡張案

- ビデオ通話機能
- AI カウンセリング
- コミュニティフォーラム
- モバイルアプリ
- 多言語対応

### 技術的拡張

- リアルタイムチャット（Supabase Realtime）
- プッシュ通知
- ファイル共有（Supabase Storage）
- 詳細分析ダッシュボード
