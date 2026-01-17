-- Add foreign key constraint from forum_posts to profiles
-- This allows Supabase to understand the relationship for PostgREST queries

-- Note: We don't need an actual FK constraint since author_id references users
-- and users.id = profiles.user_id, but we need to tell PostgREST about this relationship

-- Add a comment to help PostgREST understand the relationship
COMMENT ON COLUMN public.forum_posts.author_id IS 
'@references public.profiles(user_id)';

-- Similarly for forum_comments
COMMENT ON COLUMN public.forum_comments.author_id IS 
'@references public.profiles(user_id)';
