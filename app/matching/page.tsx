"use client";
import { SmallCardList } from '@/app/components/matching/SmallCardList';
import { ParentApprovalModal } from '@/app/components/matching/ParentApprovalModal';

import { useState, useEffect } from 'react';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useErrorNotification } from '@/lib/utils/useErrorNotification';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api/request';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScoreExplanation } from '@/app/components/matching/ScoreExplanation';
import { TargetProfileCard } from '@/app/components/matching/TargetProfileCard';
import { ProfileCard } from '@/app/components/matching/ProfileCard';
import { MatchedTargetCard } from '@/app/components/matching/MatchedTargetCard';
import { TheirTargetPeopleList } from '@/app/components/matching/TheirTargetPeopleList';
import { getGenderLabel, calculateAge, getRoleLabel } from '@/app/components/matching/matchingUtils';
import { NoTargetRegisteredCard } from '@/app/components/matching/NoTargetRegisteredCard';
import { NoMatchingCard } from '@/app/components/matching/NoMatchingCard';
import { TestModeBanners } from '@/app/components/matching/TestModeBanners';

interface Match {
  userId: string;
  targetScores: Array<{
    target: any;
    birthdayScore: number;
    nameScore: number;
    birthplaceScore: number;
    oppositeScore: number;
  }>;
  existingMatchId?: string | null;
  existingMatchStatus?: 'pending' | 'accepted' | 'rejected' | 'blocked' | null;
  profile?: {
    role?: string;
    last_name_kanji?: string;
    first_name_kanji?: string;
    last_name_hiragana?: string;
    first_name_hiragana?: string;
    birth_date?: string;
    bio?: string;
    profile_image_url?: string;
    gender?: string;
    birthplace_prefecture?: string;
    birthplace_municipality?: string;
  };
  theirTargetPeople?: Array<{
    id: string;
    last_name_kanji?: string;
    first_name_kanji?: string;
    birthplace_prefecture?: string;
    birthplace_municipality?: string;
    photo_url?: string | null;
  }>;
  role?: string;
}
interface SearchingTarget {
  id: string;
  last_name_kanji?: string;
  first_name_kanji?: string;
  name_kanji?: string;
  name_hiragana?: string;
  birth_date?: string;
  gender?: string;
  birthplace_prefecture?: string;
  birthplace_municipality?: string;
  display_order?: number;
  photo_url?: string | null;
}

// タイトル部分
function renderTitle(userRole: string | null) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {userRole === 'child' ? '親を探す' : '子を探す'}
          </h1>
          <p className="mt-2 text-gray-600">
            {userRole === 'child'
              ? 'プロフィール情報に基づいて、あなたに合った親を表示しています'
              : 'プロフィール情報に基づいて、あなたに合った子を表示しています'}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg px-4 py-2 text-white bg-role-primary bg-role-primary-hover ml-4"
        >
          ダッシュボードに戻る
        </Link>
      </div>
    </div>
  );
}

// 検索中
function renderFindingMatch() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <span
            className="inline-block animate-spin rounded-full border-4 border-gray-300 h-12 w-12 align-[-0.125em]"
            style={{ borderTopColor: '#3b82f6' }} // Tailwind blue-500
          ></span>
        </div>
        <p className="text-gray-600">マッチングを検索中...</p>
      </div>
    </div>
  );
}




export default function MatchingPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notifyError = useErrorNotification(setError, { log: true });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [searchingTargets, setSearchingTargets] = useState<SearchingTarget[]>([]);
  const [testModeBypassVerification, setTestModeBypassVerification] = useState(false);
  const [testModeBypassSubscription, setTestModeBypassSubscription] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  useEffect(() => {
    checkAuth();
    checkTestMode();
    loadMatches();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
    }
  };

  const checkTestMode = async () => {
    try {
      const res = await apiRequest('/api/test-mode/status');
      if (res.ok) {
        console.log('[MatchingPage] Test mode status:', res.data);
        setTestModeBypassVerification(res.data.bypassVerification);
        setTestModeBypassSubscription(res.data.bypassSubscription);
      }
    } catch (err) {
      notifyError(err);
    }
  };

  // マッチング候補の読み込み（画面全体）
  const loadMatches = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/api/matching/search');
      if (!res.ok) throw new Error(res.error || 'マッチングの検索に失敗しました');
      setMatches(res.data.candidates || []);
      setUserRole(res.data.userRole);
      setProfile(res.data.profile || null);
      setSearchingTargets(res.data.myTargetPeople || []);
    } catch (err: any) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  };


  const roleClass = userRole === 'child' ? 'role-child' : 'role-parent';
  return (
    <div className={`min-h-screen bg-gray-100 ${roleClass}`}> 
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <TestModeBanners bypassVerification={testModeBypassVerification} bypassSubscription={testModeBypassSubscription} />
        {renderTitle(userRole)}
        <ErrorAlert message={error} onClose={() => setError('')} />
        {loading ? (
        // 検索中表示
          renderFindingMatch()
        ) : matches.length === 0 ? (
          <NoMatchingCard userRole={userRole} />
        // 探している相手が未登録の場合
        ) : searchingTargets.length === 0 ? (
          <NoTargetRegisteredCard userRole={userRole} />
        // 探している相手が登録されている場合
        ) : (
          <div className="space-y-4">
            <div className="space-y-8 w-full max-w-5xl mx-auto">
              {searchingTargets.map((target) => {
                return (
                  <div key={target.id} className="rounded-xl bg-white shadow-lg hover:shadow-2xl transition">
                    <div className="flex flex-col gap-0 lg:flex-row">
                      <ProfileCard target={target} userRole={userRole} />
                      <div className="flex-1 p-5 lg:p-6">
                        <SmallCardList
                          matchedTargets={matches}
                          target={target}
                          userRole={userRole}
                          calculateAge={calculateAge}
                          profile={profile}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
