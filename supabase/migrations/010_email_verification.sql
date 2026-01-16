-- Email verification feature
-- Adds email verification tracking and rate limiting

-- Add email_verified_at column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- Create table for tracking email verification resend attempts (rate limiting)
CREATE TABLE IF NOT EXISTS public.email_verification_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_verification_attempts_user_id 
ON public.email_verification_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_attempts_attempted_at 
ON public.email_verification_attempts(attempted_at);

-- RLS policies for email_verification_attempts
ALTER TABLE public.email_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own verification attempts
CREATE POLICY "Users can view own verification attempts"
ON public.email_verification_attempts
FOR SELECT
USING (auth.uid() = user_id);

-- Only authenticated users can insert their own attempts (via API)
CREATE POLICY "Users can insert own verification attempts"
ON public.email_verification_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to clean up old verification attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_verification_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.email_verification_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON TABLE public.email_verification_attempts IS 'Tracks email verification resend attempts for rate limiting';
COMMENT ON COLUMN public.users.email_verified_at IS 'Timestamp when email was verified';
