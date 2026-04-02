"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Card, CardContent, CardHeader, CardTitle, EmptyState,
  Badge, Button, Input, Label,
} from "@employee-tracker/shared";

export default function EmployeesPage() {
  const utils = api.useUtils();
  const { data: employees, isLoading } = api.employee.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);

  const createEmployee = api.employee.create.useMutation({
    onSuccess: () => { void utils.employee.list.invalidate(); setShowCreate(false); },
  });

  const updateEmployee = api.employee.update.useMutation({
    onSuccess: () => void utils.employee.list.invalidate(),
  });

  const revokePass = api.passes.revokePass.useMutation({
    onSuccess: () => void utils.employee.list.invalidate(),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <Button onClick={() => setShowCreate(true)}>+ Add employee</Button>
      </div>

      {showCreate && (
        <CreateEmployeeForm
          onSubmit={(data) => createEmployee.mutate(data)}
          onCancel={() => setShowCreate(false)}
          isLoading={createEmployee.isPending}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>All employees</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !employees?.length ? (
            <EmptyState message="No employees yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Presence</th>
                    <th className="pb-2 pr-4">QR Pass</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => {
                    const activePass = emp.tags.find(
                      (t) => t.passType === "QR_WALLET" && t.isActive,
                    );
                    return (
                      <tr key={emp.id}>
                        <td className="py-2.5 pr-4 font-medium">{emp.name}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{emp.email ?? "—"}</td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={emp.isActive ? "green" : "gray"}>
                            {emp.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4">
                          {emp.attendance ? (
                            <Badge variant={emp.attendance.status === "IN" ? "green" : "gray"}>
                              {emp.attendance.status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          {activePass ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="blue">Issued</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                disabled={revokePass.isPending}
                                onClick={() => {
                                  if (confirm(`Revoke QR pass for ${emp.name}? They will need to request a new one.`)) {
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
                        </td>
                        <td className="py-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateEmployee.mutate({ id: emp.id, isActive: !emp.isActive })}
                          >
                            {emp.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateEmployeeForm({
  onSubmit,
  onCancel,
  isLoading,
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
            <Label htmlFor="emp-email">Email (optional)</Label>
            <Input id="emp-email" type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="email@example.com" />
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
