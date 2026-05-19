"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "../shared/api";

export interface AdminUser {
  id: number;
  username: string | null;
  phone: string | null;
  role: "ADMIN" | "SUPER_ADMIN";
}

const USER_KEY = "admin_user";

export function setAdminUser(user: AdminUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function useAuth(redirect = true) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const u = getAdminUser();
    if (!token || !u) {
      if (redirect) router.replace("/auth/login");
      setReady(true);
      return;
    }
    setUser(u);
    setReady(true);
  }, [redirect, router]);

  function logout() {
    clearToken();
    if (typeof window !== "undefined") localStorage.removeItem(USER_KEY);
    router.replace("/auth/login");
  }

  return { user, ready, logout };
}

export default useAuth;
