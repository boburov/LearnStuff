"use client";

import { useEffect, useState } from "react";
import { getWebApp } from "./telegram";

type Stage =
  | "loading"
  | "login"
  | "register"
  | "forgot"
  | "reset"
  | "ready"
  | "error";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080"
)
  .trim()
  .replace(/\/$/, "");

interface CheckResponse {
  exists: boolean;
  tgId: string;
  suggestedUsername: string | null;
}

interface AuthResponse {
  accessToken: string;
  user: { id: number; tgId: string; role: string };
}

interface Source {
  id: number;
  label: string;
}

export default function AuthGate() {
  const [stage, setStage] = useState<Stage>("loading");
  const [initData, setInitData] = useState<string>("");
  const [suggestedUsername, setSuggestedUsername] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceId, setSourceId] = useState<string>("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);

  useEffect(() => {
    const wa = getWebApp();
    const devTgId = process.env.NEXT_PUBLIC_DEV_TG_ID;

    let effectiveInitData: string | null = null;
    let effectiveUsername: string | null = null;

    if (wa?.initData) {
      wa.ready();
      wa.expand();
      effectiveInitData = wa.initData;
      effectiveUsername = wa.initDataUnsafe?.user?.username ?? null;
    } else if (devTgId) {
      effectiveInitData = JSON.stringify({
        id: Number(devTgId),
        username: process.env.NEXT_PUBLIC_DEV_USERNAME ?? `dev_${devTgId}`,
      });
      effectiveUsername = process.env.NEXT_PUBLIC_DEV_USERNAME ?? null;
    } else {
      setStage("error");
      setError(
        "Telegram WebApp topilmadi. Bot orqali oching yoki NEXT_PUBLIC_DEV_TG_ID env'ni o'rnating.",
      );
      return;
    }

    setInitData(effectiveInitData);

    (async () => {
      const savedToken =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;

      if (savedToken) {
        try {
          const meRes = await fetch(`${API_BASE}/auth/me`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${savedToken}`,
            },
            body: JSON.stringify({ initData: effectiveInitData }),
          });
          if (meRes.ok) {
            const data: { user: AuthResponse["user"] } = await meRes.json();
            setUser(data.user);
            setStage("ready");
            return;
          }
          localStorage.removeItem("accessToken");
        } catch {
          localStorage.removeItem("accessToken");
        }
      }

      try {
        const [checkRes, sourcesRes] = await Promise.all([
          fetch(`${API_BASE}/auth/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: effectiveInitData }),
          }),
          fetch(`${API_BASE}/sources`).catch(() => null),
        ]);
        if (!checkRes.ok) throw new Error(await checkRes.text());
        const data: CheckResponse = await checkRes.json();
        const suggestion = data.suggestedUsername ?? effectiveUsername ?? "";
        setSuggestedUsername(suggestion);
        setUsername(suggestion);

        if (sourcesRes?.ok) {
          const list: Source[] = await sourcesRes.json();
          setSources(list);
        }

        setStage(data.exists ? "login" : "register");
      } catch (e) {
        setStage("error");
        setError(e instanceof Error ? e.message : "Tekshirishda xatolik");
      }
    })();
  }, []);

  async function call<T>(path: string, body: object): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try {
        msg = (JSON.parse(text) as { message?: string }).message ?? text;
      } catch {}
      throw new Error(msg || "So'rovda xatolik");
    }
    return res.json() as Promise<T>;
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const endpoint = stage === "register" ? "register" : "login";
      const body =
        stage === "register"
          ? {
              initData,
              username,
              password,
              sourceId: sourceId ? Number(sourceId) : undefined,
            }
          : { initData, password };
      const data = await call<AuthResponse>(`/auth/${endpoint}`, body);
      localStorage.setItem("accessToken", data.accessToken);
      setUser(data.user);
      setStage("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot() {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const data = await call<{ sent: boolean; ttlSeconds: number }>(
        "/auth/forgot-password",
        { initData },
      );
      setInfo(
        data.sent
          ? `Kod Telegramga yuborildi. ${data.ttlSeconds / 60} daqiqa amal qiladi.`
          : "Kod yaratildi, lekin Telegramga yuborilmadi (server BOT_TOKEN sozlanmagan).",
      );
      setStage("reset");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await call<AuthResponse>("/auth/reset-password", {
        initData,
        code,
        newPassword,
      });
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

  if (stage === "reset") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <form
          onSubmit={handleReset}
          className="w-full max-w-sm flex flex-col gap-4"
        >
          <h1 className="text-2xl font-semibold">Parolni tiklash</h1>
          {info && <p className="text-sm opacity-70">{info}</p>}

          <label className="flex flex-col gap-1 text-sm">
            <span>Telegramga kelgan kod (6 raqam)</span>
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="border rounded px-3 py-2 bg-transparent tracking-widest text-center"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span>Yangi parol</span>
            <input
              type="password"
              required
              minLength={6}
              maxLength={64}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border rounded px-3 py-2 bg-transparent"
            />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 text-white py-2 disabled:opacity-50"
          >
            {submitting ? "..." : "Parolni saqlash"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStage("login");
              setError(null);
              setInfo(null);
              setCode("");
              setNewPassword("");
            }}
            className="text-sm opacity-70 underline"
          >
            Bekor qilish
          </button>
        </form>
      </div>
    );
  }

  const isRegister = stage === "register";

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <form
        onSubmit={handleAuthSubmit}
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
          <>
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

            {sources.length > 0 && (
              <label className="flex flex-col gap-1 text-sm">
                <span>Qayerdan eshitdingiz?</span>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="border rounded px-3 py-2 bg-transparent"
                >
                  <option value="">— tanlang —</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
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

        {!isRegister && (
          <button
            type="button"
            onClick={handleForgot}
            disabled={submitting}
            className="text-sm opacity-70 underline disabled:opacity-30"
          >
            Parolimni unutdim
          </button>
        )}
      </form>
    </div>
  );
}
