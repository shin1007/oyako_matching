import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  // Debug: log environment variables in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Supabase Client Init:', {
      url: supabaseUrl,
      hasKey: !!supabaseKey,
      keyLength: supabaseKey?.length || 0,
      keyPrefix: supabaseKey?.substring(0, 20) + '...',
    });
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      `Missing Supabase environment variables: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
