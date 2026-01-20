"use client";

export default function ErrorTestPage() {
  // このコンポーネントは必ずエラーを投げます
  throw new Error('グローバルエラーバウンダリのテストエラー');
  // return文は実行されません
  return <div>この行は表示されません</div>;
}
