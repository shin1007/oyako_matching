-- forum_postsとforum_commentsのRLSポリシーを更新して、親と子の両方が投稿・コメントできるようにする

-- forum_posts の既存のポリシーを削除
DROP POLICY IF EXISTS "Parents can create forum posts" ON public.forum_posts;

-- 新しいポリシー: 親と子の両方が投稿を作成できる（user_typeは自分のroleと一致する必要がある）
DROP POLICY IF EXISTS "Users can create forum posts" ON public.forum_posts;
CREATE POLICY "Users can create forum posts" ON public.forum_posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND users.role = forum_posts.user_type
    )
  );

-- forum_comments の既存のポリシーを削除
DROP POLICY IF EXISTS "Parents can create comments" ON public.forum_comments;

-- 新しいポリシー: 親と子の両方がコメントを作成できる
DROP POLICY IF EXISTS "Users can create comments" ON public.forum_comments;
CREATE POLICY "Users can create comments" ON public.forum_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND users.role IN ('parent', 'child')
    )
  );
