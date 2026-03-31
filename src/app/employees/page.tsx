"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardHeader, EmptyState } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";

export default function EmployeesPage() {
  const utils = api.useUtils();
  const { data: employees, isLoading } = api.employee.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<string | null>(null); // employeeId

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
        <h1 className="text-2xl font-bold">Employees</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Add employee
        </button>
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
        <CardHeader title="All employees" />
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !employees?.length ? (
          <EmptyState message="No employees yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Presence</th>
                  <th className="pb-2 pr-4">Tags</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td className="py-2 pr-4 font-medium">{emp.name}</td>
                    <td className="py-2 pr-4 text-gray-500">{emp.email ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={emp.isActive ? "green" : "gray"}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">
                      {emp.attendance ? (
                        <Badge
                          variant={emp.attendance.status === "IN" ? "green" : "gray"}
                        >
                          {emp.attendance.status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {emp.tags.length === 0 ? (
                          <span className="text-xs text-gray-400">No tags</span>
                        ) : (
                          emp.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="group flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs"
                            >
                              {tag.tagId}
                              <button
                                onClick={() => removeTag.mutate({ tagId: tag.id })}
                                className="text-gray-400 hover:text-red-500"
                                title="Remove tag"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAssignTarget(emp.id)}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Assign tag
                        </button>
                        <button
                          onClick={() =>
                            updateEmployee.mutate({
                              id: emp.id,
                              isActive: !emp.isActive,
                            })
                          }
                          className="text-xs text-gray-500 hover:underline"
                        >
                          {emp.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
      <CardHeader title="New employee" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, email: email || null });
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700">Name</label>
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Email (optional)
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isLoading ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
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
      <CardHeader title={`Assign tag to ${employeeName}`} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ employeeId, tagId, label: label || null });
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Tag ID
            <span className="ml-1 font-normal text-gray-400">
              (will be normalised to uppercase)
            </span>
          </label>
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none"
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            required
            placeholder="e.g. TAG_ALEXIS_001 or NFC UID"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Label (optional)
          </label>
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Main card, Backup fob"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isLoading ? "Assigning…" : "Assign"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
