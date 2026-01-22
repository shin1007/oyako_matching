
'use client';
import { useState } from 'react';

interface ScoreExplanationProps {
  userRole: 'parent' | 'child';
}

export function ScoreExplanation({ userRole }: ScoreExplanationProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition border border-blue-600"
        aria-label="計算式を表示"
      >
        ?
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-4 rounded-t-xl flex items-center justify-between border-b border-blue-600">
              <h3 className="text-xl font-bold">マッチングスコアの計算方法</h3>
              <button onClick={() => setIsOpen(false)} className="text-white hover:text-blue-200 text-2xl font-bold leading-none">×</button>
            </div>
            <div className="px-6 py-6 space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400 mb-4">
                <h4 className="font-bold text-blue-800 mb-2">親・子ども双方の情報をもとにスコアを算出します</h4>
                <ul className="text-sm text-gray-700 list-disc ml-5">
                  <li>生年月日、氏名（ひらがな）、出身地（都道府県・市区町村）を比較</li>
                  <li>親→子、子→親の両方向でスコアを計算し合算</li>
                </ul>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="font-bold text-gray-800 mb-1">🎂 生年月日一致度</h5>
                  <ul className="text-sm text-gray-600 ml-4 list-disc">
                    <li>年月日すべて一致: <span className="font-bold text-blue-600">80点</span></li>
                    <li>月日一致: <span className="font-bold text-blue-600">70点</span></li>
                    <li>年月一致: <span className="font-bold text-blue-600">60点</span></li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-1">さらに年齢差が近い場合は最大+5点加算</p>
                </div>
                <div>
                  <h5 className="font-bold text-gray-800 mb-1">👤 氏名（ひらがな）一致度</h5>
                  <ul className="text-sm text-gray-600 ml-4 list-disc">
                    <li>名字・名前とも一致: <span className="font-bold text-blue-600">10点</span></li>
                    <li>名前のみ一致: <span className="font-bold text-blue-600">7点</span></li>
                    <li>名字のみ一致: <span className="font-bold text-blue-600">3点</span></li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-bold text-gray-800 mb-1">📍 出身地一致度</h5>
                  <ul className="text-sm text-gray-600 ml-4 list-disc">
                    <li>都道府県・市区町村とも一致: <span className="font-bold text-blue-600">10点</span></li>
                    <li>都道府県のみ一致: <span className="font-bold text-blue-600">7点</span></li>
                  </ul>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400 mt-4">
                <h5 className="font-bold text-purple-800 mb-2">スコア合算方法</h5>
                <ul className="text-sm text-gray-700 list-disc ml-5">
                  <li>親→子のスコア × 0.6</li>
                  <li>子→親のスコア × 0.4</li>
                  <li>合計100点満点で算出</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">※ 片方向のみの場合はそのスコアのみを使用</p>
              </div>
            </div>
            <div className="sticky bottom-0 bg-blue-100 px-6 py-4 rounded-b-xl border-t border-blue-500">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition border border-blue-600"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
