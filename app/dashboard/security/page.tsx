import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PasskeyRegister from '@/app/components/passkey/PasskeyRegister';
import PasskeyList from '@/app/components/passkey/PasskeyList';
import ChangePasswordForm from '@/app/components/security/ChangePasswordForm';

export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = userData?.role || 'parent';

  return (
    <div className={`min-h-screen py-8 ${userRole === 'child' ? 'bg-child-50' : 'bg-parent-50'}`}>
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">セキュリティ設定</h1>
          <p className="mt-2 text-gray-600">
            パスキーを管理して、アカウントのセキュリティを強化しましょう
          </p>
        </div>

        <div className="space-y-8">
          {/* Password Change Section */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              パスワード変更
            </h2>
            <ChangePasswordForm />
          </div>

          {/* Passkey Registration Section */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              新しいパスキーを登録
            </h2>
            <PasskeyRegister
              onSuccess={() => {
                // Refresh the page to show the new passkey
                window.location.reload();
              }}
            />
          </div>

          {/* Registered Passkeys Section */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              登録済みのパスキー
            </h2>
            <PasskeyList />
          </div>

          {/* Information Section */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              パスキーについて
            </h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <h3 className="font-medium text-gray-900">🔐 セキュリティ</h3>
                <p className="mt-1">
                  パスキーは公開鍵暗号化技術を使用しており、フィッシング攻撃に強く、パスワードよりも安全です。
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">📱 デバイス固有</h3>
                <p className="mt-1">
                  各パスキーは登録したデバイスに固有です。複数のデバイスでログインする場合は、それぞれでパスキーを登録してください。
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">🔄 バックアップ</h3>
                <p className="mt-1">
                  パスキーを削除すると、そのデバイスではパスキーログインができなくなります。メール/パスワード認証は引き続き利用できます。
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">✅ 対応ブラウザ</h3>
                <p className="mt-1">
                  Chrome、Safari、Firefox、Edgeの最新版で利用できます。モバイルブラウザでも利用可能です。
                </p>
              </div>
            </div>
          </div>

          {/* Account Settings Link */}
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">
              メールアドレスの変更や、その他のアカウント設定は{' '}
              <a href="/dashboard/profile" className={`hover:underline ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>
                プロフィール設定
              </a>{' '}
              から行えます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
