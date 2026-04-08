"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, EmptyState,
  Badge, OutcomeBadge, Button, timeAgo,
} from "@employee-tracker/shared";

const PRESENCE_PAGE_SIZE = 6;
const SCANS_PAGE_SIZE = 10;

export default function DashboardPage() {
  const utils = api.useUtils();
  const [presencePage, setPresencePage] = useState(1);
  const [scansPage, setScansPage] = useState(1);
  const { data: stats, isLoading: statsLoading } = api.dashboard.stats.useQuery(undefined, { refetchInterval: 10_000 });
  const { data: presence, isLoading: presenceLoading } = api.dashboard.currentPresence.useQuery(undefined, { refetchInterval: 10_000 });
  const { data: recentScans, isLoading: scansLoading } = api.scan.recent.useQuery({ limit: 100 }, { refetchInterval: 10_000 });

  const triggerReset = api.dashboard.triggerReset.useMutation({
    onSuccess: () => {
      void utils.dashboard.currentPresence.invalidate();
      void utils.dashboard.stats.invalidate();
    },
  });

  function handleAuditExport() {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/admin/audit-export`,
      "_blank",
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAuditExport}>
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={triggerReset.isPending}
            onClick={() => {
              if (confirm("Reset all employees to OUT? This simulates the nightly 2am reset.")) {
                triggerReset.mutate();
              }
            }}
          >
            {triggerReset.isPending ? "Resetting…" : "Reset attendance"}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="In office now" value={statsLoading ? "…" : String(stats?.presentCount ?? 0)} accent="green" />
        <StatCard label="Active employees" value={statsLoading ? "…" : String(stats?.totalEmployees ?? 0)} />
        <StatCard label="Scans today" value={statsLoading ? "…" : String(stats?.todayScans ?? 0)} />
        <StatCard
          label="Unknown tags"
          value={statsLoading ? "…" : String(stats?.unknownScans ?? 0)}
          accent={stats && stats.unknownScans > 0 ? "yellow" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Current presence */}
        <Card>
          <CardHeader>
            <CardTitle>Currently in office</CardTitle>
            <CardDescription>Auto-refreshes every 10s</CardDescription>
          </CardHeader>
          <CardContent>
            {presenceLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !presence?.length ? (
              <EmptyState message="Nobody in the office right now." />
            ) : (() => {
              const totalPages = Math.ceil(presence.length / PRESENCE_PAGE_SIZE);
              const safePage = Math.min(presencePage, totalPages);
              const paged = presence.slice((safePage - 1) * PRESENCE_PAGE_SIZE, safePage * PRESENCE_PAGE_SIZE);
              return (
                <div className="space-y-3">
                  <ul className="divide-y divide-border">
                    {paged.map((s) => (
                      <li key={s.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-medium">{s.employee.name}</p>
                          <p className="text-xs text-muted-foreground">{s.employee.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="green">IN</Badge>
                          <p className="mt-0.5 text-xs text-muted-foreground">since {timeAgo(s.statusChangedAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{(safePage - 1) * PRESENCE_PAGE_SIZE + 1}–{Math.min(safePage * PRESENCE_PAGE_SIZE, presence.length)} of {presence.length}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPresencePage(safePage - 1)}>←</Button>
                        <span className="px-2">{safePage} / {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPresencePage(safePage + 1)}>→</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Recent scans */}
        <Card>
          <CardHeader>
            <CardTitle>Recent scans</CardTitle>
          </CardHeader>
          <CardContent>
            {scansLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !recentScans?.length ? (
              <EmptyState message="No scan events yet." />
            ) : (() => {
              const totalPages = Math.ceil(recentScans.length / SCANS_PAGE_SIZE);
              const safePage = Math.min(scansPage, totalPages);
              const paged = recentScans.slice((safePage - 1) * SCANS_PAGE_SIZE, safePage * SCANS_PAGE_SIZE);
              return (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
                          <th className="pb-2 pr-4">Time</th>
                          <th className="pb-2 pr-4">Employee</th>
                          <th className="pb-2 pr-4">Tag</th>
                          <th className="pb-2 pr-4">Device</th>
                          <th className="pb-2">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paged.map((event) => (
                          <tr key={event.id}>
                            <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(event.scannedAt)}</td>
                            <td className="py-2 pr-4 whitespace-nowrap">{event.employee?.name ?? <span className="italic text-muted-foreground">Unknown</span>}</td>
                            <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{event.tagId}</td>
                            <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">{event.device.name}</td>
                            <td className="py-2 whitespace-nowrap"><OutcomeBadge outcome={event.outcome} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{(safePage - 1) * SCANS_PAGE_SIZE + 1}–{Math.min(safePage * SCANS_PAGE_SIZE, recentScans.length)} of {recentScans.length}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setScansPage(safePage - 1)}>←</Button>
                        <span className="px-2">{safePage} / {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setScansPage(safePage + 1)}>→</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: "green" | "yellow" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-3xl font-bold tracking-tight ${
          accent === "green" ? "text-green-600" : accent === "yellow" ? "text-yellow-600" : "text-foreground"
        }`}>{value}</p>
      </CardContent>
    </Card>
  );
}
