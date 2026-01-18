-- RLS policies for rate_limits table

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotency)
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can insert own rate limits" ON public.rate_limits;

-- Allow users to view only their own rate limit records
CREATE POLICY "Users can view own rate limits" ON public.rate_limits
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to insert rate limit records for themselves
CREATE POLICY "Users can insert own rate limits" ON public.rate_limits
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
