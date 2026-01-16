import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/delete-account
 * Delete user account and all related data
 * Requires authentication - only logged-in users can delete their own account
 */
export async function POST() {
  try {
    // Authenticate user using regular client
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Create service role client for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Missing Supabase service role configuration');
      return NextResponse.json(
        { error: 'サーバー設定エラーが発生しました' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete related data in order (respecting foreign key constraints)
    // Using service role to bypass RLS policies
    
    try {
      // Delete messages (references matches and users via sender_id)
      await supabaseAdmin
        .from('messages')
        .delete()
        .eq('sender_id', userId);

      // Delete matches where user is parent or child
      await supabaseAdmin
        .from('matches')
        .delete()
        .or(`parent_id.eq.${userId},child_id.eq.${userId}`);

      // Delete forum comments
      await supabaseAdmin
        .from('forum_comments')
        .delete()
        .eq('author_id', userId);

      // Delete forum posts
      await supabaseAdmin
        .from('forum_posts')
        .delete()
        .eq('author_id', userId);

      // Delete episodes
      await supabaseAdmin
        .from('episodes')
        .delete()
        .eq('user_id', userId);

      // Delete time capsules
      await supabaseAdmin
        .from('time_capsules')
        .delete()
        .eq('parent_id', userId);

      // Delete searching children
      await supabaseAdmin
        .from('searching_children')
        .delete()
        .eq('user_id', userId);

      // Delete subscriptions
      await supabaseAdmin
        .from('subscriptions')
        .delete()
        .eq('user_id', userId);

      // Delete passkeys
      await supabaseAdmin
        .from('passkeys')
        .delete()
        .eq('user_id', userId);

      // Delete profile
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      // Delete from users table
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);

      // Finally, delete the auth user
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      if (deleteAuthError) {
        console.error('Failed to delete auth user:', deleteAuthError);
        throw new Error('認証ユーザーの削除に失敗しました');
      }

      // Sign out the user session
      await supabase.auth.signOut();

      return NextResponse.json({
        success: true,
        message: 'アカウントが正常に削除されました',
      });
    } catch (deleteError) {
      console.error('Failed to delete user data:', deleteError);
      throw new Error(
        deleteError instanceof Error
          ? deleteError.message
          : 'データの削除中にエラーが発生しました'
      );
    }
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'アカウントの削除に失敗しました',
      },
      { status: 500 }
    );
  }
}
