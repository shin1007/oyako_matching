-- matches.statusに申請前状態「pre_entry」を追加
ALTER TABLE public.matches
  ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_status_check CHECK (status IN ('pre_entry', 'pending', 'accepted', 'rejected', 'blocked'));
ALTER TABLE public.matches
  ALTER COLUMN status SET DEFAULT 'pre_entry';
