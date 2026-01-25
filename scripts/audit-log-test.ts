// 監査ログ出力テストスクリプト
// 必要に応じてAPIエンドポイントやテストユーザー情報を編集してください

// @ts-ignore
const fetch = require('node-fetch');


const BASE_URL = 'http://localhost:3000/api'; // Next.js devサーバー起動時のURL
// 認証が必要なAPI用のcookieやtokenをここにセット
const AUTH_HEADERS = {
  // 'Authorization': 'Bearer <your-access-token>',
  // 'Cookie': 'sb-access-token=...; sb-refresh-token=...'
};

async function testVerifyEmail() {
  // 仮のトークンでリクエスト（実際のテスト時は有効なトークンをセット）
  try {
    // 有効なトークンをセットしてください
    const res = await fetch(`${BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      body: JSON.stringify({ token: 'dummy-token' }),
    });
    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    console.log('verify-email:', res.status, body);
    if ('dummy-token' === 'dummy-token') {
      console.warn('※ダミートークンのままです。実際の有効なトークンで正常系もご確認ください。');
    }
  } catch (e) {
    console.error('verify-email fetch error:', e);
  }
}

async function testDeleteAccount() {
  // 認証済みセッションが必要な場合はcookie等をセット
  try {
    const res = await fetch(`${BASE_URL}/auth/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      // credentials: 'include' など必要に応じて
    });
    console.log('delete-account:', res.status, await res.json());
  } catch (e) {
    console.error('delete-account fetch error:', e);
  }
}

async function testForumPost() {
  try {
    // userIdは実際のユーザーIDでテストしてください
    const res = await fetch(`${BASE_URL}/forum/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      body: JSON.stringify({ userId: 'dummy', content: 'テスト投稿' }),
    });
    console.log('forum/posts:', res.status, await res.json());
    if ('dummy' === 'dummy') {
      console.warn('※userIdがダミーです。実際のユーザーIDで正常系もご確認ください。');
    }
  } catch (e) {
    console.error('forum/posts fetch error:', e);
  }
}

async function testMatchingCreate() {
  try {
    // targetUserIdは実際のユーザーIDでテストしてください
    const res = await fetch(`${BASE_URL}/matching/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      body: JSON.stringify({ targetUserId: 'dummy', similarityScore: 0.9 }),
    });
    console.log('matching/create:', res.status, await res.json());
    if ('dummy' === 'dummy') {
      console.warn('※targetUserIdがダミーです。実際のユーザーIDで正常系もご確認ください。');
    }
  } catch (e) {
    console.error('matching/create fetch error:', e);
  }
}

async function testMessageSend() {
  try {
    // /messages/1/send の "1"は実際のマッチIDでテストしてください
    const res = await fetch(`${BASE_URL}/messages/1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      body: JSON.stringify({ content: 'テストメッセージ' }),
    });
    console.log('messages/send:', res.status, await res.json());
    if ('1' === '1') {
      console.warn('※マッチIDがダミーです。実際のIDで正常系もご確認ください。');
    }
  } catch (e) {
    console.error('messages/send fetch error:', e);
  }
}

async function main() {
  await testVerifyEmail();
  await testDeleteAccount();
  await testForumPost();
  await testMatchingCreate();
  await testMessageSend();
  console.log('\n---\n※認証が必要なAPIはAUTH_HEADERSにcookieやtokenをセットしてください。\n※ダミー値のままだと正常系の監査ログは記録されません。\n');
  // Stripe webhook等は別途curl等で手動テストも可
}

main();
