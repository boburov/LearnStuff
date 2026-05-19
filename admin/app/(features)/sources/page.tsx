"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api";
import useAuth from "../../hooks/useAuth";

interface Source {
  id: number;
  label: string;
}

export default function SourcesPage() {
  const { user, ready } = useAuth(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<Source[]>("/sources");
      setSources(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    try {
      await api("/sources", {
        method: "POST",
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      setNewLabel("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    }
  }

  async function save(id: number) {
    try {
      await api(`/sources/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: editLabel }),
      });
      setEditingId(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    }
  }

  async function remove(id: number) {
    if (!confirm("Manbani o'chiramizmi?")) return;
    try {
      await api(`/sources/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    }
  }

  if (!ready) return null;
  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Sources</h1>
        <p className="text-sm text-gray-500">
          Faqat super admin manbalarni boshqara oladi.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Manbalar (Sources)</h1>
      <p className="text-sm text-gray-500 mb-4">
        Registratsiyada user&apos;ga ko&apos;rinadigan &quot;Qayerdan eshitdingiz?&quot;
        variantlari.
      </p>

      <form onSubmit={create} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Yangi manba (masalan: Instagram)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 text-white px-4 py-2"
        >
          Qo&apos;shish
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <ul className="bg-white rounded-2xl shadow divide-y">
        {sources.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between px-4 py-3"
          >
            {editingId === s.id ? (
              <>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="border rounded px-2 py-1 flex-1 mr-2"
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => save(s.id)}
                    className="text-xs px-3 py-1 rounded bg-green-100 text-green-700"
                  >
                    Saqlash
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs px-3 py-1 rounded bg-gray-100"
                  >
                    Bekor
                  </button>
                </div>
              </>
            ) : (
              <>
                <span>{s.label}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingId(s.id);
                      setEditLabel(s.label);
                    }}
                    className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700"
                  >
                    Tahrirlash
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="text-xs px-3 py-1 rounded bg-red-100 text-red-700"
                  >
                    O&apos;chirish
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {sources.length === 0 && (
          <li className="px-4 py-6 text-center text-gray-500 text-sm">
            Hozircha manbalar yo&apos;q
          </li>
        )}
      </ul>
    </div>
  );
}
