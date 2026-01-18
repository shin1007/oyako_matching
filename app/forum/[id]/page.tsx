'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  content: string;
  author_profile: {
    forum_display_name: string;
    profile_image_url?: string;
  };
  category: {
    id: string;
    name: string;
    icon: string;
  } | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  author_id: string;
}

interface Comment {
  id: string;
  content: string;
  author_profile: {
    forum_display_name: string;
  };
  created_at: string;
  updated_at: string;
  author_id: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isParent, setIsParent] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostTitle, setEditPostTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [showDeletePostDialog, setShowDeletePostDialog] = useState(false);
  const [showDeleteCommentDialog, setShowDeleteCommentDialog] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    if (params.id) {
      loadPost();
    }
  }, [params.id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setCurrentUserId(user.id);

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    setIsParent(userData?.role === 'parent');
  };

  const loadPost = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/forum/posts/${params.id}`);
      if (!response.ok) throw new Error('Failed to load post');
      
      const data = await response.json();
      setPost(data.post);
      setComments(data.comments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/forum/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: params.id,
          content: newComment,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'コメントの投稿に失敗しました');
      }

      const data = await response.json();
      setComments([...comments, data.comment]);
      setNewComment('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = () => {
    if (!post) return;
    setEditingPostId(post.id);
    setEditPostTitle(post.title);
    setEditPostContent(post.content);
  };

  const handleCancelEditPost = () => {
    setEditingPostId(null);
    setEditPostTitle('');
    setEditPostContent('');
    setError('');
  };

  const handleSavePost = async () => {
    if (!post || !editPostTitle.trim() || !editPostContent.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/forum/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editPostTitle,
          content: editPostContent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '投稿の更新に失敗しました');
      }

      const data = await response.json();
      setPost(data.post);
      setEditingPostId(null);
      setEditPostTitle('');
      setEditPostContent('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/forum/posts/${post.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '投稿の削除に失敗しました');
      }

      router.push('/forum');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentContent('');
    setError('');
  };

  const handleSaveComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/forum/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editCommentContent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'コメントの更新に失敗しました');
      }

      const data = await response.json();
      setComments(comments.map(c => c.id === commentId ? data.comment : c));
      setEditingCommentId(null);
      setEditCommentContent('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/forum/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'コメントの削除に失敗しました');
      }

      setComments(comments.filter(c => c.id !== commentId));
      setShowDeleteCommentDialog(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="mb-4 text-gray-600">投稿が見つかりません</p>
          <Link href="/forum" className="text-blue-600 hover:underline">
            掲示板に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* Post */}
        <div className="mb-8 rounded-lg bg-white p-8 shadow">
          {editingPostId === post.id ? (
            /* Edit Post Form */
            <div>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">投稿を編集</h2>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  タイトル
                </label>
                <input
                  type="text"
                  value={editPostTitle}
                  onChange={(e) => setEditPostTitle(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  内容
                </label>
                <textarea
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                  rows={10}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSavePost}
                  disabled={submitting || !editPostTitle.trim() || !editPostContent.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={handleCancelEditPost}
                  disabled={submitting}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            /* Display Post */
            <>
              <div className="mb-4 flex items-center gap-2">
                {post.is_pinned && (
                  <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                    📌 ピン留め
                  </span>
                )}
                {post.category && (
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    {post.category.icon} {post.category.name}
                  </span>
                )}
              </div>

              <h1 className="mb-4 text-3xl font-bold text-gray-900">{post.title}</h1>

              <div className="mb-6 flex items-center gap-4 text-sm text-gray-500">
                <span>👤 {post.author_profile.forum_display_name}</span>
                <span>👁️ {post.view_count}回閲覧</span>
                <span>🕒 {formatDate(post.created_at)}</span>
                {post.updated_at !== post.created_at && (
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    編集済み
                  </span>
                )}
              </div>

              <div className="prose max-w-none whitespace-pre-wrap text-gray-700 mb-6">
                {post.content}
              </div>

              {/* Edit/Delete Buttons - Only for post author */}
              {currentUserId === post.author_id && (
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleEditPost}
                    className="rounded-lg bg-blue-100 px-4 py-2 text-sm text-blue-700 hover:bg-blue-200"
                  >
                    ✏️ 編集
                  </button>
                  <button
                    onClick={() => setShowDeletePostDialog(true)}
                    className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700 hover:bg-red-200"
                  >
                    🗑️ 削除
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Post Confirmation Dialog */}
        {showDeletePostDialog && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="delete-post-dialog-title"
            aria-describedby="delete-post-dialog-description"
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !submitting) {
                setShowDeletePostDialog(false);
              }
            }}
            onClick={() => !submitting && setShowDeletePostDialog(false)}
          >
            <div 
              className="rounded-lg bg-white p-6 shadow-2xl max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="delete-post-dialog-title" className="mb-4 text-lg font-bold text-red-600">⚠️ 投稿を削除しますか？</h3>
              
              {/* Preview of post to be deleted */}
              {post && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600 mb-1">削除する投稿:</p>
                  <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{post.title}</h4>
                  <p className="text-sm text-gray-700 line-clamp-3">{post.content}</p>
                </div>
              )}
              
              <p id="delete-post-dialog-description" className="mb-4 text-sm text-gray-600">
                この操作は取り消せません。投稿とすべてのコメント（{comments.length}件）が削除されます。
              </p>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDeletePostDialog(false)}
                  disabled={submitting}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeletePost}
                  disabled={submitting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="rounded-lg bg-white p-8 shadow">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            コメント ({comments.length})
          </h2>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Comment Form */}
          {isParent ? (
            <form onSubmit={handleSubmitComment} className="mb-8">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="コメントを入力..."
                rows={4}
                className="mb-4 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'コメント中...' : 'コメントする'}
              </button>
            </form>
          ) : (
            <div className="mb-8 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm text-yellow-800">
                コメントの投稿は親アカウントのみが可能です
              </p>
            </div>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-center text-gray-500">まだコメントがありません</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-l-4 border-blue-200 bg-gray-50 p-4">
                  {editingCommentId === comment.id ? (
                    /* Edit Comment Form */
                    <div>
                      <textarea
                        value={editCommentContent}
                        onChange={(e) => setEditCommentContent(e.target.value)}
                        rows={4}
                        className="mb-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveComment(comment.id)}
                          disabled={submitting || !editCommentContent.trim()}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {submitting ? '保存中...' : '保存'}
                        </button>
                        <button
                          onClick={handleCancelEditComment}
                          disabled={submitting}
                          className="rounded-lg bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Comment */
                    <>
                      <div className="mb-2 flex items-center gap-4 text-sm text-gray-500">
                        <span className="font-semibold text-gray-700">
                          {comment.author_profile.forum_display_name}
                        </span>
                        <span>🕒 {formatDate(comment.created_at)}</span>
                        {comment.updated_at !== comment.created_at && (
                          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                            編集済み
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-gray-700 mb-2">{comment.content}</p>
                      
                      {/* Edit/Delete Buttons - Only for comment author */}
                      {currentUserId === comment.author_id && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEditComment(comment)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            ✏️ 編集
                          </button>
                          <button
                            onClick={() => setShowDeleteCommentDialog(comment.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            🗑️ 削除
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Delete Comment Confirmation Dialog */}
                  {showDeleteCommentDialog === comment.id && (
                    <div 
                      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md" 
                      role="dialog" 
                      aria-modal="true" 
                      aria-labelledby="delete-comment-dialog-title"
                      aria-describedby="delete-comment-dialog-description"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' && !submitting) {
                          setShowDeleteCommentDialog(null);
                        }
                      }}
                      onClick={() => !submitting && setShowDeleteCommentDialog(null)}
                    >
                      <div 
                        className="rounded-lg bg-white p-6 shadow-2xl max-w-md mx-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h3 id="delete-comment-dialog-title" className="mb-4 text-lg font-bold text-red-600">⚠️ コメントを削除しますか？</h3>
                        
                        {/* Preview of comment to be deleted */}
                        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="text-sm text-gray-600 mb-1">削除するコメント:</p>
                          <p className="text-sm text-gray-700 line-clamp-4">{comment.content}</p>
                        </div>
                        
                        <p id="delete-comment-dialog-description" className="mb-4 text-sm text-gray-600">
                          この操作は取り消せません。
                        </p>
                        {error && (
                          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                            {error}
                          </div>
                        )}
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setShowDeleteCommentDialog(null)}
                            disabled={submitting}
                            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={submitting}
                            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {submitting ? '削除中...' : '削除'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
