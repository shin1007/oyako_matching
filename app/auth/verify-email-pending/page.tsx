'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

/**
 * メールパラメータからの初期化を処理
 */
async function handleEmailParamInitialization(
  emailParam: string,
  supabase: any,
  setEmail: (email: string) => void,
  setInputEmail: (email: string) => void,
  setSuccess: (msg: string) => void,
  setShowEmailInput: (show: boolean) => void
) {
  console.log('[VerifyEmailPending] Email from URL params:', emailParam);
  setEmail(emailParam);
  setInputEmail(emailParam);
  setSuccess(`${emailParam} に確認メールを送信しました`);
  setShowEmailInput(false);
  
  // Proactively resend directly to ensure delivery when arriving from signup without session
  try {
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: emailParam,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/verify-email`,
      },
    });
    if (resendError) {
      console.warn('[VerifyEmailPending] Direct resend reported error:', resendError);
    }
  } catch (resendErr) {
    console.warn('[VerifyEmailPending] Auto-resend failed:', resendErr);
  }
}

/**
 * 検証済み状態を処理
 */
async function handleVerifiedState(
  supabase: any,
  router: any,
  setSuccess: (msg: string) => void,
  setIsVerified: (verified: boolean) => void
) {
  console.log('[VerifyEmailPending] Email verified successfully');
  setSuccess('メールアドレスの確認が完了しました！');
  setIsVerified(true);
  
  // Try to get user session, but don't fail if it's not available yet
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('[VerifyEmailPending] User session found:', user.email);
      await supabase
        .from('users')
        .update({ email_verified_at: user.email_confirmed_at || new Date().toISOString() })
        .eq('id', user.id);
    } else {
      console.log('[VerifyEmailPending] No user session yet, but verification was successful');
    }
  } catch (err) {
    console.log('[VerifyEmailPending] Could not get user session, but verification was successful:', err);
  }
  
  // Redirect to login page after a short delay
  setTimeout(() => {
    router.push('/auth/login');
  }, 2000);
}

/**
 * URLエラーパラメータを処理
 */
function handleErrorParam(errorParam: string, setError: (msg: string) => void) {
  console.log('[VerifyEmailPending] Error in URL params:', errorParam);
  
  const errorMessages: Record<string, string> = {
    verification_failed: 'メール確認に失敗しました。リンクが無効か期限切れです。',
    missing_params: '無効な確認リンクです。',
    unexpected: '予期しないエラーが発生しました。',
  };
  
  setError(errorMessages[errorParam] || '予期しないエラーが発生しました。');
}

function VerifyEmailPendingContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [nextAllowedAt, setNextAllowedAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // Prevent multiple executions
    if (hasCheckedStatus) return;
    
    const initializePage = async () => {
      console.log('[VerifyEmailPending] Initializing page...');
      
      // Get email from URL params if available
      const emailParam = searchParams.get('email');
      if (emailParam) {
        await handleEmailParamInitialization(
          emailParam,
          supabase,
          setEmail,
          setInputEmail,
          setSuccess,
          setShowEmailInput
        );
        setHasCheckedStatus(true);
        return;
      }
      
      // Check URL params for verification status
      const verified = searchParams.get('verified');
      const errorParam = searchParams.get('error');
      
      if (verified === 'true') {
        await handleVerifiedState(supabase, router, setSuccess, setIsVerified);
        setHasCheckedStatus(true);
        return;
      }
      
      if (errorParam) {
        handleErrorParam(errorParam, setError);
      }

      // Check user status only if not already in a verification result state
      await checkUserStatus();
      setHasCheckedStatus(true);
    };

    initializePage();
  }, []); // Empty dependency array - run only once on mount

  // Countdown timer for rate limit
  useEffect(() => {
    if (!nextAllowedAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = nextAllowedAt.getTime() - now;
      
      if (timeLeft <= 0) {
        setCountdown(0);
        setNextAllowedAt(null);
      } else {
        setCountdown(Math.ceil(timeLeft / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextAllowedAt]);

  const checkUserStatus = async () => {
    try {
      console.log('[VerifyEmailPending] Checking user status...');
      
      // 早期リターン: URLパラメータからのメールがある場合
      if (email) {
        console.log('[VerifyEmailPending] Email from URL params - showing success message for new registration');
        setShowEmailInput(false);
        return;
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // 早期リターン: ユーザー取得エラー
      if (userError) {
        console.error('[VerifyEmailPending] Error getting user:', userError);
        setError('ユーザー情報の取得に失敗しました。メールアドレスを入力してください。');
        setShowEmailInput(true);
        return;
      }
      
      // 早期リターン: ユーザーが存在しない場合
      if (!user) {
        console.log('[VerifyEmailPending] No user and no email - redirecting to login');
        setError('セッションが見つかりません。ログインしてください。');
        setTimeout(() => router.push('/auth/login'), 2000);
        return;
      }

      console.log('[VerifyEmailPending] User found:', user.email, 'Email confirmed:', !!user.email_confirmed_at);
      setEmail(user.email || '');
      setInputEmail(user.email || '');

      // 早期リターン: メールが既に確認済みの場合
      if (user.email_confirmed_at) {
        console.log('[VerifyEmailPending] Email already verified - redirecting to dashboard');
        setIsVerified(true);
        setSuccess('メールアドレスは既に確認済みです');
        await supabase
          .from('users')
          .update({ email_verified_at: user.email_confirmed_at })
          .eq('id', user.id);
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
        return;
      }

      // Check recent attempts for rate limiting
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: attempts } = await supabase
        .from('email_verification_attempts')
        .select('*')
        .eq('user_id', user.id)
        .gte('attempted_at', oneHourAgo.toISOString())
        .order('attempted_at', { ascending: false });

      if (attempts && attempts.length > 0) {
        const remaining = Math.max(0, 3 - attempts.length);
        setAttemptsRemaining(remaining);
        
        if (attempts.length >= 3) {
          const oldestAttempt = attempts[attempts.length - 1];
          const nextTime = new Date(
            new Date(oldestAttempt.attempted_at).getTime() + 60 * 60 * 1000
          );
          setNextAllowedAt(nextTime);
        }
      }
    } catch (err) {
      console.error('[VerifyEmailPending] Error checking user status:', err);
      setShowEmailInput(true);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    // 早期リターン: メールアドレスの検証（入力フィールドを使用している場合）
    if (showEmailInput) {
      if (!inputEmail) {
        setError('メールアドレスを入力してください');
        setLoading(false);
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inputEmail)) {
        setError('メールアドレスの形式が正しくありません');
        setLoading(false);
        return;
      }
      setEmail(inputEmail);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 早期リターン: ログインしていないユーザーの場合
      if (!user && (showEmailInput || email)) {
        const targetEmail = showEmailInput ? inputEmail : email;
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: targetEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/verify-email`
          }
        });

        if (resendError) {
          throw resendError;
        }

        setSuccess(`${targetEmail} に確認メールを送信しました`);
        if (showEmailInput) {
          setShowEmailInput(false);
        }
        if (attemptsRemaining > 0) {
          setAttemptsRemaining(prev => Math.max(0, prev - 1));
        }
        setLoading(false);
        return;
      }

      // For logged-in users, use API for rate limiting and tracking
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(data.error);
          if (data.nextAllowedAt) {
            setNextAllowedAt(new Date(data.nextAllowedAt));
          }
        } else {
          throw new Error(data.error || '送信に失敗しました');
        }
      } else {
        setSuccess(data.message);
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }
        if (showEmailInput) {
          setShowEmailInput(false);
        }
        setTimeout(() => checkUserStatus(), 1000);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('認証メールの送信に失敗しました');
      let errorMessage = error.message;
      
      // Translate Supabase rate limit errors
      if (errorMessage.includes('For security purposes')) {
        const match = errorMessage.match(/after (\d+) seconds?/);
        if (match) {
          const seconds = match[1];
          errorMessage = `セキュリティのため、${seconds}秒後に再試行してください。`;
        } else {
          errorMessage = 'セキュリティのため、しばらくしてから再試行してください。';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <div className="text-center">
              <div className="mb-4 text-6xl">✅</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                メール確認完了
              </h1>
              <p className="text-gray-600 mb-6">
                メールアドレスの確認が完了しました
              </p>
              {success && (
                <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600">
                  {success}
                </div>
              )}
              <p className="text-sm text-gray-500 mb-4">
                ログインページに移動しています...
              </p>
              <Link
                href="/auth/login"
                className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
              >
                ログインページへ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mb-4 text-6xl">📧</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              メールアドレスの確認
            </h1>
            {email && !showEmailInput ? (
              <p className="text-gray-600">
                {email} に確認メールを送信しました
              </p>
            ) : (
              <p className="text-gray-600">
                確認メールを送信します
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600">
              {success}
            </div>
          )}

          {showEmailInput && (
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">
                登録時に使用したメールアドレスを入力してください
              </p>
            </div>
          )}

          <div className="mb-6 space-y-4 rounded-lg bg-blue-50 p-4">
            <h2 className="font-semibold text-blue-900 text-sm">
              確認手順
            </h2>
            <ol className="list-inside list-decimal space-y-2 text-sm text-blue-800">
              <li>受信したメールを開く</li>
              <li>メール内の確認リンクをクリック</li>
              <li>自動的にログインされます</li>
            </ol>
          </div>

          <div className="mb-6 text-sm text-gray-600">
            <p className="mb-2">メールが届かない場合：</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>迷惑メールフォルダを確認</li>
              <li>メールアドレスが正しいか確認</li>
              <li>数分待ってから再送信</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={loading || isVerified || (countdown > 0 && !showEmailInput) || (!showEmailInput && attemptsRemaining === 0)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? '送信中...'
                : countdown > 0 && !showEmailInput
                ? `再送信可能まで ${formatCountdown(countdown)}`
                : !showEmailInput && attemptsRemaining === 0
                ? '送信回数の上限に達しました'
                : showEmailInput
                ? '確認メールを送信'
                : '確認メールを再送信'}
            </button>

            {!showEmailInput && attemptsRemaining > 0 && countdown === 0 && (
              <p className="text-center text-xs text-gray-500">
                残り送信回数: {attemptsRemaining}/3（1時間あたり）
              </p>
            )}

            <Link
              href="/auth/login"
              className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-gray-700 hover:bg-gray-50"
            >
              ログイン画面に戻る
            </Link>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>
              問題が解決しない場合は、サポートにお問い合わせください
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-white p-8 shadow-lg text-center text-gray-600">
            読み込み中...
          </div>
        </div>
      </div>
    }>
      <VerifyEmailPendingContent />
    </Suspense>
  );
}
