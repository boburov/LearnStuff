"use client";

import { useEffect, useState } from "react";
import { api } from "../../shared/api";
import useAuth from "../../hooks/useAuth";

interface Stats {
  totalUsers: number;
  totalAdmins: number;
  pendingAdmins: number;
  bySource: { sourceId: number | null; label: string; count: number }[];
  recentUsers: {
    id: number;
    username: string | null;
    tgId: string;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const { user } = useAuth(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;
    api<Stats>("/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, [user?.role]);

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Statistika faqat super admin uchun ko&apos;rinadi.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!stats && !error && <p className="text-gray-500">Yuklanmoqda...</p>}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Foydalanuvchilar" value={stats.totalUsers} />
          <Card title="Adminlar" value={stats.totalAdmins} />
          <Card
            title="Tasdiq kutayotgan"
            value={stats.pendingAdmins}
            highlight={stats.pendingAdmins > 0}
          />

          <div className="bg-white rounded-2xl shadow p-4 md:col-span-3">
            <h3 className="font-semibold mb-2">
              Manbalar bo&apos;yicha (Source)
            </h3>
            {stats.bySource.length === 0 ? (
              <p className="text-sm text-gray-500">
                Hali manba tanlanmagan.
              </p>
            ) : (
              <ul className="text-sm space-y-1">
                {stats.bySource.map((s) => (
                  <li
                    key={s.sourceId ?? "none"}
                    className="flex justify-between"
                  >
                    <span>{s.label}</span>
                    <span className="font-mono">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4 md:col-span-3">
            <h3 className="font-semibold mb-2">Oxirgi foydalanuvchilar</h3>
            <ul className="text-sm divide-y">
              {stats.recentUsers.map((u) => (
                <li key={u.id} className="flex justify-between py-2">
                  <div>
                    <div className="font-medium">
                      {u.username ?? `tg:${u.tgId}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  highlight,
}: {
  title: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl shadow p-4 ${
        highlight ? "bg-amber-50 ring-2 ring-amber-200" : "bg-white"
      }`}
    >
      <h3 className="text-sm text-gray-500">{title}</h3>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
