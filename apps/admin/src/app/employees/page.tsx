"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Card, CardContent, CardHeader, CardTitle, EmptyState,
  Badge, Button, Input, Label, ConfirmDialog,
} from "@employee-tracker/shared";

export default function EmployeesPage() {
  const utils = api.useUtils();
  const { data: employees, isLoading } = api.employee.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const PAGE_SIZE = 10;

  const createEmployee = api.employee.create.useMutation({
    onSuccess: () => { void utils.employee.list.invalidate(); setShowCreate(false); },
  });

  const updateEmployee = api.employee.update.useMutation({
    onSuccess: () => void utils.employee.list.invalidate(),
  });

  const deleteEmployee = api.employee.delete.useMutation({
    onSuccess: () => { void utils.employee.list.invalidate(); setDeleteTarget(null); },
  });

  const assignTag = api.employee.assignTag.useMutation({
    onSuccess: () => { void utils.employee.list.invalidate(); setAssignTarget(null); },
  });

  const removeTag = api.employee.removeTag.useMutation({
    onSuccess: () => void utils.employee.list.invalidate(),
  });

  const revokePass = api.passes.revokePass.useMutation({
    onSuccess: () => void utils.employee.list.invalidate(),
  });

  const filtered = (employees?.filter((emp) => {
    const q = search.toLowerCase();
    return emp.name.toLowerCase().includes(q) || (emp.email?.toLowerCase().includes(q) ?? false);
  }) ?? []).sort((a, b) =>
    sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "employee"}?`}
        description="This will permanently remove the employee. This cannot be undone."
        confirmLabel="Delete"
        isLoading={deleteEmployee.isPending}
        onConfirm={() => deleteTarget && deleteEmployee.mutate({ id: deleteTarget.id })}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <Button onClick={() => setShowCreate(true)}>+ Add employee</Button>
      </div>

      <Input
        placeholder="Search by name or email…"
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(0); }}
        className="max-w-sm"
      />

      {showCreate && (
        <CreateEmployeeForm
          onSubmit={(data) => createEmployee.mutate(data)}
          onCancel={() => setShowCreate(false)}
          isLoading={createEmployee.isPending}
        />
      )}

      {assignTarget && (
        <AssignTagForm
          employeeId={assignTarget}
          employeeName={employees?.find((e) => e.id === assignTarget)?.name ?? ""}
          onSubmit={(data) => assignTag.mutate(data)}
          onCancel={() => setAssignTarget(null)}
          isLoading={assignTag.isPending}
        />
      )}

      <Card>
        <CardHeader><CardTitle>All employees</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !employees?.length ? (
            <EmptyState message="No employees yet." />
          ) : (
            <div className="w-full text-sm">
              <div className="flex border-b border-border pb-2 text-xs font-medium uppercase text-muted-foreground">
                <div className="w-[12%] pr-4">
                  <button
                    className="flex items-center gap-1 uppercase tracking-wide hover:text-foreground transition-colors"
                    onClick={() => { setSortDir((d) => d === "asc" ? "desc" : "asc"); setPage(0); }}
                  >
                    Name {sortDir === "asc" ? "↑" : "↓"}
                  </button>
                </div>
                <div className="w-[18%] pr-4">Email</div>
                <div className="w-[8%] pr-4">Status</div>
                <div className="w-[8%] pr-4">Presence</div>
                <div className="w-[8%] pr-4">Sign-in</div>
                <div className="w-[12%] pr-4">QR Pass</div>
                <div className="w-[14%] pr-4">Tags</div>
                <div className="w-[20%]">Actions</div>
              </div>

              {paged.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {search ? <>No employees match &ldquo;{search}&rdquo;.</> : "No employees yet."}
                </div>
              )}

              {paged.map((emp) => {
                const activePass = emp.tags.find((t) => t.passType === "QR_WALLET" && t.isActive);
                return (
                  <div key={emp.id} className="flex h-[53px] items-center overflow-hidden border-b border-border">
                    <div className="w-[12%] min-w-0 pr-4 font-medium truncate">{emp.name}</div>
                    <div className="w-[18%] min-w-0 pr-4 text-muted-foreground truncate">{emp.email ?? "—"}</div>
                    <div className="w-[8%] pr-4">
                      <Badge variant={emp.isActive ? "green" : "gray"}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="w-[8%] pr-4">
                      {emp.attendance ? (
                        <Badge variant={emp.attendance.status === "IN" ? "green" : "gray"}>
                          {emp.attendance.status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="w-[8%] pr-4">
                      {!emp.email ? (
                        <span className="text-xs text-muted-foreground">No email</span>
                      ) : emp.user ? (
                        <Badge variant="green" className="whitespace-nowrap">Signed in</Badge>
                      ) : (
                        <Badge variant="gray" className="whitespace-nowrap">Pending</Badge>
                      )}
                    </div>
                    <div className="w-[12%] pr-4">
                      {activePass ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="blue">Issued</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                            disabled={revokePass.isPending}
                            onClick={() => {
                              if (confirm(`Revoke QR pass for ${emp.name}?`)) {
                                revokePass.mutate({ employeeId: emp.id });
                              }
                            }}
                          >
                            Revoke
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                    <div className="w-[14%] min-w-0 overflow-hidden pr-4">
                      <div className="flex flex-wrap gap-1 overflow-hidden">
                        {emp.tags.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        ) : (
                          emp.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="flex min-w-0 items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs"
                            >
                              <span className="truncate">{tag.tagId}</span>
                              <button
                                onClick={() => removeTag.mutate({ tagId: tag.id })}
                                className="text-muted-foreground hover:text-destructive"
                                title="Remove tag"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="w-[20%]">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setAssignTarget(emp.id)}>
                          Assign tag
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateEmployee.mutate({ id: emp.id, isActive: !emp.isActive })}
                        >
                          {emp.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: emp.id, name: emp.name })}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {Array.from({ length: PAGE_SIZE - paged.length }).map((_, i) => (
                <div key={`spacer-${i}`} aria-hidden="true" className="h-[53px] border-b border-border" />
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>←</Button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button key={i} variant={i === page ? "default" : "outline"} size="sm" className="w-8" onClick={() => setPage(i)}>
                    {i + 1}
                  </Button>
                ))}
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>→</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateEmployeeForm({
  onSubmit, onCancel, isLoading,
}: {
  onSubmit: (data: { name: string; email?: string | null }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <Card>
      <CardHeader><CardTitle>New employee</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={(e: React.FormEvent) => { e.preventDefault(); onSubmit({ name, email: email || null }); }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="emp-name">Name</Label>
            <Input id="emp-name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} required placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-email">Email <span className="font-normal text-muted-foreground">(required for sign-in access)</span></Label>
            <Input id="emp-email" type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="employee@example.com" />
            <p className="text-xs text-muted-foreground">Once added, this person can sign in with Google using this email address.</p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>{isLoading ? "Creating…" : "Create"}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AssignTagForm({
  employeeId, employeeName, onSubmit, onCancel, isLoading,
}: {
  employeeId: string;
  employeeName: string;
  onSubmit: (data: { employeeId: string; tagId: string; label?: string | null }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [tagId, setTagId] = useState("");
  const [label, setLabel] = useState("");

  return (
    <Card>
      <CardHeader><CardTitle>Assign tag to {employeeName}</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={(e: React.FormEvent) => { e.preventDefault(); onSubmit({ employeeId, tagId, label: label || null }); }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="tag-id">Tag ID <span className="font-normal text-muted-foreground">(will be normalised to uppercase)</span></Label>
            <Input id="tag-id" className="font-mono" value={tagId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagId(e.target.value)} required placeholder="e.g. TAG_ALEXIS_001 or NFC UID" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag-label">Label (optional)</Label>
            <Input id="tag-label" value={label} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)} placeholder="e.g. Main card, Backup fob" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>{isLoading ? "Assigning…" : "Assign"}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
