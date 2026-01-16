-- Row Level Security policies for passkeys table

-- Enable RLS
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;

-- Users can view their own passkeys
CREATE POLICY "Users can view their own passkeys"
  ON public.passkeys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own passkeys
CREATE POLICY "Users can insert their own passkeys"
  ON public.passkeys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own passkeys (for counter and last_used_at)
CREATE POLICY "Users can update their own passkeys"
  ON public.passkeys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own passkeys
CREATE POLICY "Users can delete their own passkeys"
  ON public.passkeys
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passkeys TO authenticated;
GRANT USAGE ON SEQUENCE passkeys_id_seq TO authenticated;
