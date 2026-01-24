# 写真登録制限の変更 - 実装完了サマリー

## 変更概要

探している相手（子ども/親）ごとの写真登録数を **5枚から1枚に制限** しました。

### 変更理由
- サーバー負荷の軽減
- ストレージ使用量の削減
- 今後の機能拡充への準備

## 実装内容

### 1. データベース変更

**新規マイグレーション: `026_limit_photos_to_one.sql`**

このマイグレーションは以下を実行します:
- データベーストリガーを5枚制限から1枚制限に変更
- 既存データのクリーンアップ:
  - `display_order > 0` の写真をすべて削除
  - 同じ `target_person_id` に複数の写真がある場合、最も古い写真（`created_at` が最小）を保持し、それ以外を削除

### 2. フロントエンド変更

**`app/components/SearchingChildPhotoUpload.tsx`**
- 写真の最大枚数を定数化: `MAX_PHOTOS_PER_CHILD = 1`
- 写真カウンター表示を "0/5" から "0/1" に変更
- ヘルプテキストを "5枚まで登録可能" から "1枚のみ登録可能" に変更
- 複数ファイル選択を無効化（`multiple` 属性を削除）
- エラーメッセージを "写真は1枚のみ登録できます" に変更

### 3. ドキュメント更新

以下のドキュメントを更新しました:
- `PHOTO_REGISTRATION_IMPLEMENTATION_SUMMARY.md`
- `docs/PHOTO_REGISTRATION_FEATURE.md`

## 必要な手動作業

### マイグレーションの実行

このPRをマージした後、以下のいずれかの方法でマイグレーションを実行してください:

#### 方法1: Supabase CLI（推奨）
```bash
cd /path/to/oyako_matching
supabase db push
```

#### 方法2: Supabase Dashboard
1. Supabase Dashboardにログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. `supabase/migrations/026_limit_photos_to_one.sql` の内容をコピー
5. SQL Editorに貼り付けて実行

### マイグレーション実行時の注意点

⚠️ **重要**: マイグレーション実行前にデータのバックアップを推奨します。

マイグレーション実行時に以下が行われます:
1. `display_order > 0` の写真がデータベースから削除されます
2. 同じ `target_person_id` に複数の `display_order = 0` の写真がある場合、最も古い写真以外が削除されます

削除される写真のURLがログに出力されるため、必要に応じてSupabase Storageから手動で削除できます。

## テスト・検証結果

### TypeScript型チェック
✅ **合格**: エラーなし

### CodeQLセキュリティスキャン
✅ **合格**: 脆弱性 0件

### コードレビュー
✅ **対応完了**: すべてのコメントに対応

## 既存ユーザーへの影響

### データの保持
- 各 `target_person` について、最も古い写真（最初にアップロードされた写真）が保持されます
- それ以外の写真は削除されます

### Supabase Storage
- データベースから削除された写真のファイルはStorageに残ります
- 必要に応じて、以下のクエリで削除対象のURLを確認できます:
  ```sql
  SELECT photo_url FROM public.target-people-photos 
  WHERE display_order > 0 
  ORDER BY target_person_id, display_order;
  ```

### UIの変化
- プロフィールページで「写真 (0/1)」と表示されます
- 写真が1枚登録されている場合、「+ 写真を追加」ボタンが非表示になります
- 新しい写真を追加するには、既存の写真を削除する必要があります

## 今後の拡張

将来的に写真枚数を増やす必要がある場合:
1. `MAX_PHOTOS_PER_CHILD` 定数を更新
2. マイグレーションファイルで `check_target_people_photos_limit()` 関数を更新
3. UI上の制限値表示を更新

## トラブルシューティング

### マイグレーション実行エラー
エラーが発生した場合:
1. Supabaseプロジェクトの接続を確認
2. 既に `026_limit_photos_to_one.sql` が実行されていないか確認
3. エラーメッセージを確認し、必要に応じてロールバック

### ロールバック方法
マイグレーションを元に戻す必要がある場合:
```sql
-- トリガー関数を5枚制限に戻す
CREATE OR REPLACE FUNCTION check_target_people_photos_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.target-people-photos WHERE target_person_id = NEW.target_person_id) >= 5 THEN
    RAISE EXCEPTION 'Cannot add more than 5 photos per target person';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

## 変更ファイル一覧

### 新規作成
- `supabase/migrations/026_limit_photos_to_one.sql`
- `PHOTO_LIMIT_CHANGE_SUMMARY.md` (このファイル)

### 変更
- `app/components/SearchingChildPhotoUpload.tsx`
- `PHOTO_REGISTRATION_IMPLEMENTATION_SUMMARY.md`
- `docs/PHOTO_REGISTRATION_FEATURE.md`

## まとめ

✅ **実装完了**: 写真登録を1枚に制限する機能が完成しました

**次のアクション**:
1. PRをマージ
2. マイグレーションを実行（上記の手順参照）
3. プロフィールページで動作確認
4. 必要に応じて、古い写真ファイルをStorageから削除

---

**実装日**: 2026-01-19  
**実装者**: GitHub Copilot
