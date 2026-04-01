"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default function EmployeesPage() {
  const utils = api.useUtils();
  const { data: employees, isLoading } = api.employee.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<string | null>(null);

  const createEmployee = api.employee.create.useMutation({
    onSuccess: () => {
      void utils.employee.list.invalidate();
      setShowCreate(false);
    },
  });

  const updateEmployee = api.employee.update.useMutation({
    onSuccess: () => void utils.employee.list.invalidate(),
  });

  const assignTag = api.employee.assignTag.useMutation({
    onSuccess: () => {
      void utils.employee.list.invalidate();
      setAssignTarget(null);
    },
  });

  const removeTag = api.employee.removeTag.useMutation({
    onSuccess: () => void utils.employee.list.invalidate(),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
                    <th className="pb-2 pr-4">Tags</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => (
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
                        <div className="flex flex-wrap gap-1">
                          {emp.tags.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No tags</span>
                          ) : (
                            emp.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs"
                              >
                                {tag.tagId}
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
                      </td>
                      <td className="py-2.5">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAssignTarget(emp.id)}
                          >
                            Assign tag
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateEmployee.mutate({
                                id: emp.id,
                                isActive: !emp.isActive,
                              })
                            }
                          >
                            {emp.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
      <CardHeader>
        <CardTitle>New employee</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name, email: email || null });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="emp-name">Name</Label>
            <Input
              id="emp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Full name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-email">Email (optional)</Label>
            <Input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating…" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AssignTagForm({
  employeeId,
  employeeName,
  onSubmit,
  onCancel,
  isLoading,
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
      <CardHeader>
        <CardTitle>Assign tag to {employeeName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ employeeId, tagId, label: label || null });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="tag-id">
              Tag ID{" "}
              <span className="font-normal text-muted-foreground">
                (will be normalised to uppercase)
              </span>
            </Label>
            <Input
              id="tag-id"
              className="font-mono"
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              required
              placeholder="e.g. TAG_ALEXIS_001 or NFC UID"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag-label">Label (optional)</Label>
            <Input
              id="tag-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Main card, Backup fob"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Assigning…" : "Assign"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
