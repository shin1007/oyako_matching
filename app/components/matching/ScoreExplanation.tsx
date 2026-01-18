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
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition"
        aria-label="計算式を表示"
      >
        ?
      </button>

      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* モーダル */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">マッチング度の計算方法</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="px-6 py-6 space-y-6">
                {userRole === 'parent' ? (
                  <>
                    {/* 親アカウント用の説明 */}
                    <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                      <h4 className="font-bold text-green-800 mb-2">📊 基本的な考え方</h4>
                      <p className="text-sm text-gray-700">
                        あなたが登録した「探している子ども」の情報と、相手のプロフィールがどれだけ一致するかを計算しています。
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-blue-600">🎯</span>
                        親から見た計算（60%の重み）
                      </h4>
                      <div className="space-y-3 pl-4 border-l-2 border-blue-300">
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">🎂 誕生日の一致度</div>
                          <ul className="text-sm text-gray-600 space-y-1 ml-4">
                            <li>• 年月日すべて同じ → <strong className="text-blue-600">80点</strong></li>
                            <li>• 月日が同じ → <strong className="text-blue-600">70点</strong></li>
                            <li>• 年月が同じ → <strong className="text-blue-600">60点</strong></li>
                            <li>• 年と日が同じ → <strong className="text-blue-600">55点</strong></li>
                            <li>• 年だけ同じ → <strong className="text-blue-600">50点</strong></li>
                          </ul>
                        </div>
                        
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">👤 氏名が一致</div>
                          <p className="text-sm text-gray-600 ml-4">→ <strong className="text-blue-600">+10点</strong></p>
                        </div>
                        
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">📍 出身地（都道府県）が一致</div>
                          <p className="text-sm text-gray-600 ml-4">→ <strong className="text-blue-600">+10点</strong></p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-purple-600">🔄</span>
                        相手の子が親を探している場合（40%の重み）
                      </h4>
                      <div className="space-y-3 pl-4 border-l-2 border-purple-300">
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">⚠️ 性別チェック（必須）</div>
                          <p className="text-sm text-gray-600 ml-4">
                            相手が探している親の性別とあなたの性別が<strong className="text-red-600">一致しない場合は0点</strong>
                          </p>
                        </div>
                        
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">🎂 生年の近さ</div>
                          <ul className="text-sm text-gray-600 space-y-1 ml-4">
                            <li>• 5年以内の差 → <strong className="text-purple-600">+30点</strong></li>
                            <li>• 10年以内の差 → <strong className="text-purple-600">+20点</strong></li>
                          </ul>
                        </div>
                        
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">👤 氏名の一致</div>
                          <p className="text-sm text-gray-600 ml-4">→ <strong className="text-purple-600">+15点</strong></p>
                        </div>
                        
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">📍 出身地が一致</div>
                          <p className="text-sm text-gray-600 ml-4">→ <strong className="text-purple-600">+15点</strong></p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-bold text-gray-800 mb-2">🧮 最終的な計算式</h4>
                      <div className="bg-white rounded p-3 font-mono text-sm">
                        <div className="text-center">
                          <div className="text-blue-600 font-bold">親から見たスコア × 60%</div>
                          <div className="text-gray-500 my-1">＋</div>
                          <div className="text-purple-600 font-bold">子から見たスコア × 40%</div>
                          <div className="border-t-2 border-gray-300 my-2"></div>
                          <div className="text-green-600 font-bold text-lg">＝ 最終スコア（最大100%）</div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-3 text-center">
                        ※ 親の記憶により重きを置いた計算になっています
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 子アカウント用の説明 */}
                    <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                      <h4 className="font-bold text-green-800 mb-2">📊 基本的な考え方</h4>
                      <p className="text-sm text-gray-700">
                        相手の親が探している子どもの情報とあなたのプロフィールがどれだけ一致するかを計算しています。
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-blue-600">🎯</span>
                        親から見た計算（60%の重み）
                      </h4>
                      <div className="space-y-3 pl-4 border-l-2 border-blue-300">
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">🎂 誕生日の一致度</div>
                          <ul className="text-sm text-gray-600 space-y-1 ml-4">
                            <li>• 年月日すべて同じ → <strong className="text-blue-600">80点</strong></li>
                            <li>• 月日が同じ → <strong className="text-blue-600">70点</strong></li>
                            <li>• 年月が同じ → <strong className="text-blue-600">60点</strong></li>
                          </ul>
                        </div>
                        
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">👤 氏名が一致</div>
                          <p className="text-sm text-gray-600 ml-4">→ <strong className="text-blue-600">+10点</strong></p>
                        </div>
                        
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">📍 出身地（都道府県）が一致</div>
                          <p className="text-sm text-gray-600 ml-4">→ <strong className="text-blue-600">+10点</strong></p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-purple-600">🔄</span>
                        あなたが親を探している場合（40%の重み）
                      </h4>
                      <div className="space-y-3 pl-4 border-l-2 border-purple-300">
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">⚠️ 性別チェック（重要）</div>
                          <p className="text-sm text-gray-600 ml-4">
                            あなたが探している親の性別と相手の性別が<strong className="text-red-600">一致しない場合は計算から除外</strong>
                          </p>
                        </div>
                        
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">🎂 生年の近さ</div>
                          <ul className="text-sm text-gray-600 space-y-1 ml-4">
                            <li>• 5年以内の差 → <strong className="text-purple-600">+30点</strong></li>
                            <li>• 10年以内の差 → <strong className="text-purple-600">+20点</strong></li>
                            <li>• 15年以内の差 → <strong className="text-purple-600">+10点</strong></li>
                          </ul>
                        </div>
                        
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">👤 氏名の一致</div>
                          <p className="text-sm text-gray-600 ml-4">→ <strong className="text-purple-600">+15点</strong></p>
                        </div>
                        
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="font-semibold text-gray-800 mb-1">📍 出身地が一致</div>
                          <p className="text-sm text-gray-600 ml-4">→ <strong className="text-purple-600">+15点</strong></p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-bold text-gray-800 mb-2">🧮 最終的な計算式</h4>
                      <div className="bg-white rounded p-3 font-mono text-sm">
                        <div className="text-center">
                          <div className="text-blue-600 font-bold">親から見たスコア × 60%</div>
                          <div className="text-gray-500 my-1">＋</div>
                          <div className="text-purple-600 font-bold">子から見たスコア × 40%</div>
                          <div className="border-t-2 border-gray-300 my-2"></div>
                          <div className="text-green-600 font-bold text-lg">＝ 最終スコア（最大100%）</div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-3 text-center">
                        ※ 親の記憶により重きを置いた計算になっています
                      </p>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        親を探す情報を登録していない場合は、親から見たスコアのみが使用されます
                      </p>
                    </div>
                  </>
                )}

                <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400">
                  <h4 className="font-bold text-yellow-800 mb-2">💡 ポイント</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 生年月日が完全に一致すると基本スコアが高くなります</li>
                    <li>• 氏名や出身地の情報を登録すると精度が上がります</li>
                    <li>• 親の記憶がより確実なため、親からの一致度を重視しています</li>
                  </ul>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
