"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardHeader, EmptyState } from "~/components/ui/Card";
import { OutcomeBadge } from "~/components/ui/Badge";
import { timeAgo } from "~/lib/format";
import type { ScanOutcome } from "@prisma/client";

interface SimResult {
  outcome: ScanOutcome;
  message: string;
  scanEventId: string;
  employeeName?: string;
  timestamp: Date;
}

export default function SimulatorPage() {
  const utils = api.useUtils();
  const { data: devices } = api.device.list.useQuery();
  const { data: employees } = api.employee.list.useQuery();
  const { data: recentScans } = api.scan.recent.useQuery(
    { limit: 10 },
    { refetchInterval: 5_000 },
  );
  const { data: unknownTags } = api.scan.unknownTags.useQuery();

  const [tagId, setTagId] = useState("");
  const [deviceId, setDeviceId] = useState("manual_ui");
  const [results, setResults] = useState<SimResult[]>([]);

  const ingest = api.scan.ingestManual.useMutation({
    onSuccess: (data) => {
      setResults((prev) => [
        {
          outcome: data.outcome,
          message: data.message,
          scanEventId: data.scanEventId,
          employeeName: data.employeeName,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
      setTagId("");
      void utils.dashboard.currentPresence.invalidate();
      void utils.scan.recent.invalidate();
      void utils.scan.unknownTags.invalidate();
      void utils.dashboard.stats.invalidate();
    },
  });

  const assignTag = api.tag.assignToEmployee.useMutation({
    onSuccess: () => {
      void utils.scan.unknownTags.invalidate();
      void utils.employee.list.invalidate();
    },
  });

  const activeDevices = devices?.filter((d) => d.isActive) ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tagId.trim()) return;
    ingest.mutate({ tagId: tagId.trim(), deviceId });
  }

  // Quick-scan buttons for seeded tags.
  const quickTags = employees
    ?.flatMap((e) => e.tags.map((t) => ({ ...t, employeeName: e.name })))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scan Simulator</h1>
        <p className="mt-1 text-sm text-gray-500">
          Submit fake scan events to test the attendance system without hardware.
          This is the same ingestion path that a real NFC reader would use.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scan form */}
        <Card>
          <CardHeader title="Submit a scan" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Tag ID
              </label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none"
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
                placeholder="e.g. TAG_ALEXIS_001"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Device
              </label>
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              >
                {activeDevices.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.type})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={ingest.isPending}
              className="w-full rounded bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {ingest.isPending ? "Submitting…" : "Submit scan"}
            </button>
            {ingest.isError && (
              <p className="text-xs text-red-600">
                Error: {ingest.error.message}
              </p>
            )}
          </form>

          {/* Quick-scan buttons */}
          {quickTags && quickTags.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                Quick scan
              </p>
              <div className="flex flex-wrap gap-2">
                {quickTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setTagId(tag.tagId);
                    }}
                    className="rounded border border-gray-200 bg-gray-50 px-3 py-1 text-xs hover:bg-gray-100"
                  >
                    {tag.employeeName}
                  </button>
                ))}
                {/* Unknown tag button */}
                <button
                  onClick={() => setTagId("TAG_UNKNOWN_X")}
                  className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
                >
                  Unknown tag
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Local result log */}
        <Card>
          <CardHeader title="Simulation results" subtitle="This session only" />
          {results.length === 0 ? (
            <EmptyState message="No scans submitted yet. Try the form on the left." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((r, i) => (
                <li key={i} className="py-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <OutcomeBadge outcome={r.outcome} />
                      <p className="mt-1 text-sm text-gray-700">{r.message}</p>
                      <p className="text-xs text-gray-400">
                        Event ID: {r.scanEventId.slice(0, 8)}…
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {timeAgo(r.timestamp)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent scans from DB */}
      <Card>
        <CardHeader title="Recent scan events (live)" />
        {!recentScans?.length ? (
          <EmptyState message="No scan events in database." />
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
                        <span className="italic text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{event.tagId}</td>
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

      {/* Unknown tags panel */}
      {unknownTags && unknownTags.length > 0 && (
        <Card>
          <CardHeader
            title="Unknown tags"
            subtitle="Tags seen in scans but not yet assigned to any employee."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">Tag ID</th>
                  <th className="pb-2 pr-4">Seen</th>
                  <th className="pb-2 pr-4">First seen</th>
                  <th className="pb-2 pr-4">Last seen</th>
                  <th className="pb-2">Assign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {unknownTags.map((tag) => (
                  <UnknownTagRow
                    key={tag.tagId}
                    tag={tag}
                    employees={employees ?? []}
                    onAssign={(employeeId) =>
                      assignTag.mutate({ tagId: tag.tagId, employeeId })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function UnknownTagRow({
  tag,
  employees,
  onAssign,
}: {
  tag: { tagId: string; count: number; firstSeen: Date | null; lastSeen: Date | null };
  employees: { id: string; name: string }[];
  onAssign: (employeeId: string) => void;
}) {
  const [selected, setSelected] = useState("");

  return (
    <tr>
      <td className="py-1.5 pr-4 font-mono text-xs">{tag.tagId}</td>
      <td className="py-1.5 pr-4 text-gray-500">{tag.count}×</td>
      <td className="py-1.5 pr-4 text-xs text-gray-400">
        {tag.firstSeen ? timeAgo(tag.firstSeen) : "—"}
      </td>
      <td className="py-1.5 pr-4 text-xs text-gray-400">
        {tag.lastSeen ? timeAgo(tag.lastSeen) : "—"}
      </td>
      <td className="py-1.5">
        <div className="flex items-center gap-2">
          <select
            className="rounded border border-gray-300 px-2 py-1 text-xs"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select employee…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <button
            disabled={!selected}
            onClick={() => onAssign(selected)}
            className="rounded bg-brand-600 px-2 py-1 text-xs text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      </td>
    </tr>
  );
}
