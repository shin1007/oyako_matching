import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTestModeBypassSubscriptionEnabled } from '@/lib/utils/testMode';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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

    const { data: targetUser } = await supabase
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
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ match: newMatch }, { status: 201 });
  } catch (error: any) {
    console.error('Match creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create match' },
      { status: 500 }
    );
  }
}
