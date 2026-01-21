-- target_people テーブルへのリネーム
ALTER TABLE searching_children RENAME TO target_people;

-- target_people_photos テーブルへのリネーム
ALTER TABLE searching_children_photos RENAME TO target_people_photos;

-- target_people_photos の外部キー・カラム名修正
ALTER TABLE target_people_photos RENAME COLUMN searching_child_id TO target_person_id;

-- 必要に応じてインデックス名や外部キー制約名も変更
-- 例: 外部キー制約名変更（PostgreSQLの場合）
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'target_people_photos'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'target_person_id';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE target_people_photos RENAME CONSTRAINT %I TO target_people_photos_target_person_id_fkey;', constraint_name);
  END IF;
END $$;
