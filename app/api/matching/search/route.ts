import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role, verification_status')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'Verification required' },
        { status: 403 }
      );
    }

    // For parents, check subscription status
    if (userData.role === 'parent') {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (!subscription || subscription.status !== 'active') {
        return NextResponse.json(
          { error: 'Active subscription required' },
          { status: 403 }
        );
      }
    }

    // Find potential matches using the stored procedure
    const { data: matches, error } = await supabase.rpc('find_potential_matches', {
      target_user_id: user.id,
      target_role: userData.role,
      min_similarity: 0.7,
    });

    if (error) throw error;

    // Get full details for each match
    const matchDetails = await Promise.all(
      matches.map(async (match: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, birth_date, bio, profile_image_url')
          .eq('user_id', match.matched_user_id)
          .single();

        return {
          userId: match.matched_user_id,
          similarityScore: match.similarity_score,
          profile,
        };
      })
    );

    return NextResponse.json({ matches: matchDetails });
  } catch (error: any) {
    console.error('Match search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search matches' },
      { status: 500 }
    );
  }
}
