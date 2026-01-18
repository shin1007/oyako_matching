import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Optional: bypass Supabase session refresh in dev when networking issues occur
  if (process.env.DISABLE_SUPABASE_MIDDLEWARE === 'true') {
    return supabaseResponse;
  }

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch (e) {
    // In development, avoid crashing on network/auth fetch failures
    // Edge sandbox may intermittently fail to reach external services
    // Proceed without user to keep dev server running
    console.warn('Supabase auth.getUser failed in middleware:', e);
  }

  // 保護されたルートのパターン定義
  const protectedRoutes = [
    '/dashboard',
    '/matching',
    '/messages',
    '/forum',
    '/payments',
  ];

  // 現在のパスが保護されたルートかチェック
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // 保護されたルートで未認証の場合、ログインページにリダイレクト
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth/login', request.url);
    // リダイレクト後に元のページに戻れるよう、リダイレクト先URLをクエリパラメータに含める
    redirectUrl.searchParams.set('redirect', pathname);
    
    const response = NextResponse.redirect(redirectUrl);
    // クッキーを保持
    const cookies = supabaseResponse.cookies.getAll();
    cookies.forEach(({ name, value, ...options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse;
}
