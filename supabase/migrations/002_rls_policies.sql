-- Row Level Security (RLS) ポリシー

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Episodes policies
CREATE POLICY "Users can view their own episodes" ON public.episodes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own episodes" ON public.episodes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own episodes" ON public.episodes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own episodes" ON public.episodes
  FOR DELETE USING (auth.uid() = user_id);

-- Matches policies
CREATE POLICY "Users can view their own matches" ON public.matches
  FOR SELECT USING (
    auth.uid() = parent_id OR auth.uid() = child_id
  );

CREATE POLICY "System can create matches" ON public.matches
  FOR INSERT WITH CHECK (true); -- Handled by backend logic

CREATE POLICY "Users can update match status" ON public.matches
  FOR UPDATE USING (
    auth.uid() = parent_id OR auth.uid() = child_id
  );

-- Messages policies
CREATE POLICY "Users can view messages in their matches" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
        AND (matches.parent_id = auth.uid() OR matches.child_id = auth.uid())
        AND matches.status = 'accepted'
    )
  );

CREATE POLICY "Users can send messages in accepted matches" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = match_id
        AND (matches.parent_id = auth.uid() OR matches.child_id = auth.uid())
        AND matches.status = 'accepted'
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
        AND (matches.parent_id = auth.uid() OR matches.child_id = auth.uid())
    )
  );

-- Time capsules policies
CREATE POLICY "Parents can view their own time capsules" ON public.time_capsules
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parents can create time capsules" ON public.time_capsules
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Children can view unlocked time capsules" ON public.time_capsules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.birth_date = time_capsules.child_birth_date
        AND time_capsules.unlock_date <= CURRENT_DATE
    )
  );

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON public.subscriptions
  FOR ALL USING (true); -- Managed by webhook handlers

-- Functions for matching logic
CREATE OR REPLACE FUNCTION public.find_potential_matches(
  target_user_id UUID,
  target_role TEXT,
  min_similarity DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
  matched_user_id UUID,
  similarity_score DECIMAL
) AS $$
BEGIN
  IF target_role = 'parent' THEN
    -- Find children with similar episodes
    RETURN QUERY
    SELECT DISTINCT
      child_episodes.user_id as matched_user_id,
      AVG(
        (parent_episodes.embedding <=> child_episodes.embedding)::DECIMAL
      )::DECIMAL as similarity_score
    FROM public.episodes parent_episodes
    CROSS JOIN public.episodes child_episodes
    JOIN public.users child_users ON child_users.id = child_episodes.user_id
    WHERE parent_episodes.user_id = target_user_id
      AND child_users.role = 'child'
      AND parent_episodes.moderation_status = 'approved'
      AND child_episodes.moderation_status = 'approved'
      AND parent_episodes.embedding IS NOT NULL
      AND child_episodes.embedding IS NOT NULL
    GROUP BY child_episodes.user_id
    HAVING AVG((parent_episodes.embedding <=> child_episodes.embedding)::DECIMAL) >= min_similarity
    ORDER BY similarity_score DESC;
  ELSE
    -- Find parents with similar episodes
    RETURN QUERY
    SELECT DISTINCT
      parent_episodes.user_id as matched_user_id,
      AVG(
        (child_episodes.embedding <=> parent_episodes.embedding)::DECIMAL
      )::DECIMAL as similarity_score
    FROM public.episodes child_episodes
    CROSS JOIN public.episodes parent_episodes
    JOIN public.users parent_users ON parent_users.id = parent_episodes.user_id
    WHERE child_episodes.user_id = target_user_id
      AND parent_users.role = 'parent'
      AND child_episodes.moderation_status = 'approved'
      AND parent_episodes.moderation_status = 'approved'
      AND child_episodes.embedding IS NOT NULL
      AND parent_episodes.embedding IS NOT NULL
    GROUP BY parent_episodes.user_id
    HAVING AVG((child_episodes.embedding <=> parent_episodes.embedding)::DECIMAL) >= min_similarity
    ORDER BY similarity_score DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
