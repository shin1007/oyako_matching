import React, { useState } from 'react';
import { TargetPerson } from '@/types/profile';

interface TargetPersonCardProps {
  person: TargetPerson;
  className?: string;
}

/**
 * 子ども・ターゲット情報の共通表示カード
 */
export const TargetPersonCard: React.FC<TargetPersonCardProps> = ({
  person,
  className = '',
}) => (
  <div className={`flex items-center gap-2 bg-blue-50 rounded p-2 ${className}`}>
    {(() => {
      const [showPreviewModal, setShowPreviewModal] = useState(false);
      if (person.photoUrl) {
        return <>
          <img
            src={person.photoUrl}
            alt={person.nameKanji || person.nameHiragana || ''}
            className="h-10 w-10 rounded object-cover border border-gray-200 cursor-pointer"
            onClick={() => setShowPreviewModal(true)}
          />
          {showPreviewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setShowPreviewModal(false)}>
              <div className="bg-white rounded-lg p-4 max-w-lg w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                <img
                  src={person.photoUrl}
                  alt="拡大写真"
                  className="max-w-full max-h-[80vh] rounded-lg border-2 border-gray-200"
                />
                <button
                  className="mt-4 px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  onClick={() => setShowPreviewModal(false)}
                >閉じる</button>
              </div>
            </div>
          )}
        </>;
      } else {
        return null;
      }
    })()}
    <div>
      <p className="text-sm font-semibold text-gray-900">
        {person.nameKanji || person.nameHiragana || ''}
      </p>
      {(person.birthplacePrefecture || person.birthplaceMunicipality) && (
        <p className="text-xs text-gray-900">出身地: {person.birthplacePrefecture || ''}{person.birthplaceMunicipality ? ' ' + person.birthplaceMunicipality : ''}</p>
      )}
    </div>
  </div>
);
