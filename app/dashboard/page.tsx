import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getMatchingCandidates } from '@/lib/matching/candidates';
import { PendingNotification } from '@/app/components/dashboard/pending-notification';
import { ProfileCard } from './components/ProfileCard';
import { MatchingCandidatesNotification } from './components/MatchingCandidatesNotification';
import { ChildFeaturePanel } from './components/ChildFeaturePanel';
import { ParentFeaturePanel } from './components/ParentFeaturePanel';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('role, verification_status, mynumber_verified')
    .eq('id', user.id)
    .single();


  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Get subscription for parents
  let subscription = null;
  if (userData?.role === 'parent') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    subscription = sub;
  }

  // テストモードチェック（開発環境のみ）
  const bypassVerification = process.env.NODE_ENV === 'development' && process.env.TEST_MODE_BYPASS_VERIFICATION === 'true';
  const bypassSubscription = process.env.NODE_ENV === 'development' && process.env.TEST_MODE_BYPASS_SUBSCRIPTION === 'true';
  // テストモードでは本人確認とサブスクリプションをバイパス
  const isVerified = bypassVerification || userData?.mynumber_verified;
  const isSubscriptionActive = bypassSubscription || subscription?.status === 'active';

  // Get matching candidates
  const matchingData = await getMatchingCandidates();

  return (
    <div className={`min-h-screen ${userData?.role === 'child' ? 'bg-child-50' : 'bg-parent-50'}`}>
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${userData?.role === 'child' ? 'text-child-900' : 'text-parent-900'}`}>ダッシュボード</h1>
        </div>
        {/* Pending Notifications */}
        <PendingNotification userRole={userData?.role} />
        <div className="lg:grid lg:grid-cols-[350px_550px] lg:gap-6 mb-6">
          {/* Profile Card */}
          <div className="mb-6 lg:mb-0">
            <ProfileCard userRole={userData?.role} profile={profile} />
          </div>
          {/* Right Side Content */}
          <div className="space-y-6">
            {/* Matching Candidates Notification */}
            <MatchingCandidatesNotification userRole={userData?.role} isVerified={isVerified} matchingData={matchingData} />
            {/* Feature Panel */}
            {userData?.role === 'child' ? (
              <ChildFeaturePanel isVerified={isVerified} />
            ) : (
              <ParentFeaturePanel isVerified={isVerified} isSubscriptionActive={isSubscriptionActive} subscription={subscription} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
