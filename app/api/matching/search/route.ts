import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: userData } = await admin
      .from('users')
      .select('role, verification_status')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.verification_status !== 'verified') {
      return NextResponse.json(
        { error: '本人確認が必要です' },
        { status: 403 }
      );
    }

    // For parents, check subscription status (dev環境ではスキップ)
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && userData.role === 'parent') {
      const { data: subscription } = await admin
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (!subscription || subscription.status !== 'active') {
        return NextResponse.json(
          { error: 'アクティブなサブスクリプションが必要です' },
          { status: 403 }
        );
      }
    }

    // Find potential matches using the stored procedure
    let matches = [];
    const rpcResult = await admin.rpc('find_potential_matches', {
      target_user_id: user.id,
      target_role: userData.role,
      min_similarity: 0.7,
    });

    if (rpcResult.error) {
      console.error('RPC error:', rpcResult.error);
    } else {
      matches = rpcResult.data || [];
    }

    // If no matches found from episodes, try matching by gender and age range
    if (matches.length === 0) {
      console.log('[Matching] No RPC matches, trying age range matching...');
      const { data: currentProfile, error: profileError } = await admin
        .from('profiles')
        .select('birth_date, gender')
        .eq('user_id', user.id)
        .single();

      console.log('[Matching] Current user profile:', currentProfile);
      if (profileError) {
        console.log('[Matching] Profile fetch error:', profileError);
      }

      if (currentProfile) {
        const currentBirthDate = new Date(currentProfile.birth_date);
        const currentAge = new Date().getFullYear() - currentBirthDate.getFullYear();

        // Asymmetric fallback rules: parents can match children up to 25歳, children can match parents 20-70歳
        const childAgeMax = 25;
        const parentAgeMin = 20;
        const parentAgeMax = 70;

        console.log(`[Matching] Current age: ${currentAge}`);

        // Get opposite role users
        const oppositeRole = userData.role === 'parent' ? 'child' : 'parent';
        const { data: oppositeRoleUsers } = await admin
          .from('users')
          .select('id')
          .eq('role', oppositeRole);

        console.log(`[Matching] Opposite role (${oppositeRole}) users:`, oppositeRoleUsers);

        if (oppositeRoleUsers && oppositeRoleUsers.length > 0) {
          const oppositeUserIds = oppositeRoleUsers.map(u => u.id);
          
          // Get profiles for these users
          const { data: potentialMatches } = await admin
            .from('profiles')
            .select('user_id, birth_date')
            .in('user_id', oppositeUserIds);

          console.log('[Matching] Potential matches (all):', potentialMatches);

          if (potentialMatches) {
            const filteredMatches = potentialMatches.filter((profile: any) => {
              const profileBirthDate = new Date(profile.birth_date);
              const profileAge = new Date().getFullYear() - profileBirthDate.getFullYear();

              // Fallback logic: allow plausible parent-child pairing
              let inRange = false;
              if (userData.role === 'parent') {
                // Looking for child: accept ages 0-childAgeMax
                inRange = profileAge >= 0 && profileAge <= childAgeMax;
              } else {
                // Looking for parent: accept parent age between parentAgeMin and parentAgeMax and older than child
                inRange = profileAge >= parentAgeMin && profileAge <= parentAgeMax && profileAge > currentAge;
              }

              console.log(`[Matching] Profile ${profile.user_id}: age=${profileAge}, inRange=${inRange}`);
              return inRange;
            });

            console.log('[Matching] Filtered matches:', filteredMatches);

            matches = filteredMatches.map((profile: any) => ({
              matched_user_id: profile.user_id,
              similarity_score: 0.5, // 基本スコアは0.5
            }));
          }
        }
      }
    }

    console.log('[Matching] Final matches count:', matches.length);

    // For parents, fetch searching children to render cards even if no matches
    let searchingChildren: any[] = [];
    if (userData.role === 'parent') {
      const { data: children } = await admin
        .from('searching_children')
        .select('id, name_kanji, name_hiragana, birth_date, gender, display_order')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });
      searchingChildren = children || [];
    }

    // Get full details for each match
    const matchDetails = await Promise.all(
      matches.map(async (match: any) => {
        const { data: profile } = await admin
          .from('profiles')
          .select('last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birth_date, bio, profile_image_url, gender, birthplace_prefecture, birthplace_municipality')
          .eq('user_id', match.matched_user_id)
          .single();

        const { data: targetUserData } = await admin
          .from('users')
          .select('role')
          .eq('id', match.matched_user_id)
          .single();

        // For parents, calculate scores per child
        let scorePerChild: Record<string, number> = {};
        if (userData.role === 'parent' && searchingChildren.length > 0 && profile?.birth_date) {
          const matchBirthDate = new Date(profile.birth_date);
          const matchYear = matchBirthDate.getFullYear();
          const matchMonth = matchBirthDate.getMonth();
          const matchDay = matchBirthDate.getDate();

          // Calculate score for each searching child
          searchingChildren.forEach((child) => {
            let score = match.similarity_score;
            if (child.birth_date) {
              const childBirthDate = new Date(child.birth_date);
              const childYear = childBirthDate.getFullYear();
              const childMonth = childBirthDate.getMonth();
              const childDay = childBirthDate.getDate();

              // Check year, month, day matches
              const yearMatch = childYear === matchYear;
              const monthMatch = childMonth === matchMonth;
              const dayMatch = childDay === matchDay;

              // Check name similarity using new fields
              const childLastNameKanji = child.last_name_kanji || '';
              const childFirstNameKanji = child.first_name_kanji || '';
              const childNameKanji = (child.name_kanji || '').trim() || (childLastNameKanji + childFirstNameKanji).trim();
              const childNameHiragana = child.name_hiragana || '';
              
              const matchLastNameKanji = profile.last_name_kanji || '';
              const matchFirstNameKanji = profile.first_name_kanji || '';
              const matchFullName = (matchLastNameKanji + matchFirstNameKanji).trim();
              
              // Check if child's name is contained in match's full name
              let nameMatch = false;
              if (childNameKanji && matchFullName.includes(childNameKanji)) {
                nameMatch = true;
              } else if (childNameHiragana && profile.last_name_hiragana && 
                        (profile.last_name_hiragana + profile.first_name_hiragana).includes(childNameHiragana)) {
                nameMatch = true;
              }

              console.log(
                `[Matching] Child ${child.id} vs user ${match.matched_user_id}: ` +
                `year=${yearMatch}, month=${monthMatch}, day=${dayMatch}, name=${nameMatch}`
              );

              // Score based on birthday component matches
              if (yearMatch && monthMatch && dayMatch) {
                // Same birthday (same person or same date)
                score = 0.85;
              } else if (monthMatch && dayMatch) {
                // Same month and day but different year
                // Possibly same person with age misrecorded
                score = 0.78;
              } else if (yearMatch && monthMatch) {
                // Same year and month, different day
                score = 0.72;
              } else if (yearMatch && dayMatch) {
                // Same year and day, different month
                score = 0.68;
              } else if (yearMatch) {
                // Same year only
                score = 0.65;
              } else {
                // Different year - check if plausible age match
                const childAge = new Date().getFullYear() - childYear;
                const matchAge = new Date().getFullYear() - matchYear;
                const ageDiff = Math.abs(childAge - matchAge);

                if (ageDiff === 0) {
                  score = 0.30;
                } else if (ageDiff === 1) {
                  score = 0.25;
                } else if (ageDiff === 2) {
                  score = 0.20;
                } else if (ageDiff <= 5) {
                  score = 0.15;
                } else {
                  score = 0.10; // 6年以上の差は10%以下
                }
              }

              // Apply name match bonus
              if (nameMatch) {
                // Boost score by 0.05 if name matches (but cap at 0.99)
                score = Math.min(0.99, score + 0.05);
                console.log(
                  `[Matching] Name match bonus applied. Child ${child.id}: ${score.toFixed(2)}`
                );
              }

              // Apply birthplace bonus if available
              if (child.birthplace_prefecture && profile.birthplace_prefecture &&
                  child.birthplace_prefecture === profile.birthplace_prefecture) {
                score = Math.min(0.99, score + 0.08);
                console.log(
                  `[Matching] Same prefecture bonus applied. Child ${child.id}: ${score.toFixed(2)}`
                );
              }
            }
            scorePerChild[child.id] = score;
          });
        }

        return {
          userId: match.matched_user_id,
          similarityScore: match.similarity_score,
          scorePerChild, // 子どもごとのスコア
          role: targetUserData?.role,
          profile,
        };
      })
    );

    return NextResponse.json({ candidates: matchDetails, userRole: userData.role, searchingChildren });
  } catch (error: any) {
    console.error('Match search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search matches' },
      { status: 500 }
    );
  }
}
