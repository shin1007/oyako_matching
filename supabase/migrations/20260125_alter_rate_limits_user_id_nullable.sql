-- rate_limitsテーブルのuser_idカラムをNULL許容に変更（IPアドレス単位のレートリミット対応）
ALTER TABLE public.rate_limits ALTER COLUMN user_id DROP NOT NULL;
