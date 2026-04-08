"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage, Button, Separator, cn } from "@employee-tracker/shared";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/devices", label: "Devices" },
  { href: "/reports", label: "Reports" },
  { href: "/admin", label: "Admin" },
  { href: "/simulator", label: "Simulator" },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        <span className="text-sm font-semibold tracking-tight">EmployeeTracker Admin</span>
        <Separator orientation="vertical" className="h-5" />
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        {session?.user && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Avatar className="h-7 w-7">
                <AvatarImage src={(session.user as { image?: string }).image ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {(session.user.name ?? session.user.email ?? "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden items-center gap-1.5 sm:flex">
                <span>{session.user.name ?? session.user.email}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
                  Admin
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
