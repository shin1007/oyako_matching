-- action_typeのチェック制約を拡張（'message_send'など新しいアクションを許可）
ALTER TABLE public.rate_limits DROP CONSTRAINT IF EXISTS rate_limits_action_type_check;
ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_action_type_check CHECK (action_type IN (
  'post', 'comment', 'delete_account', 'change_password', 'reset_password_confirm', 'reset_password_request', 'login', 'matching_search', 'message_send', 'forum_post', 'forum_comment', 'forum_report'
));
