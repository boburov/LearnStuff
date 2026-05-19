"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "../../../shared/api";
import { setAdminUser, AdminUser } from "../../../hooks/useAuth";

type Step = "phone" | "code";

interface RequestOtpRes {
  sent: boolean;
  ttlSeconds: number;
}

interface VerifyOtpRes {
  accessToken: string;
  user: AdminUser;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await api<RequestOtpRes>("/admin-auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setInfo(
        res.sent
          ? `Kod Telegramga yuborildi. ${res.ttlSeconds / 60} daqiqa amal qiladi.`
          : "Kod yaratildi, lekin Telegramga yuborilmadi (server BOT_TOKEN sozlanmagan).",
      );
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<VerifyOtpRes>("/admin-auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      });
      setToken(res.accessToken);
      setAdminUser(res.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold mb-1">Admin panel</h1>
        <p className="text-sm text-gray-500 mb-6">
          {step === "phone"
            ? "Telefon raqamingizni kiriting, Telegramga kod yuboramiz."
            : "Telegramga kelgan 6 xonali kodni kiriting."}
        </p>

        {step === "phone" ? (
          <form onSubmit={requestOtp} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>Telefon raqam</span>
              <input
                type="tel"
                required
                pattern="\+?\d{7,15}"
                placeholder="+998901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="rounded bg-blue-600 text-white py-2 disabled:opacity-50"
            >
              {busy ? "..." : "Kod yuborish"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-3">
            {info && <p className="text-sm text-gray-600">{info}</p>}

            <label className="flex flex-col gap-1 text-sm">
              <span>Kod (6 raqam)</span>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="border rounded px-3 py-2 tracking-widest text-center"
              />
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="rounded bg-blue-600 text-white py-2 disabled:opacity-50"
            >
              {busy ? "..." : "Kirish"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
                setInfo(null);
              }}
              className="text-sm text-gray-500 underline"
            >
              Telefon raqamni o&apos;zgartirish
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
