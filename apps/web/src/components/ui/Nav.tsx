"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@employee-tracker/shared";

export function Nav() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-4 px-6">
        <Link href="/profile" className="text-sm font-semibold tracking-tight hover:opacity-80">
          EmployeeTracker
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {session?.user && (
            <>
              <Link href="/profile" className="flex items-center gap-2 text-sm hover:opacity-80">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={(session.user as { image?: string }).image ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {(session.user.name ?? session.user.email ?? "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block">{session.user.name ?? session.user.email}</span>
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Sign out
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
