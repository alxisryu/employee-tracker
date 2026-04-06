"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, EmptyState,
  OutcomeBadge, Button, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  timeAgo,
} from "@employee-tracker/shared";
import type { ScanOutcome } from "@employee-tracker/db";

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
  const [scanTime, setScanTime] = useState("");
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

  const clearManual = api.scan.clearManual.useMutation({
    onSuccess: () => {
      void utils.scan.recent.invalidate();
      void utils.scan.unknownTags.invalidate();
      void utils.dashboard.currentPresence.invalidate();
      void utils.dashboard.stats.invalidate();
      setResults([]);
    },
  });

  const activeDevices = devices?.filter((d) => d.isActive) ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tagId.trim()) return;
    const scannedAt = scanTime ? new Date(scanTime).toISOString() : undefined;
    ingest.mutate({ tagId: tagId.trim(), deviceId, scannedAt });
  }

  function setToNow() {
    const now = new Date();
    now.setMilliseconds(0);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 19);
    setScanTime(local);
  }

  const quickTags = employees
    ?.flatMap((e) => e.tags.map((t) => ({ ...t, employeeName: e.name })))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Scan Simulator</h1>
          <button
            onClick={() => {
              if (confirm("Delete all simulator scan events from the database? This cannot be undone.")) {
                clearManual.mutate();
              }
            }}
            disabled={clearManual.isPending}
            className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            {clearManual.isPending ? "Clearing…" : "Clear data"}
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit fake scan events to test the attendance system without hardware.
          This is the same ingestion path that a real NFC reader would use.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scan form */}
        <Card>
          <CardHeader>
            <CardTitle>Submit a scan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tag-id">Tag ID</Label>
                <Input
                  id="tag-id"
                  className="font-mono"
                  value={tagId}
                  onChange={(e) => setTagId(e.target.value)}
                  placeholder="e.g. TAG_ALEXIS_001"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="device-select">Device</Label>
                <Select value={deviceId} onValueChange={(v) => v && setDeviceId(v)}>
                  <SelectTrigger id="device-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDevices.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name} ({d.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="scan-time">
                    Tap time{" "}
                    <span className="font-normal text-muted-foreground">
                      — leave blank to use now
                    </span>
                  </Label>
                  <button
                    type="button"
                    onClick={setToNow}
                    className="text-xs text-primary hover:underline"
                  >
                    Set to now
                  </button>
                </div>
                <Input
                  id="scan-time"
                  type="datetime-local"
                  step="1"
                  value={scanTime}
                  onChange={(e) => setScanTime(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={ingest.isPending} className="w-full">
                {ingest.isPending ? "Submitting…" : "Submit scan"}
              </Button>

              {ingest.isError && (
                <p className="text-xs text-destructive">
                  Error: {ingest.error.message}
                </p>
              )}
            </form>

            {/* Quick-scan buttons */}
            {quickTags && quickTags.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quick scan
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickTags.map((tag) => (
                    <Button
                      key={tag.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setTagId(tag.tagId)}
                    >
                      {tag.employeeName}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTagId("TAG_UNKNOWN_X")}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Unknown tag
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Local result log */}
        <Card>
          <CardHeader>
            <CardTitle>Simulation results</CardTitle>
            <CardDescription>This session only</CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <EmptyState message="No scans submitted yet. Try the form on the left." />
            ) : (
              <ul className="divide-y divide-border">
                {results.map((r, i) => (
                  <li key={i} className="py-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <OutcomeBadge outcome={r.outcome} />
                        <p className="mt-1 text-sm">{r.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Event ID: {r.scanEventId.slice(0, 8)}…
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(r.timestamp)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent scans from DB */}
      <Card>
        <CardHeader>
          <CardTitle>Recent scan events (live)</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentScans?.length ? (
            <EmptyState message="No scan events in database." />
          ) : (
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
                  {recentScans.map((event) => (
                    <tr key={event.id}>
                      <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo(event.scannedAt)}
                      </td>
                      <td className="py-2 pr-4">
                        {event.employee?.name ?? (
                          <span className="italic text-muted-foreground">Unknown</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{event.tagId}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {event.device.name}
                      </td>
                      <td className="py-2">
                        <OutcomeBadge outcome={event.outcome} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unknown tags panel */}
      {unknownTags && unknownTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unknown tags</CardTitle>
            <CardDescription>
              Tags seen in scans but not yet assigned to any employee.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Tag ID</th>
                    <th className="pb-2 pr-4">Seen</th>
                    <th className="pb-2 pr-4">First seen</th>
                    <th className="pb-2 pr-4">Last seen</th>
                    <th className="pb-2">Assign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
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
          </CardContent>
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
      <td className="py-2 pr-4 font-mono text-xs">{tag.tagId}</td>
      <td className="py-2 pr-4 text-muted-foreground">{tag.count}×</td>
      <td className="py-2 pr-4 text-xs text-muted-foreground">
        {tag.firstSeen ? timeAgo(tag.firstSeen) : "—"}
      </td>
      <td className="py-2 pr-4 text-xs text-muted-foreground">
        {tag.lastSeen ? timeAgo(tag.lastSeen) : "—"}
      </td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Select employee…" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!selected}
            onClick={() => onAssign(selected)}
          >
            Assign
          </Button>
        </div>
      </td>
    </tr>
  );
}
