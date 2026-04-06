"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, EmptyState,
  Badge, Button, Input, Label, formatDateTime,
} from "@employee-tracker/shared";

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function formatDuration(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime();
  if (ms < 0) return "—";
  const totalMins = Math.floor(ms / 60_000);
  const h = Math.floor(totalMins / 60);
  const min = totalMins % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function ReportsPage() {
  const today = toLocalDateString(new Date());
  const thirtyDaysAgo = toLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [fromInput, setFromInput] = useState(thirtyDaysAgo);
  const [toInput, setToInput] = useState(today);
  const [submittedRange, setSubmittedRange] = useState<{
    from: Date; to: Date; fromStr: string; toStr: string;
  } | null>(null);

  const { data, isFetching, isError } = api.report.attendanceReport.useQuery(
    submittedRange ?? { from: new Date(), to: new Date() },
    { enabled: submittedRange !== null },
  );

  function handleGenerate() {
    setSubmittedRange({
      from: parseDateInput(fromInput),
      to: parseDateInput(toInput),
      fromStr: fromInput,
      toStr: toInput,
    });
  }

  function exportCsv() {
    if (!data || !submittedRange) return;
    const rows: string[][] = [
      ["Employee", "Email", "Date", "First Sign-In (UTC)", "Last Sign-Out (UTC)", "Duration", "Total Scans"],
    ];
    for (const emp of data.employees) {
      for (const day of emp.days) {
        rows.push([
          emp.name, emp.email ?? "", day.date,
          day.firstIn ? day.firstIn.toISOString() : "",
          day.lastOut ? day.lastOut.toISOString() : "",
          day.firstIn && day.lastOut ? formatDuration(day.firstIn, day.lastOut) : "",
          String(day.totalScans),
        ]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report_${submittedRange.fromStr}_to_${submittedRange.toStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SOC2 compliance — full audit trail of employee sign-ins and sign-outs.
          </p>
        </div>
        {data && submittedRange && (
          <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={fromInput} max={toInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromInput(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={toInput} min={fromInput} max={today} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToInput(e.target.value)} className="w-40" />
            </div>
            <Button onClick={handleGenerate} disabled={isFetching}>
              {isFetching ? "Generating…" : "Generate report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isError && <p className="text-sm text-destructive">Failed to load report. Please try again.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Employees with activity" value={String(data.employees.length)} />
            <StatCard label="Total accepted scans" value={String(data.totalEvents)} />
            <StatCard label="Report generated" value={formatDateTime(data.generatedAt)} small />
          </div>

          {data.employees.length === 0 ? (
            <Card><CardContent><EmptyState message="No attendance events found for the selected date range." /></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {data.employees.map((emp) => (
                <Card key={emp.employeeId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{emp.name}</CardTitle>
                        {emp.email && <CardDescription>{emp.email}</CardDescription>}
                      </div>
                      <Badge variant="gray">{emp.totalScans} scan{emp.totalScans !== 1 ? "s" : ""}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
                            <th className="pb-2 pr-6">Date</th>
                            <th className="pb-2 pr-6">First Sign-In</th>
                            <th className="pb-2 pr-6">Last Sign-Out</th>
                            <th className="pb-2 pr-6">Duration</th>
                            <th className="pb-2">Scans</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {emp.days.map((day) => (
                            <tr key={day.date}>
                              <td className="py-2.5 pr-6 font-mono text-xs">{day.date}</td>
                              <td className="py-2.5 pr-6">
                                {day.firstIn
                                  ? <span className="font-medium text-green-700">{formatDateTime(day.firstIn)}</span>
                                  : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="py-2.5 pr-6">
                                {day.lastOut
                                  ? <span className="font-medium text-blue-700">{formatDateTime(day.lastOut)}</span>
                                  : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="py-2.5 pr-6 text-muted-foreground">
                                {day.firstIn && day.lastOut ? formatDuration(day.firstIn, day.lastOut) : "—"}
                              </td>
                              <td className="py-2.5"><Badge variant="gray">{day.totalScans}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {!data && !isFetching && (
        <Card><CardContent><EmptyState message="Select a date range and click Generate report." /></CardContent></Card>
      )}
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 font-bold tracking-tight text-foreground ${small ? "text-base" : "text-3xl"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
