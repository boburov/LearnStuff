"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "@/public/logo.png";
import { Home, Users, ShieldCheck, Tag, UserCog, LogOut } from "lucide-react";
import useAuth from "../../hooks/useAuth";

const routes = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "Users", icon: Users, path: "/users" },
  { label: "Admins", icon: UserCog, path: "/admins" },
  { label: "Sources", icon: Tag, path: "/sources", superOnly: true },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth(false);

  return (
    <header className="p-5 border-r rounded-r-3xl w-72 min-h-screen border-gray-300 bg-[var(--main-color)] flex flex-col">
      <section className="flex items-center gap-2 mb-6">
        <Image
          src={logo}
          alt="LearnStuff Logo"
          className="w-10 h-10 rounded-sm"
        />
        <section>
          <h1 className="font-bold leading-3">LearnStuff</h1>
          <span className="leading-3 text-xs">
            {user?.username ?? "Admin"}
          </span>
        </section>
      </section>

      <nav className="flex flex-col gap-1 flex-1">
        {routes.map((route) => {
          if (route.superOnly && user?.role !== "SUPER_ADMIN") return null;
          const Icon = route.icon;
          const active = pathname.startsWith(route.path);
          return (
            <Link
              key={route.path}
              href={route.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                active ? "bg-blue-600 text-white" : "hover:bg-white/50"
              }`}
            >
              <Icon size={18} />
              <span>{route.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 pt-4 border-t border-gray-300">
        {user && (
          <div className="flex items-center gap-2 text-xs px-2 py-1 mb-2">
            <ShieldCheck size={14} />
            <span>{user.role}</span>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-red-100 text-red-700"
        >
          <LogOut size={18} />
          <span>Chiqish</span>
        </button>
      </div>
    </header>
  );
};

export default AppSidebar;
