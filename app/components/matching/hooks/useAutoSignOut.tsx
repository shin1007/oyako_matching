// useAutoSignOut.tsx
// ユーザーの無操作時に自動サインアウトするカスタムフック
// 各保護ページで呼び出してください

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function useAutoSignOut(idleMinutes: number = 15) {
  useEffect(() => {
    const supabase = createClient();
    const router = useRouter();
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/auth/login?timeout=1');
      }, idleMinutes * 60 * 1000);
    };

    ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach((event) => {
      window.addEventListener(event, resetTimer);
    });
    resetTimer();
    return () => {
      clearTimeout(timeoutId);
      ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [idleMinutes]);
}
