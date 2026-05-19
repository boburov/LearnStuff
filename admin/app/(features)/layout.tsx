"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppSidebar from "../shared/components/AppSidebar";
import useAuth from "../hooks/useAuth";

export default function FeaturesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");
  const { ready } = useAuth(!isAuthRoute);

  if (isAuthRoute) return <>{children}</>;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
