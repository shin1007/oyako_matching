-- matchesテーブルのUPDATE権限をblocked_byも許可するRLSポリシー修正
-- これにより、blocked_byが自分のIDのときもブロック解除が可能になります

ALTER POLICY "Users can update match status" ON public.matches
  USING (
    auth.uid() = parent_id OR auth.uid() = child_id OR blocked_by = auth.uid()
  );
