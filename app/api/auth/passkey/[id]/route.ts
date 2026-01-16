import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/auth/passkey/[id]
 * Delete a passkey credential
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

    // Check if user is authenticated
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

    // Verify the passkey belongs to the user and delete it
    const { error: deleteError } = await supabase
      .from('passkeys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Failed to delete passkey:', deleteError);
      return NextResponse.json(
        { error: 'パスキーの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete passkey error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'パスキーの削除に失敗しました',
      },
      { status: 500 }
    );
  }
}
