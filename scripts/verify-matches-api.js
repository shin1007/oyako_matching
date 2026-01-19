#!/usr/bin/env node

/**
 * マッチ一覧API検証スクリプト
 * 
 * このスクリプトは、最適化されたマッチ一覧APIのロジックを検証します。
 * 実際のデータベースに接続せず、ロジックの正確性のみを確認します。
 */

// ページネーション計算のテスト
function testPagination() {
  console.log('=== ページネーション計算テスト ===\n');

  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;

  const testCases = [
    // [page, limit, totalCount, expected]
    [1, 20, 100, { page: 1, limit: 20, offset: 0, total_pages: 5 }],
    [2, 20, 100, { page: 2, limit: 20, offset: 20, total_pages: 5 }],
    [1, 50, 150, { page: 1, limit: 50, offset: 0, total_pages: 3 }],
    [3, 30, 85, { page: 3, limit: 30, offset: 60, total_pages: 3 }],
    [1, 150, 200, { page: 1, limit: 100, offset: 0, total_pages: 2 }], // MAX_LIMIT適用
    ['invalid', 'invalid', 50, { page: 1, limit: 20, offset: 0, total_pages: 3 }], // デフォルト値
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach(([inputPage, inputLimit, totalCount, expected], index) => {
    const page = Math.max(1, parseInt(inputPage) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(inputLimit) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;
    const total_pages = Math.ceil(totalCount / limit);

    const result = { page, limit, offset, total_pages };
    const isEqual = JSON.stringify(result) === JSON.stringify(expected);

    if (isEqual) {
      console.log(`✓ テスト ${index + 1}: 合格`);
      passed++;
    } else {
      console.log(`✗ テスト ${index + 1}: 不合格`);
      console.log(`  入力: page=${inputPage}, limit=${inputLimit}, total=${totalCount}`);
      console.log(`  期待値: ${JSON.stringify(expected)}`);
      console.log(`  実際値: ${JSON.stringify(result)}`);
      failed++;
    }
  });

  console.log(`\n結果: ${passed}合格 / ${failed}不合格\n`);
  return failed === 0;
}

// 未読メッセージ数集計のテスト
function testUnreadCountAggregation() {
  console.log('=== 未読メッセージ数集計テスト ===\n');

  const mockMessages = [
    { match_id: 'match1', sender_id: 'user2' },
    { match_id: 'match1', sender_id: 'user2' },
    { match_id: 'match1', sender_id: 'user2' },
    { match_id: 'match2', sender_id: 'user3' },
    { match_id: 'match2', sender_id: 'user3' },
    { match_id: 'match3', sender_id: 'user4' },
  ];

  const unreadCountsMap = new Map();
  mockMessages.forEach((msg) => {
    const count = unreadCountsMap.get(msg.match_id) || 0;
    unreadCountsMap.set(msg.match_id, count + 1);
  });

  const expected = new Map([
    ['match1', 3],
    ['match2', 2],
    ['match3', 1],
  ]);

  let passed = true;
  for (const [matchId, expectedCount] of expected.entries()) {
    const actualCount = unreadCountsMap.get(matchId);
    if (actualCount === expectedCount) {
      console.log(`✓ ${matchId}: ${actualCount}件（正しい）`);
    } else {
      console.log(`✗ ${matchId}: 期待値=${expectedCount}, 実際値=${actualCount}`);
      passed = false;
    }
  }

  console.log(`\n結果: ${passed ? '合格' : '不合格'}\n`);
  return passed;
}

// 最終メッセージ抽出のテスト
function testLastMessageExtraction() {
  console.log('=== 最終メッセージ抽出テスト ===\n');

  const mockMessages = [
    { match_id: 'match1', content: 'メッセージ3', created_at: '2024-01-03T00:00:00Z', sender_id: 'user1' },
    { match_id: 'match1', content: 'メッセージ1', created_at: '2024-01-01T00:00:00Z', sender_id: 'user2' },
    { match_id: 'match1', content: 'メッセージ2', created_at: '2024-01-02T00:00:00Z', sender_id: 'user1' },
    { match_id: 'match2', content: '最新', created_at: '2024-01-05T00:00:00Z', sender_id: 'user3' },
    { match_id: 'match2', content: '古い', created_at: '2024-01-04T00:00:00Z', sender_id: 'user3' },
  ];

  // 降順にソートされていると仮定（データベースのorder byを模倣）
  const sortedMessages = [...mockMessages].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const lastMessagesMap = new Map();
  sortedMessages.forEach((msg) => {
    if (!lastMessagesMap.has(msg.match_id)) {
      lastMessagesMap.set(msg.match_id, msg);
    }
  });

  const expected = new Map([
    ['match1', { content: 'メッセージ3', created_at: '2024-01-03T00:00:00Z' }],
    ['match2', { content: '最新', created_at: '2024-01-05T00:00:00Z' }],
  ]);

  let passed = true;
  for (const [matchId, expectedMsg] of expected.entries()) {
    const actualMsg = lastMessagesMap.get(matchId);
    if (actualMsg?.content === expectedMsg.content && actualMsg?.created_at === expectedMsg.created_at) {
      console.log(`✓ ${matchId}: ${actualMsg.content}（正しい）`);
    } else {
      console.log(`✗ ${matchId}: 期待値=${JSON.stringify(expectedMsg)}, 実際値=${JSON.stringify(actualMsg)}`);
      passed = false;
    }
  }

  console.log(`\n結果: ${passed ? '合格' : '不合格'}\n`);
  return passed;
}

// 写真マッピングのテスト
function testPhotoMapping() {
  console.log('=== 写真マッピングテスト ===\n');

  const searchingChildren = [
    { id: 'child1', user_id: 'user1' },
    { id: 'child2', user_id: 'user1' }, // 同じユーザーの2番目の子ども
    { id: 'child3', user_id: 'user2' },
  ];

  const photos = [
    { searching_child_id: 'child1', photo_url: 'https://example.com/photo1.jpg' },
    { searching_child_id: 'child1', photo_url: 'https://example.com/photo2.jpg' }, // 同じ子の2枚目（無視される）
    { searching_child_id: 'child2', photo_url: 'https://example.com/photo3.jpg' }, // 2番目の子（無視される）
    { searching_child_id: 'child3', photo_url: 'https://example.com/photo4.jpg' },
  ];

  const photosMap = new Map();
  const userChildMap = new Map();
  const childToUserMap = new Map();
  
  // 各ユーザーの最初の子どものIDを記録
  searchingChildren.forEach((child) => {
    if (!userChildMap.has(child.user_id)) {
      userChildMap.set(child.user_id, child.id);
    }
    childToUserMap.set(child.id, child.user_id);
  });

  // 最初の子どもの最初の写真のみを保持（効率的な実装）
  photos.forEach((photo) => {
    const userId = childToUserMap.get(photo.searching_child_id);
    if (userId) {
      const firstChildId = userChildMap.get(userId);
      // 最初の子どもの最初の写真のみを追加
      if (photo.searching_child_id === firstChildId && !photosMap.has(userId)) {
        photosMap.set(userId, [photo.photo_url]);
      }
    }
  });

  const expected = new Map([
    ['user1', ['https://example.com/photo1.jpg']],
    ['user2', ['https://example.com/photo4.jpg']],
  ]);

  let passed = true;
  for (const [userId, expectedPhotos] of expected.entries()) {
    const actualPhotos = photosMap.get(userId);
    if (JSON.stringify(actualPhotos) === JSON.stringify(expectedPhotos)) {
      console.log(`✓ ${userId}: ${actualPhotos[0]}（正しい）`);
    } else {
      console.log(`✗ ${userId}: 期待値=${JSON.stringify(expectedPhotos)}, 実際値=${JSON.stringify(actualPhotos)}`);
      passed = false;
    }
  }

  console.log(`\n結果: ${passed ? '合格' : '不合格'}\n`);
  return passed;
}

// すべてのテストを実行
function runAllTests() {
  console.log('マッチ一覧API最適化 - ロジック検証\n');
  console.log('==========================================\n');

  const results = [
    testPagination(),
    testUnreadCountAggregation(),
    testLastMessageExtraction(),
    testPhotoMapping(),
  ];

  console.log('==========================================\n');
  
  const allPassed = results.every(r => r);
  if (allPassed) {
    console.log('✓ すべてのテストが合格しました！\n');
    process.exit(0);
  } else {
    console.log('✗ 一部のテストが失敗しました。\n');
    process.exit(1);
  }
}

// テスト実行
runAllTests();
