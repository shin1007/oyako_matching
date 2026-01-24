# マッチ一覧API最適化ドキュメント

## 概要

`/api/messages/matches` エンドポイントのN+1問題を解決し、ページネーション機能を実装しました。

## 実施した変更

### 1. データベース最適化 (Migration 027)

#### 新規ビュー: `matches_with_details`

マッチ、ユーザー、プロフィール情報をJOINで結合したビューを作成しました。

```sql
CREATE OR REPLACE VIEW matches_with_details AS
SELECT 
  m.id,
  m.parent_id,
  m.child_id,
  m.similarity_score,
  m.status,
  m.created_at,
  m.updated_at,
  -- 親ユーザー情報
  u_parent.role as parent_role,
  p_parent.last_name_kanji as parent_last_name_kanji,
  p_parent.first_name_kanji as parent_first_name_kanji,
  p_parent.profile_image_url as parent_profile_image_url,
  -- 子ユーザー情報
  u_child.role as child_role,
  p_child.last_name_kanji as child_last_name_kanji,
  p_child.first_name_kanji as child_first_name_kanji,
  p_child.profile_image_url as child_profile_image_url
FROM public.matches m
LEFT JOIN public.users u_parent ON m.parent_id = u_parent.id
LEFT JOIN public.profiles p_parent ON m.parent_id = p_parent.user_id
LEFT JOIN public.users u_child ON m.child_id = u_child.id
LEFT JOIN public.profiles p_child ON m.child_id = p_child.user_id;
```

#### 新規インデックス

パフォーマンス向上のため以下のインデックスを追加：

- `idx_messages_match_sender_read`: メッセージの未読検索を高速化
- `idx_messages_match_created`: 最終メッセージ取得を高速化
- `idx_matches_created_desc`: マッチ一覧の並び替えを高速化

### 2. API エンドポイント最適化

#### 変更前の問題点

```typescript
// N+1問題: マッチごとにループで複数のクエリを実行
const matchesWithProfiles = await Promise.all(
  matchesData.map(async (match) => {
    // 1. ユーザー情報取得
    const { data: userData } = await admin.from('users')...
    
    // 2. プロフィール取得
    const { data: profile } = await admin.from('profiles')...
    
    // 3. 探している子ども取得
    const { data: searchingChildren } = await admin.from('target_people')...
    
    // 4. 子どもの写真取得
    const { data: photos } = await admin.from('target-people-photos')...
    
    // 5. 未読メッセージ数取得
    const { data: unreadMessages } = await admin.from('messages')...
    
    // 6. 最終メッセージ取得
    const { data: lastMsg } = await admin.from('messages')...
  })
);
```

**問題**: 100マッチの場合、600+のクエリが実行される

#### 変更後の実装

```typescript
// 1. ビューから一括取得 (1クエリ)
const { data: matchesData } = await admin
  .from('matches_with_details')
  .select('*')
  .or(`parent_id.eq.${user.id},child_id.eq.${user.id}`)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

// 2. 未読メッセージ数を一括取得 (1クエリ)
const { data: unreadData } = await admin
  .from('messages')
  .select('match_id')
  .in('match_id', acceptedMatchIds)
  .neq('sender_id', user.id)
  .is('read_at', null);

// 3. 最終メッセージを一括取得 (1クエリ)
const { data: lastMessages } = await admin
  .from('messages')
  .select('match_id, content, created_at, sender_id')
  .in('match_id', acceptedMatchIds)
  .order('created_at', { ascending: false });

// 4-5. 探している子どもと写真を一括取得 (2クエリ)
const { data: searchingChildren } = await admin
  .from('target_people')
  .select('id, user_id')
  .in('user_id', otherUserIds)...

const { data: photos } = await admin
  .from('target-people-photos')
  .select('target_person_id, photo_url')
  .in('target_person_id', childIds)...
```

**改善**: マッチ数に関わらず、合計6クエリのみ実行

### 3. ページネーション機能

#### リクエストパラメータ

- `page` (オプション): ページ番号（デフォルト: 1）
- `limit` (オプション): 1ページあたりの件数（デフォルト: 20、最大: 100）

#### レスポンス形式

```typescript
{
  "matches": [
    {
      "id": "...",
      "parent_id": "...",
      "child_id": "...",
      "similarity_score": 0.95,
      "status": "accepted",
      "created_at": "...",
      "updated_at": "...",
      "other_user_name": "山田太郎",
      "other_user_role": "child",
      "other_user_image": "https://...",
      "target_person_photos": ["https://..."],
      "is_requester": true,
      "unread_count": 3,
      "last_message": {
        "content": "こんにちは",
        "created_at": "...",
        "is_own": false
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

## 使用例

### デフォルト（最初の20件）
```
GET /api/messages/matches
```

### 2ページ目を取得
```
GET /api/messages/matches?page=2
```

### 1ページあたり50件で取得
```
GET /api/messages/matches?limit=50
```

### 3ページ目を1ページあたり30件で取得
```
GET /api/messages/matches?page=3&limit=30
```

## パフォーマンス改善

### クエリ数の削減

| マッチ数 | 変更前のクエリ数 | 変更後のクエリ数 | 改善率 |
|---------|----------------|----------------|--------|
| 10      | 61             | 6              | 90%    |
| 50      | 301            | 6              | 98%    |
| 100     | 601            | 6              | 99%    |
| 500     | 3001           | 6              | 99.8%  |

### 応答時間の改善（予想）

- **小規模** (10-20マッチ): 500ms → 50-100ms
- **中規模** (50-100マッチ): 2-3秒 → 100-200ms
- **大規模** (200+マッチ): 10秒以上 → 200-300ms

※実際の改善値は環境により異なります

## マイグレーションの適用

### ローカル環境

```bash
# Supabase CLIを使用
supabase migration up

# または、SupabaseダッシュボードのSQL Editorで直接実行
```

### 本番環境

1. Supabaseダッシュボードにログイン
2. SQL Editorを開く
3. `supabase/migrations/027_matches_with_details_view.sql` の内容を実行

## 注意事項

1. **既存の動作との互換性**: レスポンス形式は既存と同じですが、新たに `pagination` オブジェクトが追加されます
2. **クライアント側の対応**: ページネーションを利用する場合、フロントエンドでページング処理を実装する必要があります
3. **デフォルト件数**: デフォルトで20件に制限されるため、既存コードで全件取得を期待している場合は `?limit=100` を指定してください

## 今後の拡張案

1. **カーソルベースページネーション**: より効率的なページング方式への移行
2. **キャッシュ機構**: Redisなどを使用した結果のキャッシング
3. **マテリアライズドビュー**: 頻繁にアクセスされるデータの事前計算
4. **GraphQL対応**: より柔軟なデータ取得API

## 関連ファイル

- `app/api/messages/matches/route.ts`: 最適化されたAPIエンドポイント
- `supabase/migrations/027_matches_with_details_view.sql`: データベースマイグレーション
