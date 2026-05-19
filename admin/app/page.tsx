"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "./shared/api";
import { getAdminUser } from "./hooks/useAuth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const user = getAdminUser();
    router.replace(token && user ? "/dashboard" : "/auth/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-500">Yo&apos;naltirilmoqda...</p>
    </div>
  );
}
