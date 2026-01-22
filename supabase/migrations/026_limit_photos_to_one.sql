-- Migration: 探している相手の写真登録を1枚に制限
-- Created: 2026-01-19
-- Description: サーバー負荷軽減のため、探している子ども・親の写真を1枚に制限します。
--              既存データは最初の1枚（display_order=0）のみ保持します。

-- ===== 既存データのクリーンアップ =====

-- 各 searching_child について、display_order が 0 でない写真を削除
-- まず、Supabase Storage から削除するために必要な情報をログ出力
DO $$
DECLARE
  photo_record RECORD;
BEGIN
  -- display_order > 0 の写真を取得してログ出力
  FOR photo_record IN 
    SELECT id, searching_child_id, photo_url 
    FROM public.target_people_photos 
    WHERE display_order > 0
    ORDER BY searching_child_id, display_order
  LOOP
    RAISE NOTICE 'Deleting photo: id=%, searching_child_id=%, photo_url=%', 
      photo_record.id, photo_record.searching_child_id, photo_record.photo_url;
  END LOOP;
END $$;

-- display_order > 0 の写真をデータベースから削除
-- 注意: Supabase Storage からのファイル削除は手動で行うか、クライアント側で処理する必要があります
DELETE FROM public.target_people_photos
WHERE display_order > 0;

-- 各 searching_child について複数の写真（display_order=0 が複数ある場合）がある場合、
-- 最も古い created_at を持つものを残して他を削除
DELETE FROM public.target_people_photos
WHERE id IN (
  SELECT p.id
  FROM public.target_people_photos p
  WHERE EXISTS (
    SELECT 1
    FROM public.target_people_photos p2
    WHERE p2.searching_child_id = p.searching_child_id
      AND p2.display_order = 0
      AND p2.created_at < p.created_at
      AND p.display_order = 0
  )
);

-- ===== トリガー関数の更新 =====

-- 写真枚数制限を1枚に変更（既存の5枚制限を置き換え）
CREATE OR REPLACE FUNCTION check_target_people_photos_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.target_people_photos WHERE searching_child_id = NEW.searching_child_id) >= 1 THEN
    RAISE EXCEPTION 'Cannot add more than 1 photo per searching child';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- トリガーは既に存在するので、関数の更新のみで動作します
-- （022_target_people_photos.sql で作成済み）

-- ===== コメント更新 =====

COMMENT ON COLUMN public.target_people_photos.display_order IS '表示順序（現在は常に0、将来の拡張用に保持）';
