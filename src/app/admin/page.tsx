"use client";

import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, EmptyState } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

export default function AdminPage() {
  const { data: session } = useSession();
  const utils = api.useUtils();

  const { data: users, isLoading } = api.user.list.useQuery();

  const setRole = api.user.setRole.useMutation({
    onSuccess: () => void utils.user.list.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-6">
        <h1 className="text-2xl font-bold tracking-tight">Admin Management</h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const admins = users?.filter((u) => u.role === "ADMIN") ?? [];
  const employees = users?.filter((u) => u.role === "EMPLOYEE") ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has admin access. Role changes take effect after the user's next sign-in.
        </p>
      </div>

      {setRole.error && (
        <p role="alert" className="text-sm text-destructive">
          {setRole.error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admins</CardTitle>
          <CardDescription>Full access to all pages and data.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {admins.length === 0 ? (
            <EmptyState message="No admins found." />
          ) : (
            <ul className="divide-y divide-border" role="list">
              {admins.map((user) => (
                <li key={user.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">{user.name ?? "—"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="gray">Admin</Badge>
                    {user.id !== session?.user.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={setRole.isPending}
                        onClick={() => setRole.mutate({ userId: user.id, role: "EMPLOYEE" })}
                      >
                        Remove admin
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employees</CardTitle>
          <CardDescription>Standard access — can only view their own profile.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {employees.length === 0 ? (
            <EmptyState message="No employees found." />
          ) : (
            <ul className="divide-y divide-border" role="list">
              {employees.map((user) => (
                <li key={user.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                        {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">{user.name ?? "—"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={setRole.isPending}
                    onClick={() => setRole.mutate({ userId: user.id, role: "ADMIN" })}
                  >
                    Make admin
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
