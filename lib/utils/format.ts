// フォーマット系ユーティリティ関数集約
// すべて日本語コメントで記述

/**
 * 日付を「◯時間前」「◯日前」などに変換
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return '1時間以内';
  if (hours < 24) return `${hours}時間前`;
  if (hours < 48) return '1日前';
  return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
}

/**
 * 再試行可能時刻を「◯分後」などに変換
 */
export function formatRetryTime(date: Date): string {
  const now = new Date();
  const diff = Math.max(0, Math.floor((date.getTime() - now.getTime()) / 1000));
  if (diff < 60) return `${diff}秒後`;
  const min = Math.floor(diff / 60);
  return `${min}分後`;
}
