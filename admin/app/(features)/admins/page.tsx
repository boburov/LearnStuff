"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api";
import useAuth from "../../hooks/useAuth";

type AdminRole = "PENDING" | "ADMIN" | "SUPER_ADMIN";

interface Admin {
  id: number;
  tgId: string;
  phone: string | null;
  name: string | null;
  role: AdminRole;
  createdAt: string;
}

export default function AdminsPage() {
  const { user: me } = useAuth(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [roleFilter, setRoleFilter] = useState<"" | AdminRole>("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (roleFilter) qs.set("role", roleFilter);
      const data = await api<Admin[]>(`/admin/admins?${qs.toString()}`);
      setAdmins(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function setRole(id: number, role: AdminRole) {
    if (!confirm(`Adminni ${role} qilamizmi?`)) return;
    try {
      await api(`/admin/admins/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Xatolik");
    }
  }

  async function remove(id: number) {
    if (!confirm("Adminni o'chiramizmi?")) return;
    try {
      await api(`/admin/admins/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Xatolik");
    }
  }

  const isSuper = me?.role === "SUPER_ADMIN";
  const pendingCount = admins.filter((a) => a.role === "PENDING").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Adminlar</h1>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
          ⏳ <strong>{pendingCount}</strong> ta tasdiqlashni kutayotgan ariza
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Name/phone/tgId qidirish"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "" | AdminRole)}
          className="border rounded px-3 py-2"
        >
          <option value="">Barchasi</option>
          <option value="PENDING">PENDING</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      </div>

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      {loading && <p className="text-gray-500 text-sm">Yuklanmoqda...</p>}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">tgId</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Created</th>
              {isSuper && <th className="px-3 py-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-3 py-2 font-medium">{a.name ?? "—"}</td>
                <td className="px-3 py-2">{a.phone ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{a.tgId}</td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      a.role === "SUPER_ADMIN"
                        ? "bg-purple-100 text-purple-700"
                        : a.role === "ADMIN"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {a.role}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {new Date(a.createdAt).toLocaleDateString()}
                </td>
                {isSuper && (
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {a.role === "PENDING" && (
                        <button
                          onClick={() => setRole(a.id, "ADMIN")}
                          disabled={!a.phone}
                          className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 disabled:opacity-50"
                          title={!a.phone ? "Telefon raqam ulanmagan" : ""}
                        >
                          Tasdiqlash
                        </button>
                      )}
                      {a.role === "ADMIN" && (
                        <button
                          onClick={() => setRole(a.id, "PENDING")}
                          className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700"
                        >
                          Pending qilish
                        </button>
                      )}
                      {a.role !== "SUPER_ADMIN" && (
                        <button
                          onClick={() => remove(a.id)}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700"
                        >
                          O&apos;chirish
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {admins.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={isSuper ? 6 : 5}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  Admin topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
