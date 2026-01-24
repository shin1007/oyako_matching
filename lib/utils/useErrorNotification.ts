import { useCallback } from 'react';

/**
 * 共通エラー通知フック
 * - setError: error state setter (useStateのsetError)
 * - options: { log?: boolean, alert?: boolean }
 *
 * 例: const notifyError = useErrorNotification(setError)
 *      try { ... } catch(e) { notifyError(e) }
 */
export function useErrorNotification(
  setError: (msg: string) => void,
  options?: { log?: boolean; alert?: boolean }
) {
  return useCallback(
    (err: unknown) => {
      let msg = '予期しないエラーが発生しました';
      if (err instanceof Error) msg = err.message;
      else if (typeof err === 'string') msg = err;
      setError(msg);
      if (options?.log) console.error('[Error]', err);
      if (options?.alert) alert(msg);
    },
    [setError, options]
  );
}
