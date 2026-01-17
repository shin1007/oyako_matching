-- RLS policies for forum features

-- Enable RLS on forum tables
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can view forum categories" ON public.forum_categories;
DROP POLICY IF EXISTS "Anyone can view approved forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Parents can create forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.forum_comments;
DROP POLICY IF EXISTS "Parents can create comments" ON public.forum_comments;
DROP POLICY IF EXISTS "Authors can update their own comments" ON public.forum_comments;
DROP POLICY IF EXISTS "Authors can delete their own comments" ON public.forum_comments;

-- Forum categories policies (read-only for all authenticated users)
CREATE POLICY "Anyone can view forum categories" ON public.forum_categories
  FOR SELECT USING (true);

-- Forum posts policies
CREATE POLICY "Anyone can view approved forum posts" ON public.forum_posts
  FOR SELECT USING (moderation_status = 'approved' OR author_id = auth.uid());

CREATE POLICY "Parents can create forum posts" ON public.forum_posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'parent'
    )
  );

CREATE POLICY "Authors can update their own posts" ON public.forum_posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own posts" ON public.forum_posts
  FOR DELETE USING (auth.uid() = author_id);

-- Forum comments policies
CREATE POLICY "Anyone can view approved comments" ON public.forum_comments
  FOR SELECT USING (
    moderation_status = 'approved' OR author_id = auth.uid()
  );

CREATE POLICY "Parents can create comments" ON public.forum_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'parent'
    )
  );

CREATE POLICY "Authors can update their own comments" ON public.forum_comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own comments" ON public.forum_comments
  FOR DELETE USING (auth.uid() = author_id);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_post_view_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.forum_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
