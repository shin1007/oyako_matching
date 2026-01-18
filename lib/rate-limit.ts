/**
 * レート制限機能
 * 
 * スパム防止のため、投稿とコメントの頻度を制限します。
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitConfig {
  /** 時間ウィンドウ（秒） */
  windowSeconds: number;
  /** 時間ウィンドウ内での最大アクション数 */
  maxActions: number;
}

export interface RateLimitResult {
  /** レート制限内かどうか */
  allowed: boolean;
  /** 制限超過の場合のエラーメッセージ */
  message?: string;
  /** 次に実行可能になる時刻 */
  retryAfter?: Date;
  /** 現在のウィンドウ内のアクション数 */
  currentCount?: number;
}

/**
 * 投稿のレート制限設定
 */
export const POST_RATE_LIMITS: RateLimitConfig[] = [
  { windowSeconds: 60, maxActions: 1 },      // 1分間に1投稿
  { windowSeconds: 3600, maxActions: 5 },    // 1時間に5投稿
  { windowSeconds: 86400, maxActions: 20 }   // 1日に20投稿
];

/**
 * コメントのレート制限設定
 */
export const COMMENT_RATE_LIMITS: RateLimitConfig[] = [
  { windowSeconds: 60, maxActions: 3 },      // 1分間に3コメント
  { windowSeconds: 3600, maxActions: 30 }    // 1時間に30コメント
];

/**
 * 同一投稿への連続コメントの最小間隔（秒）
 */
export const SAME_POST_COMMENT_INTERVAL_SECONDS = 30;

/**
 * フォールバック: エラー時の再試行までの待機時間（ミリ秒）
 */
const FALLBACK_RETRY_AFTER_MS = 60000; // 1分

/**
 * レート制限をチェックする
 * 
 * @param supabase - Supabaseクライアント
 * @param userId - ユーザーID
 * @param actionType - アクションタイプ ('post' または 'comment')
 * @param configs - レート制限設定の配列（複数の時間ウィンドウをチェック可能）
 * @param postId - コメントの場合、投稿ID（同一投稿への連続コメント防止用）
 * @returns レート制限結果
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  actionType: 'post' | 'comment',
  configs: RateLimitConfig[],
  postId?: string
): Promise<RateLimitResult> {
  try {
    // 各時間ウィンドウでチェック
    for (const config of configs) {
      const windowStart = new Date(Date.now() - config.windowSeconds * 1000);
      
      // 時間ウィンドウ内のアクション数を取得
      const query = supabase
        .from('rate_limits')
        .select('action_timestamp', { count: 'exact' })
        .eq('user_id', userId)
        .eq('action_type', actionType)
        .gte('action_timestamp', windowStart.toISOString());
      
      const { count, error } = await query;
      
      if (error) {
        console.error('Rate limit check error:', error);
        // データベースエラーの場合は制限を適用（セキュリティ優先）
        // サービス障害時の悪用を防ぐため
        return {
          allowed: false,
          message: '現在、一時的にサービスが混み合っています。しばらくしてから再度お試しください。',
          retryAfter: new Date(Date.now() + FALLBACK_RETRY_AFTER_MS)
        };
      }
      
      if (count !== null && count >= config.maxActions) {
        // 最も古いアクションのタイムスタンプを取得
        const { data: oldestAction } = await supabase
          .from('rate_limits')
          .select('action_timestamp')
          .eq('user_id', userId)
          .eq('action_type', actionType)
          .gte('action_timestamp', windowStart.toISOString())
          .order('action_timestamp', { ascending: true })
          .limit(1)
          .single();
        
        const retryAfter = oldestAction?.action_timestamp
          ? new Date(new Date(oldestAction.action_timestamp).getTime() + config.windowSeconds * 1000)
          : new Date(Date.now() + FALLBACK_RETRY_AFTER_MS);
        
        const windowLabel = getWindowLabel(config.windowSeconds);
        return {
          allowed: false,
          message: `${windowLabel}の制限に達しました。次の${actionType === 'post' ? '投稿' : 'コメント'}は ${formatRetryTime(retryAfter)} 以降に可能です。`,
          retryAfter,
          currentCount: count
        };
      }
    }
    
    // コメントの場合、同一投稿への連続コメントをチェック
    if (actionType === 'comment' && postId) {
      const { data: lastComment, error } = await supabase
        .from('rate_limits')
        .select('action_timestamp')
        .eq('user_id', userId)
        .eq('action_type', 'comment')
        .eq('post_id', postId)
        .order('action_timestamp', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && lastComment) {
        const timeSinceLastComment = Date.now() - new Date(lastComment.action_timestamp).getTime();
        if (timeSinceLastComment < SAME_POST_COMMENT_INTERVAL_SECONDS * 1000) {
          const retryAfter = new Date(new Date(lastComment.action_timestamp).getTime() + SAME_POST_COMMENT_INTERVAL_SECONDS * 1000);
          return {
            allowed: false,
            message: `同じ投稿への連続コメントは${SAME_POST_COMMENT_INTERVAL_SECONDS}秒以上間隔を空けてください。次のコメントは ${formatRetryTime(retryAfter)} 以降に可能です。`,
            retryAfter
          };
        }
      }
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // エラーの場合は制限を適用（セキュリティ優先）
    return {
      allowed: false,
      message: '現在、一時的にサービスが混み合っています。しばらくしてから再度お試しください。',
      retryAfter: new Date(Date.now() + FALLBACK_RETRY_AFTER_MS)
    };
  }
}

/**
 * レート制限アクションを記録する
 * 
 * @param supabase - Supabaseクライアント
 * @param userId - ユーザーID
 * @param actionType - アクションタイプ
 * @param postId - コメントの場合、投稿ID
 */
export async function recordRateLimitAction(
  supabase: SupabaseClient,
  userId: string,
  actionType: 'post' | 'comment',
  postId?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('rate_limits')
      .insert({
        user_id: userId,
        action_type: actionType,
        post_id: postId || null,
        action_timestamp: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to record rate limit action:', error);
    }
  } catch (error) {
    console.error('Rate limit recording failed:', error);
  }
}

/**
 * 時間ウィンドウの秒数を人間が読める形式に変換
 */
function getWindowLabel(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒間`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}分間`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}時間`;
  } else {
    return `${Math.floor(seconds / 86400)}日`;
  }
}

/**
 * 再試行可能時刻をフォーマット
 */
function formatRetryTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) {
    return '今すぐ';
  }
  
  const seconds = Math.ceil(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}時間${remainingMinutes > 0 ? remainingMinutes + '分' : ''}後`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds > 0 ? remainingSeconds + '秒' : ''}後`;
  } else {
    return `${seconds}秒後`;
  }
}

/**
 * 投稿のレート制限設定
 * @deprecated 定数は上部に移動しました
 */
export const POST_RATE_LIMITS_DEPRECATED = POST_RATE_LIMITS;

/**
 * コメントのレート制限設定
 * @deprecated 定数は上部に移動しました
 */
export const COMMENT_RATE_LIMITS_DEPRECATED = COMMENT_RATE_LIMITS;
