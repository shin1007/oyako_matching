"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ProfileInfo {
  full_name?: string;
  birth_date?: string;
  searching_child_birth_date?: string | null;
}

type UserRole = "parent" | "child";

interface TimeCapsule {
  id: string;
  parent_id: string;
  child_birth_date: string;
  message: string;
  unlock_date: string;
  created_at: string;
  opened_at: string | null;
  child_info?: {
    name_kanji?: string;
    name_hiragana?: string;
  };
}

interface ChildOption {
  id: string;
  full_name?: string;
  birth_date: string | null;
}

export default function TimeCapsulesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [unlockDate, setUnlockDate] = useState(today);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [capsuleToDelete, setCapsuleToDelete] = useState<TimeCapsule | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const [{ data: userRow, error: userError }, { data: profileRow, error: profileError }] =
        await Promise.all([
          supabase.from("users").select("role").eq("id", user.id).single(),
          supabase.from("profiles").select("last_name_kanji, first_name_kanji, birth_date, searching_child_birth_date").eq("user_id", user.id).single(),
      if (profileError) throw profileError;

      const userRole = userRow?.role as UserRole;
      setRole(userRole);
      setProfile(profileRow || null);

      if (userRole === "parent") {
        const { data: childrenData, error: childrenError } = await supabase
          .from("searching_children")
          .select("id, birth_date, name_kanji, name_hiragana")
          .eq("user_id", user.id)
          .order("display_order", { ascending: true });
        if (childrenError) throw childrenError;

        const options: ChildOption[] = (childrenData || [])
          .map((child) => ({
            id: child.id,
            full_name: child.name_kanji || child.name_hiragana || "お子さま",
            birth_date: child.birth_date,
          }));

        setChildren(options);
        const firstWithBirthDate = options.find((child) => child.birth_date);
        setSelectedChildId(firstWithBirthDate?.id ?? options[0]?.id ?? "");

        const { data, error } = await supabase
          .from("time_capsules")
          .select("*")
          .eq("parent_id", user.id)
          .order("unlock_date", { ascending: true });
        if (error) throw error;
        
        // 子どもの情報を取得して結合
        const capsulesWithChildren = await Promise.all((data || []).map(async (capsule) => {
          const { data: childData } = await supabase
            .from("searching_children")
            .select("name_kanji, name_hiragana")
            .eq("user_id", user.id)
            .eq("birth_date", capsule.child_birth_date)
            .single();
          
          return {
            ...capsule,
            child_info: childData || undefined
          };
        }));
        
        setCapsules(capsulesWithChildren);
      } else {
        if (!profileRow?.birth_date) {
          setError("お子さまの生年月日がプロフィールに登録されていません。");
          setCapsules([]);
        } else {
          const { data, error } = await supabase
            .from("time_capsules")
            .select("*")
            .eq("child_birth_date", profileRow.birth_date)
            .order("unlock_date", { ascending: true });
          if (error) throw error;
          
          // 子どもの情報を取得して結合
          const capsulesWithChildren = await Promise.all((data || []).map(async (capsule) => {
            const { data: childData } = await supabase
              .from("searching_children")
              .select("name_kanji, name_hiragana")
              .eq("user_id", capsule.parent_id)
              .eq("birth_date", capsule.child_birth_date)
              .single();
            
            return {
              ...capsule,
              child_info: childData || undefined
            };
          }));
          
          setCapsules(capsulesWithChildren);
        }
      }
    } catch (err: any) {
      setError(err.message || "データの取得中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (capsule: TimeCapsule) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const unlock = new Date(capsule.unlock_date);

    if (capsule.opened_at) {
      return { label: "開封済み", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (unlock.getTime() <= today.getTime()) {
      return { label: "受け取れます", tone: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    return { label: "開封待ち", tone: "bg-amber-50 text-amber-700 border-amber-200" };
  };

  const daysUntilUnlock = useMemo(() => {
    return (capsule: TimeCapsule) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const unlock = new Date(capsule.unlock_date);
      const diff = Math.ceil((unlock.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff;
    };
  }, []);

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateAge = (birthDate: string, referenceDate: string) => {
    const birth = new Date(birthDate);
    const reference = new Date(referenceDate);
    let age = reference.getFullYear() - birth.getFullYear();
    const monthDiff = reference.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const selectedChild = children.find((child) => child.id === selectedChildId);

  const handleDeleteClick = (capsule: TimeCapsule) => {
    setCapsuleToDelete(capsule);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!capsuleToDelete) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");

      console.log("Deleting capsule:", capsuleToDelete.id, "for user:", user.id);

      const { error, data } = await supabase
        .from("time_capsules")
        .delete()
        .eq("id", capsuleToDelete.id)
        .eq("parent_id", user.id)
        .select();

      console.log("Delete result:", { error, data });

      if (error) throw error;

      setSuccess("タイムカプセルを削除しました");
      setDeleteModalOpen(false);
      setCapsuleToDelete(null);
      await bootstrap();
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "タイムカプセルの削除に失敗しました");
      setDeleteModalOpen(false);
      setCapsuleToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setCapsuleToDelete(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");
      if (role !== "parent") throw new Error("親アカウントのみ作成できます");

      if (!selectedChild) {
        throw new Error("登録済みのお子さまを選択してください");
      }

      if (!selectedChild.birth_date) {
        throw new Error("選択したお子さまの生年月日をプロフィールで入力してください");
      }

      if (!unlockDate || !message.trim()) {
        throw new Error("すべての項目を入力してください");
      }

      const unlock = new Date(unlockDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (unlock.getTime() < today.getTime()) {
        throw new Error("開封予定日は今日以降の日付を選んでください");
      }

      const { error } = await supabase.from("time_capsules").insert({
        parent_id: user.id,
        child_birth_date: selectedChild.birth_date,
        message,
        unlock_date: unlockDate,
      });

      if (error) throw error;

      setMessage("");
      setUnlockDate("");
      setSuccess("タイムカプセルを保存しました");
      await bootstrap();
    } catch (err: any) {
      setError(err.message || "タイムカプセルの作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-sky-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-sky-700">Time Capsule</p>
                <h1 className="mt-1 text-3xl font-bold text-gray-900">未来のわたしたちへ</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  成長の節目に届けたい言葉や写真の代わりに、メッセージを預けましょう。開封日を決めておくと、その日まで中身は大切にロックされます。
                </p>
              </div>
              <div className="rounded-xl bg-sky-900 px-5 py-4 text-white shadow-md">
                <p className="text-sm text-sky-100">今日の記念日</p>
                <p className="text-2xl font-semibold">
                  {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}
                </p>
                <p className="text-sm text-sky-100">小さな記録が、大きな思い出になる</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-sky-900 p-6 text-white shadow-sm">
            <p className="text-sm font-semibold text-sky-100">おすすめの残し方</p>
            <ul className="mt-3 space-y-2 text-sm text-sky-50">
              <li>・ お子さまが自分で読める言葉と、親からのメッセージをセットに</li>
              <li>・ 「開封日」には思い出の写真や動画を一緒に見返す計画も</li>
              <li>・ 年齢ごとにメッセージを分けると、節目がより伝わりやすく</li>
            </ul>
            {profile?.last_name_kanji && (
              <p className="mt-4 text-xs text-sky-100">登録名: {profile.last_name_kanji}{profile.first_name_kanji}</p>
            )}
            {profile?.birth_date && (
              <p className="text-xs text-sky-100">誕生日: {formatDate(profile.birth_date)}</p>
            )}
          </div>
        </div>

        {(error || success) && (
          <div className="mt-6 space-y-3">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
          </div>
        )}

        {role === "parent" && (
          <section className="mt-8 rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-emerald-100">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">新しいタイムカプセル</h2>
                <p className="text-sm text-gray-600">登録済みのお子さまから選び、届けたい日付を決めてメッセージを残します。</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold text-emerald-700">
                親アカウント専用
              </span>
            </div>

            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="childSelect">
                  お子さまを選択
                </label>
                <select
                  id="childSelect"
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  disabled={children.length === 0}
                >
                  <option value="" disabled>
                    {children.length === 0 ? "登録済みのお子さまがいません" : "選択してください"}
                  </option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id} disabled={!child.birth_date}>
                      {child.full_name || "お子さま"}
                      {child.birth_date ? ` / ${formatDate(child.birth_date)}` : "（生年月日未登録）"}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">受け取り側のお子さまを選択してください。生年月日は自動で連携されます。</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="unlockDate">
                  開封予定日
                </label>
                <input
                  id="unlockDate"
                  type="date"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  min={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-gray-500">誕生日や入学式など、節目の日付をセットできます。</p>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="message">
                  メッセージ
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="未来の自分やお子さまへの手紙、当時の気持ち、伝えたいエピソードなどを自由に書き残せます。"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">保存後も開封日までメッセージは非公開のまま保管されます。</p>
                <button
                  type="submit"
                  disabled={submitting || !selectedChild || !selectedChild.birth_date}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? "保存中..." : "タイムカプセルを保存"}
                </button>
              </div>
            </form>
            {children.length === 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                プロフィールでお子さま情報（生年月日必須）を登録すると、ここから選択できるようになります。
              </div>
            )}
          </section>
        )}

        <section className="mt-8 rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">タイムカプセル一覧</h2>
              <p className="text-sm text-gray-600">
                {role === "parent"
                  ? "作成したカプセルの状態と開封予定日を確認できます。"
                  : "解禁済みのメッセージが届きます。"}
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {capsules.length} 件
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-600">読み込み中...</div>
          ) : capsules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <div className="text-5xl">📮</div>
              <h3 className="mt-3 text-lg font-semibold text-gray-900">まだタイムカプセルがありません</h3>
              <p className="mt-2 max-w-xl text-sm text-gray-600">
                {role === "parent"
                  ? "プロフィールで登録したお子さまを選んで、節目の日付とメッセージを残せます。"
                  : "解禁日になると、ここにメッセージが届きます。"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {capsules.map((capsule) => {
                const status = statusLabel(capsule);
                const diff = daysUntilUnlock(capsule);
                const unlockReady = new Date(capsule.unlock_date) <= new Date();

                return (
                  <div key={capsule.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wide text-gray-500">開封予定日</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-gray-900">{formatDate(capsule.unlock_date)}</p>
                          {capsule.child_info && (
                            <span className="text-base text-gray-600">
                              ・ {capsule.child_info.name_kanji || capsule.child_info.name_hiragana || "お子さま"}
                              ({calculateAge(capsule.child_birth_date, capsule.created_at)}歳)
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">作成日: {formatDate(capsule.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.tone}`}>
                          {status.label}
                        </span>
                        {role === "parent" && (
                          <button
                            onClick={() => handleDeleteClick(capsule)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="削除"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
                      <p className="text-sm text-gray-600">メッセージ</p>
                      <p className="mt-2 whitespace-pre-wrap text-gray-900">{capsule.message}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-xs text-gray-600">
                      {!capsule.opened_at && !unlockReady && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                          開封まであと {diff} 日
                        </span>
                      )}
                      {capsule.opened_at && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                          {formatDate(capsule.opened_at)} に開封
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* 削除確認モーダル */}
      {deleteModalOpen && capsuleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">タイムカプセルの削除</h3>
            <p className="mt-2 text-sm text-gray-600">
              このタイムカプセルを削除してもよろしいですか？この操作は取り消せません。
            </p>
            
            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500">開封予定日</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(capsuleToDelete.unlock_date)}</p>
              {capsuleToDelete.child_info && (
                <p className="mt-1 text-sm text-gray-600">
                  {capsuleToDelete.child_info.name_kanji || capsuleToDelete.child_info.name_hiragana || "お子さま"}
                  ({calculateAge(capsuleToDelete.child_birth_date, capsuleToDelete.created_at)}歳)
                </p>
              )}
              <p className="mt-2 text-xs text-gray-700 line-clamp-2">{capsuleToDelete.message}</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
