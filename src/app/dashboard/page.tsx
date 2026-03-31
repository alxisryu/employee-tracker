"use client";

import { api } from "~/trpc/react";
import { Card, CardHeader, EmptyState } from "~/components/ui/Card";
import { Badge, OutcomeBadge } from "~/components/ui/Badge";
import { formatDateTime, timeAgo } from "~/lib/format";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = api.dashboard.stats.useQuery(
    undefined,
    { refetchInterval: 10_000 },
  );
  const { data: presence, isLoading: presenceLoading } =
    api.dashboard.currentPresence.useQuery(undefined, { refetchInterval: 10_000 });
  const { data: recentScans, isLoading: scansLoading } =
    api.scan.recent.useQuery({ limit: 20 }, { refetchInterval: 10_000 });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="In office now"
          value={statsLoading ? "…" : String(stats?.presentCount ?? 0)}
          accent="green"
        />
        <StatCard
          label="Active employees"
          value={statsLoading ? "…" : String(stats?.totalEmployees ?? 0)}
        />
        <StatCard
          label="Scans today"
          value={statsLoading ? "…" : String(stats?.todayScans ?? 0)}
        />
        <StatCard
          label="Unknown tags"
          value={statsLoading ? "…" : String(stats?.unknownScans ?? 0)}
          accent={stats && stats.unknownScans > 0 ? "yellow" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Current presence */}
        <Card>
          <CardHeader
            title="Currently in office"
            subtitle={`Last updated: ${formatDateTime(new Date())}`}
          />
          {presenceLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !presence?.length ? (
            <EmptyState message="Nobody in the office right now." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {presence.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{s.employee.name}</p>
                    <p className="text-xs text-gray-400">{s.employee.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="green">IN</Badge>
                    <p className="mt-0.5 text-xs text-gray-400">
                      since {timeAgo(s.statusChangedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent scans */}
        <Card>
          <CardHeader title="Recent scans" />
          {scansLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !recentScans?.length ? (
            <EmptyState message="No scan events yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Employee</th>
                    <th className="pb-2 pr-4">Tag</th>
                    <th className="pb-2 pr-4">Device</th>
                    <th className="pb-2">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentScans.map((event) => (
                    <tr key={event.id}>
                      <td className="py-1.5 pr-4 text-xs text-gray-500 whitespace-nowrap">
                        {timeAgo(event.scannedAt)}
                      </td>
                      <td className="py-1.5 pr-4">
                        {event.employee?.name ?? (
                          <span className="text-gray-400 italic">Unknown</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs">
                        {event.tagId}
                      </td>
                      <td className="py-1.5 pr-4 text-xs text-gray-500">
                        {event.device.name}
                      </td>
                      <td className="py-1.5">
                        <OutcomeBadge outcome={event.outcome} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "yellow";
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold ${
          accent === "green"
            ? "text-green-600"
            : accent === "yellow"
              ? "text-yellow-600"
              : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
