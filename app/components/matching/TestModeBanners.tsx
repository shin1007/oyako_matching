import React from 'react';

interface TestModeBannersProps {
  bypassVerification: boolean;
  bypassSubscription: boolean;
}

export const TestModeBanners: React.FC<TestModeBannersProps> = ({ bypassVerification, bypassSubscription }) => (
  <>
    {bypassVerification && (
      <div className="mb-6 rounded-lg border-2 border-blue-400 bg-blue-50 p-4 text-blue-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">✅</span>
          <span className="font-semibold">テストモード: マイナンバー認証がスキップされています</span>
        </div>
      </div>
    )}
    {bypassSubscription && (
      <div className="mb-6 rounded-lg border-2 border-purple-400 bg-purple-50 p-4 text-purple-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">✅</span>
          <span className="font-semibold">テストモード: サブスクリプションがスキップされています</span>
        </div>
      </div>
    )}
  </>
);
