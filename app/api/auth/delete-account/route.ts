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
    // Note: Most tables have ON DELETE CASCADE from users table, but we delete
    // explicitly first to ensure clean deletion and avoid cascade timing issues
    
    try {
      // Sign out the user session first (before deleting any data)
      await supabase.auth.signOut();

      // Delete in order to respect foreign key relationships
      // Messages reference matches, so delete them first
      await supabaseAdmin
        .from('messages')
        .delete()
        .eq('sender_id', userId);

      // Delete matches where user is parent or child
      await supabaseAdmin
        .from('matches')
        .delete()
        .or(`parent_id.eq.${userId},child_id.eq.${userId}`);

      // Delete forum comments (may reference posts)
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

      // Delete the auth user first
      // This will CASCADE delete the users table row automatically due to
      // the foreign key constraint: users(id) REFERENCES auth.users(id) ON DELETE CASCADE
      // We delete auth user BEFORE manually deleting from users table to avoid
      // "duplicate key value" errors when recreating accounts
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      if (deleteAuthError) {
        console.error('Failed to delete auth user:', deleteAuthError);
        throw new Error('認証ユーザーの削除に失敗しました');
      }

      // Note: The users table row is automatically deleted by CASCADE,
      // but we verify it's gone to ensure clean state
      const { data: remainingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('Failed to verify users table cleanup:', checkError);
        console.warn('Cannot verify CASCADE deletion worked, but auth user was deleted successfully');
        // Continue - the CASCADE should have worked even if verification failed
      } else if (remainingUser) {
        // Manually delete if CASCADE didn't work for some reason
        console.warn('CASCADE deletion did not remove users table row, attempting manual cleanup');
        const { error: manualDeleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId);

        if (manualDeleteError) {
          console.error('Failed to manually delete users table row:', manualDeleteError);
          // Log but don't fail - auth user is already deleted
        } else {
          console.info('Successfully manually deleted users table row after CASCADE cleanup');
        }
      }

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
