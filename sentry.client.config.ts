// Sentry（Next.js用）初期化
// 日本語コメント付き
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0, // 本番は0.1程度に調整推奨
  environment: process.env.NODE_ENV,
  // その他必要に応じて設定
});
