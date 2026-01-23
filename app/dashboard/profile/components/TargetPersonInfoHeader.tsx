import React from 'react';

interface TargetPersonInfoHeaderProps {
  userRole: 'parent' | 'child' | null;
}

export const TargetPersonInfoHeader: React.FC<TargetPersonInfoHeaderProps> = ({ userRole }) => (
  <>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      {userRole === 'child' ? '探している親の情報' : '探している子どもの情報'}
    </h3>
    <div className={`${userRole === 'child' ? 'bg-child-50 border-l-4 border-child-400' : 'bg-parent-50 border-l-4 border-parent-400'} rounded-lg p-4 mb-4`}>
      <p className="text-sm text-gray-700 mb-2">
        {userRole === 'child'
          ? <><strong>親を探す情報（任意）：</strong>この情報を登録すると、双方向マッチングで精度が向上します。登録しない場合は、親があなたを探す情報のみでマッチングされます。</>
          : <><strong>子どもを探す情報（任意）：</strong>この情報がマッチングの基準になります。覚えている範囲で詳しく入力するほど、正確なマッチングが可能になります。最大5人まで登録できます。</>}
      </p>
      <ul className="text-xs text-gray-600 space-y-1 ml-4">
        <li>• <strong>生年月日</strong>が最も重要な情報です（最大80点）</li>
        <li>• <strong>氏名</strong>を入力すると+10点のボーナス</li>
        <li>• <strong>出身地</strong>を入力すると+10点のボーナス</li>
        <li>• {userRole === 'child' ? '性別が不一致の場合は候補から除外されます' : 'すべての項目が任意です'}</li>
      </ul>
    </div>
  </>
);
