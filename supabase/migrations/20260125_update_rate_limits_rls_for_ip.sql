-- RLS policy update for rate_limits: allow insert when user_id=auth.uid() or ip_address is not null

DROP POLICY IF EXISTS "Users can insert own rate limits" ON public.rate_limits;

CREATE POLICY "Users or IPs can insert rate limits" ON public.rate_limits
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid())
    OR (ip_address IS NOT NULL)
  );
