
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTestModeBypassSubscriptionEnabled } from '@/lib/utils/testMode';
import { logAuditEventServer } from '@/lib/utils/auditLoggerServer';
import { extractAuditMeta } from '@/lib/utils/extractAuditMeta';
import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';

export async function POST(request: NextRequest) {
  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(request);
  const token = getCsrfTokenFromHeader(request);
  if (!verifyCsrfToken(secret, token)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId, similarityScore } = body;

    // Verify users exist and are eligible
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // ターゲットユーザーはRLSで非公開なので管理者権限で取得
    const { data: targetUser } = await admin
      .from('users')
      .select('role')
      .eq('id', targetUserId)
      .single();

    if (!currentUser || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure roles are different
    if (currentUser.role === targetUser.role) {
      return NextResponse.json(
        { error: 'Cannot match users with the same role' },
        { status: 400 }
      );
    }

    // Determine parent and child IDs
    const parentId = currentUser.role === 'parent' ? user.id : targetUserId;
    const childId = currentUser.role === 'child' ? user.id : targetUserId;

    // テストモードチェック（開発環境のみ有効）
    const bypassSubscription = isTestModeBypassSubscriptionEnabled();
    
    // 決済チェック（テストモードではスキップ）
    if (!bypassSubscription && currentUser.role === 'parent') {
      // 親がマッチングを申請する場合、アクティブなサブスクリプションを確認
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', parentId)
        .single();

      if (!subscription || subscription.status !== 'active') {
        return NextResponse.json(
          {
            error: 'アクティブなサブスクリプションが必要です。決済を完了してからマッチングを申請してください。',
            requiresSubscription: true,
          },
          { status: 402 }
        );
      }
    }

    // Check if match already exists
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id, status')
      .eq('parent_id', parentId)
      .eq('child_id', childId)
      .single();

    if (existingMatch) {
      // pre_entryならpendingに昇格して申請扱い（requester_idもセット）
      if (existingMatch.status === 'pre_entry') {
        const { data: updatedMatch, error: updateError } = await supabase
          .from('matches')
          .update({ status: 'pending', similarity_score: similarityScore, requester_id: user.id })
          .eq('id', existingMatch.id)
          .select()
          .single();
        if (updateError) throw updateError;
        await logAuditEventServer({
          user_id: user.id,
          event_type: 'match_create',
          target_table: 'matches',
          target_id: updatedMatch?.id,
          description: 'pre_entry→pendingへ昇格',
          ...extractAuditMeta(request),
        });
        return NextResponse.json({ match: updatedMatch }, { status: 200 });
      }
      // それ以外（pending/accepted/blocked等）は409
      return NextResponse.json(
        { error: 'Match already exists', match: existingMatch },
        { status: 409 }
      );
    }

    // Create new match
    const { data: newMatch, error } = await supabase
      .from('matches')
      .insert({
        parent_id: parentId,
        child_id: childId,
        similarity_score: similarityScore,
        status: 'pending',
        requester_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // 監査ログ記録
    await logAuditEventServer({
      user_id: user.id,
      event_type: 'match_create',
      target_table: 'matches',
      target_id: newMatch?.id,
      description: 'マッチ作成',
      ...extractAuditMeta(request),
    });

    return NextResponse.json({ match: newMatch }, { status: 201 });
  } catch (error: any) {
    console.error('Match creation error:', error);
    await logAuditEventServer({
      event_type: 'match_create_failed',
      description: `マッチ作成失敗: ${error instanceof Error ? error.message : String(error)}`,
      ...extractAuditMeta(request),
    });
    return NextResponse.json(
      { error: error.message || 'Failed to create match' },
      { status: 500 }
    );
  }
}
