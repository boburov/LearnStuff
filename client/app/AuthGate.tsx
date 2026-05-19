"use client";

import { useEffect, useState } from "react";
import { getWebApp } from "./telegram";

type Stage = "loading" | "login" | "register" | "ready" | "error";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

interface CheckResponse {
  exists: boolean;
  tgId: string;
  suggestedUsername: string | null;
}

interface AuthResponse {
  accessToken: string;
  user: { id: number; tgId: string; role: string };
}

export default function AuthGate() {
  const [stage, setStage] = useState<Stage>("loading");
  const [initData, setInitData] = useState<string>("");
  const [suggestedUsername, setSuggestedUsername] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);

  useEffect(() => {
    const wa = getWebApp();
    if (!wa) {
      setStage("error");
      setError("Telegram WebApp orqali oching.");
      return;
    }
    wa.ready();
    wa.expand();

    if (!wa.initData) {
      setStage("error");
      setError("initData topilmadi. Botdan webappni oching.");
      return;
    }

    setInitData(wa.initData);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: wa.initData }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: CheckResponse = await res.json();
        setSuggestedUsername(data.suggestedUsername ?? "");
        setUsername(data.suggestedUsername ?? "");
        setStage(data.exists ? "login" : "register");
      } catch (e) {
        setStage("error");
        setError(e instanceof Error ? e.message : "Tekshirishda xatolik");
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const endpoint = stage === "register" ? "register" : "login";
      const body =
        stage === "register"
          ? { initData, username, password }
          : { initData, password };
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "So'rovda xatolik");
      }
      const data: AuthResponse = await res.json();
      localStorage.setItem("accessToken", data.accessToken);
      setUser(data.user);
      setStage("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm opacity-70">Yuklanmoqda...</p>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (stage === "ready" && user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-2">
        <h1 className="text-xl font-semibold">Xush kelibsiz!</h1>
        <p className="text-sm opacity-70">tgId: {user.tgId}</p>
        <p className="text-sm opacity-70">role: {user.role}</p>
      </div>
    );
  }

  const isRegister = stage === "register";

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold">
          {isRegister ? "Ro'yxatdan o'tish" : "Kirish"}
        </h1>
        <p className="text-sm opacity-70">
          {isRegister
            ? "Hisob yaratish uchun username va parol kiriting."
            : "Telegram hisobingiz topildi. Parolingizni kiriting."}
        </p>

        {isRegister && (
          <label className="flex flex-col gap-1 text-sm">
            <span>Username</span>
            <input
              type="text"
              required
              minLength={3}
              maxLength={32}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={suggestedUsername || "username"}
              className="border rounded px-3 py-2 bg-transparent"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span>Parol</span>
          <input
            type="password"
            required
            minLength={6}
            maxLength={64}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded px-3 py-2 bg-transparent"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 text-white py-2 disabled:opacity-50"
        >
          {submitting
            ? "..."
            : isRegister
              ? "Ro'yxatdan o'tish"
              : "Kirish"}
        </button>
      </form>
    </div>
  );
}
