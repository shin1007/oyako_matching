import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/cleanup-orphaned-user
 * Clean up orphaned auth.users records that don't have corresponding public.users entries
 * This can happen when registration fails after auth.users is created but before public.users insert
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

    console.log('[CleanupOrphanedUser] Attempting cleanup for:', email);

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

    const { error: deleteError } = await admin.auth.admin.deleteUser(authUser.id);

    if (deleteError) {
      console.error('[CleanupOrphanedUser] Error deleting orphaned user:', deleteError);
      return NextResponse.json(
        { error: '孤立したユーザーの削除に失敗しました' },
        { status: 500 }
      );
    }

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
