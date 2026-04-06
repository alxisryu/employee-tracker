"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  EmptyState,
} from "@employee-tracker/shared";
import { Badge, Button, Input } from "@employee-tracker/shared";
import type { ScanOutcome } from "@employee-tracker/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}
function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

type ScanEvent = { id: string; scannedAt: Date; outcome: ScanOutcome; device: { name: string } };

// ─── Calendar view ────────────────────────────────────────────────────────────

function AttendanceCalendar({ events }: { events: ScanEvent[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, ScanEvent[]>();
    for (const e of events) {
      const key = localDateKey(new Date(e.scannedAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; currentMonth: boolean; dateKey: string }[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    const day = daysInPrevMonth - firstDayOfWeek + 1 + i;
    cells.push({ day, currentMonth: false, dateKey: localDateKey(new Date(year, month - 1, day)) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, dateKey: localDateKey(new Date(year, month, d)) });
  }
  for (let d = 1; d <= 42 - cells.length; d++) {
    cells.push({ day: d, currentMonth: false, dateKey: localDateKey(new Date(year, month + 1, d)) });
  }

  const selectedEvents = selectedKey ? (byDay.get(selectedKey) ?? []) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => { setViewDate(new Date(year, month - 1, 1)); setSelectedKey(null); }}>←</Button>
        <span className="text-sm font-semibold">{formatMonthYear(viewDate)}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setViewDate(new Date(year, month + 1, 1)); setSelectedKey(null); }}
          disabled={new Date(year, month + 1, 1) > new Date(today.getFullYear(), today.getMonth(), 1)}
        >→</Button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const dayEvents = byDay.get(cell.dateKey) ?? [];
          const hasIn = dayEvents.some((e) => e.outcome === "ACCEPTED_IN");
          const isToday = cell.dateKey === localDateKey(today) && cell.currentMonth;
          const isSelected = cell.dateKey === selectedKey;
          return (
            <button
              key={i}
              onClick={() => { if (!cell.currentMonth) return; setSelectedKey(cell.dateKey === selectedKey ? null : cell.dateKey); }}
              disabled={!cell.currentMonth}
              className={`relative flex h-9 w-full items-center justify-center rounded-md text-sm transition-colors
                ${!cell.currentMonth ? "cursor-default text-muted-foreground/30" : ""}
                ${isSelected ? "bg-primary text-primary-foreground" : ""}
                ${hasIn && !isSelected ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                ${!hasIn && !isSelected && cell.currentMonth ? "hover:bg-muted" : ""}
                ${isToday && !isSelected ? "ring-2 ring-primary/40" : ""}
              `}
            >
              {cell.day}
              {hasIn && !isSelected && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-green-600" />}
            </button>
          );
        })}
      </div>
      {selectedKey && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-semibold">{formatDateLong(new Date(selectedKey + "T00:00:00"))}</p>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No scan events on this day.</p>
          ) : (
            <ul className="space-y-1">
              {[...selectedEvents]
                .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime())
                .map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <span className={`font-medium ${e.outcome === "ACCEPTED_IN" ? "text-green-700" : "text-blue-700"}`}>
                      {e.outcome === "ACCEPTED_IN" ? "↑ In" : "↓ Out"}
                    </span>
                    <span>{formatTime(new Date(e.scannedAt))}</span>
                    <span className="text-muted-foreground">via {e.device.name}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function AttendanceList({ events }: { events: ScanEvent[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, ScanEvent[]>();
    for (const e of events) {
      const key = localDateKey(new Date(e.scannedAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [events]);

  if (grouped.length === 0) return <EmptyState message="No attendance history yet." />;

  return (
    <div className="space-y-4">
      {grouped.map(([dateKey, dayEvents]) => {
        const inEvent = dayEvents.find((e) => e.outcome === "ACCEPTED_IN");
        const outEvent = dayEvents.find((e) => e.outcome === "ACCEPTED_OUT");
        const ms = inEvent && outEvent ? new Date(outEvent.scannedAt).getTime() - new Date(inEvent.scannedAt).getTime() : 0;
        const duration = ms > 0 ? (() => { const m = Math.floor(ms / 60_000); const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; })() : null;
        return (
          <div key={dateKey}>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold">{formatDateLong(new Date(dateKey + "T00:00:00"))}</p>
              {duration && <span className="text-xs text-muted-foreground">{duration}</span>}
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {[...dayEvents]
                .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime())
                .map((e, i) => (
                  <div key={e.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${i > 0 ? "border-t border-border" : ""}`}>
                    <span className={`flex w-14 items-center gap-1 font-medium ${e.outcome === "ACCEPTED_IN" ? "text-green-700" : "text-blue-700"}`}>
                      {e.outcome === "ACCEPTED_IN" ? "↑ In" : "↓ Out"}
                    </span>
                    <span className="tabular-nums">{formatTime(new Date(e.scannedAt))}</span>
                    <span className="text-xs text-muted-foreground">via {e.device.name}</span>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── QR Pass section ──────────────────────────────────────────────────────────

function QrPassCard() {
  const utils = api.useUtils();
  const { data: passStatus, isLoading: passLoading } = api.passes.getPassStatus.useQuery();

  const requestPass = api.passes.requestPass.useMutation({
    onSuccess: (data: { passType: "apple"; data: string } | { passType: "google"; saveUrl: string }) => {
      void utils.passes.getPassStatus.invalidate();
      if (data.passType === "apple") {
        // Trigger .pkpass file download.
        const bytes = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/vnd.apple.pkpass" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "office-pass.pkpass";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        window.open(data.saveUrl, "_blank");
      }
    },
  });

  const downloadPass = api.passes.downloadPass.useMutation({
    onSuccess: (data: { passType: "apple"; data: string } | { passType: "google"; saveUrl: string }) => {
      if (data.passType === "apple") {
        const bytes = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/vnd.apple.pkpass" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "office-pass.pkpass";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        window.open(data.saveUrl, "_blank");
      }
    },
  });

  const hasPass = !!passStatus;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile Pass</CardTitle>
        <CardDescription>
          Add a QR pass to Apple Wallet or Google Wallet. Scan it at the office kiosk to
          check in. One pass per account — contact an admin to reset it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {passLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : hasPass ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <span className="text-green-700 text-sm font-medium">Pass active</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {passStatus.tagId.slice(0, 8)}…
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Adding to another device? Download the same pass again — your token stays the same.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={downloadPass.isPending}
                onClick={() => downloadPass.mutate({ passType: "apple" })}
              >
                {downloadPass.isPending ? "Downloading…" : "Add to Apple Wallet"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={downloadPass.isPending}
                onClick={() => downloadPass.mutate({ passType: "google" })}
              >
                Add to Google Wallet
              </Button>
            </div>
            {downloadPass.isError && (
              <p className="text-xs text-destructive">{downloadPass.error.message}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <EmptyState message="No pass issued yet. Choose a wallet to get started." />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={requestPass.isPending}
                onClick={() => requestPass.mutate({ passType: "apple" })}
              >
                {requestPass.isPending ? "Generating…" : "Add to Apple Wallet"}
              </Button>
              <Button
                variant="outline"
                disabled={requestPass.isPending}
                onClick={() => requestPass.mutate({ passType: "google" })}
              >
                Add to Google Wallet
              </Button>
            </div>
            {requestPass.isError && (
              <p className="text-xs text-destructive">{requestPass.error.message}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Profile page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: session } = useSession();
  const utils = api.useUtils();

  const { data: profile, isLoading: profileLoading } = api.employee.getMyProfile.useQuery();
  const { data: history, isLoading: historyLoading } = api.employee.myAttendanceHistory.useQuery();

  const updateProfile = api.employee.updateMyProfile.useMutation({
    onSuccess: () => { void utils.employee.getMyProfile.invalidate(); setEditingName(false); },
  });

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [historyView, setHistoryView] = useState<"calendar" | "list">("calendar");

  if (!session?.user) return null;
  const user = session.user as typeof session.user & { role: string; email: string };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Managed by Google</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Email" value={user.email} />
          <Row label="Role" value={<Badge variant={user.role === "ADMIN" ? "blue" : "gray"}>{user.role}</Badge>} />
        </CardContent>
      </Card>

      {/* Employee profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          {!editingName && profile && (
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => { setDraftName(profile.name); setEditingName(true); }}>
                Edit name
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !profile ? (
            <EmptyState message="No employee profile linked yet. Contact an admin." />
          ) : editingName ? (
            <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); updateProfile.mutate({ name: draftName }); }} className="flex items-center gap-2">
              <Input className="flex-1" value={draftName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftName(e.target.value)} required />
              <Button type="submit" size="sm" disabled={updateProfile.isPending}>Save</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingName(false)}>Cancel</Button>
            </form>
          ) : (
            <div className="space-y-2 text-sm">
              <Row label="Name" value={profile.name} />
              <Row label="Status" value={<Badge variant={profile.isActive ? "green" : "gray"}>{profile.isActive ? "Active" : "Inactive"}</Badge>} />
              <Row label="Now" value={<Badge variant={profile.attendance?.status === "IN" ? "green" : "gray"}>{profile.attendance?.status ?? "OUT"}</Badge>} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Pass */}
      <QrPassCard />

      {/* Attendance history */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance history</CardTitle>
          {history && <CardDescription>{history.filter((e) => e.outcome === "ACCEPTED_IN").length} days recorded</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="mb-3 -mt-2 flex justify-center">
            <div className="flex rounded-full border border-border bg-muted p-0.5 text-xs">
              {(["calendar", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setHistoryView(v)}
                  className={`rounded-full px-3 py-1 capitalize transition-colors ${
                    historyView === v ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !history?.length ? (
            <EmptyState message="No attendance history yet. Scan your pass at the kiosk to get started." />
          ) : historyView === "calendar" ? (
            <AttendanceCalendar events={history} />
          ) : (
            <AttendanceList events={history} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
