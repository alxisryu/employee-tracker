"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

const ALL_LINKS = [
  { href: "/dashboard", label: "Dashboard", adminOnly: true },
  { href: "/employees", label: "Employees", adminOnly: true },
  { href: "/devices", label: "Devices", adminOnly: true },
  { href: "/simulator", label: "Simulator", adminOnly: true },
  { href: "/profile", label: "My Profile", adminOnly: false },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";

  const links = ALL_LINKS.filter((l) => isAdmin || !l.adminOnly);

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-800">EmployeeTracker</span>
          <div className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-brand-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {session?.user && (
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
            >
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700">
                  {(session.user.name ?? session.user.email)[0]?.toUpperCase()}
                </span>
              )}
              <span className="hidden sm:block">{session.user.name ?? session.user.email}</span>
              {isAdmin && (
                <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                  Admin
                </span>
              )}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
