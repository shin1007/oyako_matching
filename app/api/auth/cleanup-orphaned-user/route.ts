import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/cleanup-orphaned-user
 * Clean up orphaned auth.users records that don't have corresponding public.users entries
 * This can happen when registration fails after auth.users is created but before public.users insert
 * 
 * セキュリティ: このエンドポイントは認証が必要です。
 * ユーザーは自分自身の孤立アカウントのみをクリーンアップできます。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // 認証チェック: ログインしているユーザーを取得
    const supabase = await createClient();
    const {
      data: { user: authenticatedUser },
      error: authError,
    } = await supabase.auth.getUser();

    // 認証されていない場合はエラー
    if (authError || !authenticatedUser) {
      console.warn('[CleanupOrphanedUser] Unauthorized access attempt to cleanup endpoint');
      return NextResponse.json(
        { error: '認証が必要です。ログインしてください。' },
        { status: 401 }
      );
    }

    // ユーザーは自分自身のメールアドレスのみクリーンアップ可能
    if (authenticatedUser.email !== email) {
      console.warn(
        '[CleanupOrphanedUser] Forbidden: User',
        authenticatedUser.email,
        'attempted to cleanup a different account'
      );
      return NextResponse.json(
        { error: '他のユーザーのアカウントをクリーンアップすることはできません。' },
        { status: 403 }
      );
    }

    console.log('[CleanupOrphanedUser] Authenticated cleanup attempt for:', email);

    const admin = createAdminClient();

    // Get the auth user by email
    const { data: authUsers, error: listError } = await admin.auth.admin.listUsers();

    if (listError) {
      console.error('[CleanupOrphanedUser] Error listing users:', listError);
      return NextResponse.json(
        { error: 'ユーザーリストの取得に失敗しました' },
        { status: 500 }
      );
    }

    // Supabase admin types can be narrowed incorrectly when using a typed client; cast for safety
    const authUser = (authUsers.users as any[]).find((u: any) => u.email === email);

    if (!authUser) {
      console.log('[CleanupOrphanedUser] No auth user found for email');
      return NextResponse.json({
        success: true,
        message: '該当するユーザーが見つかりません',
      });
    }

    // Check if public.users entry exists
    const { data: publicUser, error: checkError } = await admin
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[CleanupOrphanedUser] Error checking public.users:', checkError);
      return NextResponse.json(
        { error: 'データベースの確認に失敗しました' },
        { status: 500 }
      );
    }

    if (publicUser) {
      console.log('[CleanupOrphanedUser] User exists in both auth and public tables - not orphaned');
      return NextResponse.json({
        success: true,
        message: 'ユーザーは正常に登録されています',
      });
    }

    // User exists in auth.users but not in public.users - this is orphaned
    console.log('[CleanupOrphanedUser] Found orphaned auth user, deleting...');

    // 監査ログ: 削除操作を記録
    console.log('[CleanupOrphanedUser] AUDIT: User', authenticatedUser.email, 'is deleting orphaned account with ID:', authUser.id);

    const { error: deleteError } = await admin.auth.admin.deleteUser(authUser.id);

    if (deleteError) {
      console.error('[CleanupOrphanedUser] Error deleting orphaned user:', deleteError);
      // 監査ログ: 削除失敗を記録
      console.error('[CleanupOrphanedUser] AUDIT: Failed to delete orphaned account for', email, 'Error:', deleteError.message);
      return NextResponse.json(
        { error: '孤立したユーザーの削除に失敗しました' },
        { status: 500 }
      );
    }

    // 監査ログ: 削除成功を記録
    console.log('[CleanupOrphanedUser] AUDIT: Successfully deleted orphaned account for', email);
    console.log('[CleanupOrphanedUser] Successfully deleted orphaned user');

    return NextResponse.json({
      success: true,
      message: '孤立したユーザーレコードを削除しました。再登録できます。',
    });

  } catch (error) {
    console.error('[CleanupOrphanedUser] Unexpected error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
