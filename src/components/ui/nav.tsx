"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";

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
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        <span className="text-sm font-semibold tracking-tight">
          EmployeeTracker
        </span>

        <Separator orientation="vertical" className="h-5" />

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {session?.user && (
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground hover:bg-muted"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage
                  src={session.user.image ?? undefined}
                  alt={session.user.name ?? ""}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {(session.user.name ?? session.user.email ?? "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block">
                {session.user.name ?? session.user.email}
              </span>
              {isAdmin && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Admin
                </span>
              )}
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
