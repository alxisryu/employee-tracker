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
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { ScanOutcome } from "@prisma/client";

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

type ScanEvent = {
  id: string;
  scannedAt: Date;
  outcome: ScanOutcome;
  device: { name: string };
};

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
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false, dateKey: localDateKey(new Date(year, month + 1, d)) });
  }

  const selectedEvents = selectedKey ? (byDay.get(selectedKey) ?? []) : [];

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); setSelectedKey(null); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); setSelectedKey(null); }
  function canGoNext() {
    return new Date(year, month + 1, 1) <= new Date(today.getFullYear(), today.getMonth(), 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={prevMonth}>←</Button>
        <span className="text-sm font-semibold">{formatMonthYear(viewDate)}</span>
        <Button variant="ghost" size="sm" onClick={nextMonth} disabled={!canGoNext()}>→</Button>
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
              onClick={() => {
                if (!cell.currentMonth) return;
                setSelectedKey(cell.dateKey === selectedKey ? null : cell.dateKey);
              }}
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
              {hasIn && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-green-600" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-green-100 ring-1 ring-green-200" />
          Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded ring-2 ring-primary/40" />
          Today
        </span>
      </div>

      {selectedKey && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-semibold">
            {formatDateLong(new Date(selectedKey + "T00:00:00"))}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tap events on this day.</p>
          ) : (
            <ul className="space-y-1">
              {[...selectedEvents]
                .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime())
                .map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <span className={`font-medium ${e.outcome === "ACCEPTED_IN" ? "text-green-700" : "text-blue-700"}`}>
                      {e.outcome === "ACCEPTED_IN" ? "↑ In" : "↓ Out"}
                    </span>
                    <span className="text-foreground">{formatTime(new Date(e.scannedAt))}</span>
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
        const duration =
          inEvent && outEvent
            ? getDuration(new Date(inEvent.scannedAt), new Date(outEvent.scannedAt))
            : null;

        return (
          <div key={dateKey}>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">
                {formatDateLong(new Date(dateKey + "T00:00:00"))}
              </p>
              {duration && <span className="text-xs text-muted-foreground">{duration}</span>}
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {[...dayEvents]
                .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime())
                .map((e, i) => (
                  <div
                    key={e.id}
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${i > 0 ? "border-t border-border" : ""}`}
                  >
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

function getDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return "";
  const totalMins = Math.floor(ms / 60_000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Profile page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: session } = useSession();
  const utils = api.useUtils();

  const { data: profile, isLoading: profileLoading } = api.employee.getMyProfile.useQuery();
  const { data: history, isLoading: historyLoading } = api.employee.myAttendanceHistory.useQuery();

  const updateProfile = api.employee.updateMyProfile.useMutation({
    onSuccess: () => {
      void utils.employee.getMyProfile.invalidate();
      setEditingName(false);
    },
  });

  const claimTag = api.tag.claimTag.useMutation({
    onSuccess: () => {
      void utils.employee.getMyProfile.invalidate();
      setNewTagId("");
      setNewTagLabel("");
    },
  });

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [newTagId, setNewTagId] = useState("");
  const [newTagLabel, setNewTagLabel] = useState("");
  const [historyView, setHistoryView] = useState<"calendar" | "list">("calendar");

  if (!session) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Managed by Google</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Email" value={session.user.email} />
          <Row
            label="Role"
            value={
              <Badge variant={session.user.role === "ADMIN" ? "blue" : "gray"}>
                {session.user.role}
              </Badge>
            }
          />
        </CardContent>
      </Card>

      {/* Employee profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          {!editingName && profile && (
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDraftName(profile.name); setEditingName(true); }}
              >
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
            <form
              onSubmit={(e) => { e.preventDefault(); updateProfile.mutate({ name: draftName }); }}
              className="flex items-center gap-2"
            >
              <Input
                className="flex-1"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                required
              />
              <Button type="submit" size="sm" disabled={updateProfile.isPending}>
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingName(false)}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="space-y-2 text-sm">
              <Row label="Name" value={profile.name} />
              <Row
                label="Status"
                value={
                  <Badge variant={profile.isActive ? "green" : "gray"}>
                    {profile.isActive ? "Active" : "Inactive"}
                  </Badge>
                }
              />
              <Row
                label="Now"
                value={
                  <Badge variant={profile.attendance?.status === "IN" ? "green" : "gray"}>
                    {profile.attendance?.status ?? "OUT"}
                  </Badge>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* NFC tags */}
      <Card>
        <CardHeader>
          <CardTitle>My NFC tags</CardTitle>
          <CardDescription>Register the tag ID printed on your fob or card.</CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.tags.length ? (
            <ul className="mb-5 divide-y divide-border">
              {profile.tags.map((tag) => (
                <li key={tag.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-mono text-sm">{tag.tagId}</p>
                    {tag.label && <p className="text-xs text-muted-foreground">{tag.label}</p>}
                  </div>
                  <Badge variant={tag.isActive ? "green" : "gray"}>
                    {tag.isActive ? "Active" : "Inactive"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mb-5">
              <EmptyState message="No tags registered yet." />
            </div>
          )}

          <div className="border-t border-border pt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Register a tag
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                claimTag.mutate({ tagId: newTagId, label: newTagLabel || null });
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="new-tag-id">
                  Tag ID{" "}
                  <span className="font-normal text-muted-foreground">
                    — the UID on your fob, or enter one used on the reader
                  </span>
                </Label>
                <Input
                  id="new-tag-id"
                  className="font-mono"
                  value={newTagId}
                  onChange={(e) => setNewTagId(e.target.value)}
                  placeholder="e.g. 04A3B211223344"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-tag-label">Label (optional)</Label>
                <Input
                  id="new-tag-label"
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  placeholder="e.g. Blue keyfob"
                />
              </div>
              {claimTag.isError && (
                <p className="text-xs text-destructive">{claimTag.error.message}</p>
              )}
              {claimTag.isSuccess && (
                <p className="text-xs text-green-600">Tag registered.</p>
              )}
              <Button type="submit" disabled={claimTag.isPending}>
                {claimTag.isPending ? "Registering…" : "Register tag"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Attendance history */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance history</CardTitle>
          {history && (
            <CardDescription>
              {history.filter((e) => e.outcome === "ACCEPTED_IN").length} days recorded
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-3 -mt-2 flex justify-center">
            <div className="flex rounded-full border border-border bg-muted p-0.5 text-xs">
              <button
                onClick={() => setHistoryView("calendar")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  historyView === "calendar"
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setHistoryView("list")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  historyView === "list"
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                List
              </button>
            </div>
          </div>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !history?.length ? (
            <EmptyState message="No attendance history yet. Tap your tag on a reader to get started." />
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
