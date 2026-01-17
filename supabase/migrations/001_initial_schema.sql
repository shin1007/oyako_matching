  -- 親子マッチングプラットフォーム データベーススキーマ

  -- Create extensions schema if not exists
  CREATE SCHEMA IF NOT EXISTS extensions;

  -- Enable UUID extension
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

  -- Enable pgvector extension for vector search
  CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

  -- Users table (extends Supabase auth.users)
  CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
    mynumber_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Profiles table
  CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    profile_image_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
  );

  -- Episodes table (思い出エピソード)
  CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Matches table
  CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5,4) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_id, child_id)
  );

  -- Messages table
  CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
  );

  -- Time capsules table (タイムカプセル機能)
  CREATE TABLE IF NOT EXISTS public.time_capsules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    child_birth_date DATE NOT NULL,
    message TEXT NOT NULL,
    unlock_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE
  );

  -- Subscriptions table (Stripe連携)
  CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
  CREATE INDEX IF NOT EXISTS idx_users_verification ON public.users(verification_status);
  CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
  CREATE INDEX IF NOT EXISTS idx_profiles_birth_date ON public.profiles(birth_date);
  CREATE INDEX IF NOT EXISTS idx_episodes_user_id ON public.episodes(user_id);
  CREATE INDEX IF NOT EXISTS idx_episodes_moderation ON public.episodes(moderation_status);
  CREATE INDEX IF NOT EXISTS idx_matches_parent_id ON public.matches(parent_id);
  CREATE INDEX IF NOT EXISTS idx_matches_child_id ON public.matches(child_id);
  CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
  CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages(match_id);
  CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
  CREATE INDEX IF NOT EXISTS idx_time_capsules_parent_id ON public.time_capsules(parent_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

  -- Vector similarity search index
  CREATE INDEX IF NOT EXISTS idx_episodes_embedding ON public.episodes USING ivfflat (embedding vector_cosine_ops);

  -- Updated_at trigger function
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SET search_path = public;

  -- Apply updated_at trigger to relevant tables
  DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
  CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
  CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_episodes_updated_at ON public.episodes;
  CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON public.episodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_matches_updated_at ON public.matches;
  CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
  CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
