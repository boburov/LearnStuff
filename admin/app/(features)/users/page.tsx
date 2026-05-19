"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api";
import useAuth from "../../hooks/useAuth";

interface User {
  id: number;
  tgId: string;
  username: string | null;
  email: string | null;
  source: { id: number; label: string } | null;
  createdAt: string;
}

export default function UsersPage() {
  const { user: me } = useAuth(false);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      const data = await api<User[]>(`/admin/users?${qs.toString()}`);
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: number) {
    if (!confirm("Foydalanuvchini o'chiramizmi?")) return;
    try {
      await api(`/admin/users/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Xatolik");
    }
  }

  const isSuper = me?.role === "SUPER_ADMIN";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Foydalanuvchilar</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Username/email/tgId qidirish"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />
      </div>

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      {loading && <p className="text-gray-500 text-sm">Yuklanmoqda...</p>}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Created</th>
              {isSuper && <th className="px-3 py-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{u.username ?? "—"}</div>
                  <div className="text-xs text-gray-500">tg:{u.tgId}</div>
                </td>
                <td className="px-3 py-2">{u.email ?? "—"}</td>
                <td className="px-3 py-2">{u.source?.label ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                {isSuper && (
                  <td className="px-3 py-2">
                    <button
                      onClick={() => remove(u.id)}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700"
                    >
                      O&apos;chirish
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={isSuper ? 5 : 4}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  Foydalanuvchi topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
