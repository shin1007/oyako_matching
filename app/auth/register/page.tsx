import { Suspense } from 'react';
import RegisterForm from './RegisterForm';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">新規登録</h1>
          <p className="mt-2 text-gray-900">親子マッチング</p>
        </div>
        <Suspense fallback={
          <div className="rounded-lg bg-white p-8 shadow-lg text-center text-gray-900">読み込み中...</div>
        }>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
