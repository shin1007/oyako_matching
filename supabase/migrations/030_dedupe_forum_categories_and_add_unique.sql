-- forum_categories の重複データを削除し、name に一意制約を追加

-- 同名のカテゴリで重複している行を削除（作成日時が古いものを優先して残す）
WITH ranked AS (
  SELECT id, name,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) AS rn
  FROM public.forum_categories
), to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.forum_categories
WHERE id IN (SELECT id FROM to_delete);

-- name に対するユニーク制約を追加（今後の重複挿入を防止）
ALTER TABLE public.forum_categories
  ADD CONSTRAINT uq_forum_categories_name UNIQUE (name);
