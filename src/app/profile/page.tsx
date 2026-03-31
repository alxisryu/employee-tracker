"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { Card, CardHeader, EmptyState } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
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

  // Map of dateKey → events for that day
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

  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build the 6×7 grid (fill with prev/next month days to complete rows)
  const cells: { day: number; currentMonth: boolean; dateKey: string }[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    const day = daysInPrevMonth - firstDayOfWeek + 1 + i;
    const d = new Date(year, month - 1, day);
    cells.push({ day, currentMonth: false, dateKey: localDateKey(d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, dateKey: localDateKey(new Date(year, month, d)) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false, dateKey: localDateKey(new Date(year, month + 1, d)) });
  }

  const selectedEvents = selectedKey ? (byDay.get(selectedKey) ?? []) : [];

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedKey(null);
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedKey(null);
  }
  function canGoNext() {
    return new Date(year, month + 1, 1) <= new Date(today.getFullYear(), today.getMonth(), 1);
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {formatMonthYear(viewDate)}
        </span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext()}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        >
          →
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const dayEvents = byDay.get(cell.dateKey) ?? [];
          const hasIn = dayEvents.some((e) => e.outcome === "ACCEPTED_IN");
          const isToday = cell.dateKey === localDateKey(today) && cell.currentMonth;
          const isSelected = cell.dateKey === selectedKey;

          let bg = "bg-white hover:bg-gray-50";
          if (!cell.currentMonth) bg = "bg-transparent";
          else if (isSelected) bg = "bg-brand-600 text-white";
          else if (hasIn) bg = "bg-green-100 hover:bg-green-200";

          return (
            <button
              key={i}
              onClick={() => {
                if (!cell.currentMonth) return;
                setSelectedKey(cell.dateKey === selectedKey ? null : cell.dateKey);
              }}
              disabled={!cell.currentMonth}
              className={`relative flex h-9 w-full items-center justify-center rounded text-sm transition-colors ${bg} ${
                !cell.currentMonth ? "cursor-default text-gray-300" : ""
              } ${isToday && !isSelected ? "ring-2 ring-brand-400" : ""}`}
            >
              {cell.day}
              {hasIn && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-green-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-100 ring-1 ring-green-200" />
          Present
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded ring-2 ring-brand-400" />
          Today
        </span>
      </div>

      {/* Selected day events */}
      {selectedKey && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">
            {formatDateLong(new Date(selectedKey + "T00:00:00"))}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-gray-400">No tap events on this day.</p>
          ) : (
            <ul className="space-y-1">
              {[...selectedEvents]
                .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime())
                .map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`font-medium ${e.outcome === "ACCEPTED_IN" ? "text-green-700" : "text-blue-700"}`}
                    >
                      {e.outcome === "ACCEPTED_IN" ? "↑ In" : "↓ Out"}
                    </span>
                    <span className="text-gray-600">{formatTime(new Date(e.scannedAt))}</span>
                    <span className="text-gray-400">via {e.device.name}</span>
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
  // Group by local date, most recent first
  const grouped = useMemo(() => {
    const map = new Map<string, ScanEvent[]>();
    for (const e of events) {
      const key = localDateKey(new Date(e.scannedAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    // Sort keys descending
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [events]);

  if (grouped.length === 0) {
    return <EmptyState message="No attendance history yet." />;
  }

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
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">
                {formatDateLong(new Date(dateKey + "T00:00:00"))}
              </p>
              {duration && (
                <span className="text-xs text-gray-400">{duration}</span>
              )}
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              {[...dayEvents]
                .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime())
                .map((e, i) => (
                  <div
                    key={e.id}
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${
                      i > 0 ? "border-t border-gray-100" : ""
                    }`}
                  >
                    <span
                      className={`flex w-14 items-center gap-1 font-medium ${
                        e.outcome === "ACCEPTED_IN" ? "text-green-700" : "text-blue-700"
                      }`}
                    >
                      {e.outcome === "ACCEPTED_IN" ? "↑ In" : "↓ Out"}
                    </span>
                    <span className="tabular-nums text-gray-800">
                      {formatTime(new Date(e.scannedAt))}
                    </span>
                    <span className="text-xs text-gray-400">via {e.device.name}</span>
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
      <h1 className="text-2xl font-bold">My Profile</h1>

      {/* Account info */}
      <Card>
        <CardHeader title="Account" subtitle="Managed by Google" />
        <div className="space-y-2 text-sm">
          <Row label="Email" value={session.user.email} />
          <Row
            label="Role"
            value={
              <Badge variant={session.user.role === "ADMIN" ? "blue" : "gray"}>
                {session.user.role}
              </Badge>
            }
          />
        </div>
      </Card>

      {/* Employee profile */}
      <Card>
        <CardHeader
          title="Profile"
          action={
            !editingName && profile ? (
              <button
                onClick={() => { setDraftName(profile.name); setEditingName(true); }}
                className="text-xs text-brand-600 hover:underline"
              >
                Edit name
              </button>
            ) : undefined
          }
        />
        {profileLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !profile ? (
          <EmptyState message="No employee profile linked yet. Contact an admin." />
        ) : editingName ? (
          <form
            onSubmit={(e) => { e.preventDefault(); updateProfile.mutate({ name: draftName }); }}
            className="flex items-center gap-2"
          >
            <input
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingName(false)}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-600"
            >
              Cancel
            </button>
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
      </Card>

      {/* NFC tags */}
      <Card>
        <CardHeader
          title="My NFC tags"
          subtitle="Register the tag ID printed on your fob or card."
        />
        {profile?.tags.length ? (
          <ul className="mb-4 divide-y divide-gray-100">
            {profile.tags.map((tag) => (
              <li key={tag.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-mono text-sm">{tag.tagId}</p>
                  {tag.label && <p className="text-xs text-gray-400">{tag.label}</p>}
                </div>
                <Badge variant={tag.isActive ? "green" : "gray"}>
                  {tag.isActive ? "Active" : "Inactive"}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No tags registered yet." />
        )}

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-xs font-medium uppercase text-gray-500">Register a tag</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              claimTag.mutate({ tagId: newTagId, label: newTagLabel || null });
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Tag ID
                <span className="ml-1 font-normal text-gray-400">
                  — the UID on your fob, or enter one used on the reader
                </span>
              </label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none"
                value={newTagId}
                onChange={(e) => setNewTagId(e.target.value)}
                placeholder="e.g. 04A3B211223344"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Label (optional)</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                placeholder="e.g. Blue keyfob"
              />
            </div>
            {claimTag.isError && (
              <p className="text-xs text-red-600">{claimTag.error.message}</p>
            )}
            {claimTag.isSuccess && (
              <p className="text-xs text-green-600">Tag registered.</p>
            )}
            <button
              type="submit"
              disabled={claimTag.isPending}
              className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {claimTag.isPending ? "Registering…" : "Register tag"}
            </button>
          </form>
        </div>
      </Card>

      {/* Attendance history */}
      <Card>
        <CardHeader
          title="Attendance history"
          subtitle={
            history
              ? `${history.filter((e) => e.outcome === "ACCEPTED_IN").length} days recorded`
              : undefined
          }
          action={
            <div className="flex rounded border border-gray-200 text-xs">
              <button
                onClick={() => setHistoryView("calendar")}
                className={`px-3 py-1.5 ${historyView === "calendar" ? "bg-gray-100 font-medium" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Calendar
              </button>
              <button
                onClick={() => setHistoryView("list")}
                className={`px-3 py-1.5 ${historyView === "list" ? "bg-gray-100 font-medium" : "text-gray-500 hover:bg-gray-50"}`}
              >
                List
              </button>
            </div>
          }
        />
        {historyLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !history?.length ? (
          <EmptyState message="No attendance history yet. Tap your tag on a reader to get started." />
        ) : historyView === "calendar" ? (
          <AttendanceCalendar events={history} />
        ) : (
          <AttendanceList events={history} />
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-16 shrink-0 text-gray-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
