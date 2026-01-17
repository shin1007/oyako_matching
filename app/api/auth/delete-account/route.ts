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

      console.log(`[DeleteAccount] Starting deletion process for user: ${userId}`);

      // CRITICAL: Delete auth.users FIRST
      // The users table has "REFERENCES auth.users(id) ON DELETE CASCADE"
      // so deleting auth.users will automatically delete the users table row
      // and all related data through CASCADE constraints
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      if (deleteAuthError) {
        console.error('[DeleteAccount] Failed to delete auth user:', deleteAuthError);
        throw new Error(`認証ユーザーの削除に失敗しました: ${deleteAuthError.message}`);
      }

      console.log('[DeleteAccount] Successfully deleted auth user (CASCADE will handle users table and related data)');

      // Wait longer for CASCADE to complete and for database consistency
      console.log('[DeleteAccount] Waiting for CASCADE operations to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify cleanup
      const { data: remainingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected
        console.warn('[DeleteAccount] Error verifying cleanup:', checkError);
      } else if (remainingUser) {
        console.error('[DeleteAccount] WARNING: users table row still exists after deletion!');
        console.error('[DeleteAccount] Attempting manual deletion of users row...');
        
        // If CASCADE didn't work, manually delete the users row
        const { error: manualDeleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId);
        
        if (manualDeleteError) {
          console.error('[DeleteAccount] Manual deletion also failed:', manualDeleteError);
          throw new Error(`ユーザーデータの削除に失敗しました: ${manualDeleteError.message}`);
        }
        console.log('[DeleteAccount] Manual deletion successful');
      } else {
        console.log('[DeleteAccount] Verified: users table row successfully deleted');
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
