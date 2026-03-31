"use client";

import { api } from "~/trpc/react";
import { Card, CardHeader, EmptyState } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { formatDateTime } from "~/lib/format";

export default function DevicesPage() {
  const utils = api.useUtils();
  const { data: devices, isLoading } = api.device.list.useQuery();

  const setActive = api.device.setActive.useMutation({
    onSuccess: () => void utils.device.list.invalidate(),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Devices</h1>

      <Card>
        <CardHeader
          title="Registered devices"
          subtitle="Each scanner endpoint (Pi, mock CLI, web UI) is a device."
        />
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !devices?.length ? (
          <EmptyState message="No devices registered. Run pnpm db:seed to add sample devices." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Location</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Total scans</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td className="py-2 pr-4 font-mono font-medium">{device.name}</td>
                    <td className="py-2 pr-4 text-gray-500">
                      {device.location ?? "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <DeviceTypeBadge type={device.type} />
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={device.isActive ? "green" : "gray"}>
                        {device.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {device._count.scanEvents}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-400">
                      {formatDateTime(device.createdAt)}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() =>
                          setActive.mutate({
                            id: device.id,
                            isActive: !device.isActive,
                          })
                        }
                        className="text-xs text-gray-500 hover:underline"
                      >
                        {device.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="API key provisioning" subtitle="For Pi / mock CLI devices" />
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Each Pi or mock device authenticates with a bearer token. API keys are
            hashed with bcrypt before being stored — the plain key is shown only once
            during seeding.
          </p>
          <p>
            To provision a new device key, use the seed script or a direct database
            update, then supply the plain key in the Pi client's{" "}
            <code className="rounded bg-gray-100 px-1 font-mono">DEVICE_API_KEY</code>{" "}
            env var.
          </p>
          <p className="font-medium text-gray-700">
            For the seeded mock_cli_1 device, the plain key was printed during{" "}
            <code className="rounded bg-gray-100 px-1 font-mono">pnpm db:seed</code>.
          </p>
        </div>
      </Card>
    </div>
  );
}

function DeviceTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; variant: "blue" | "yellow" | "gray" }> = {
    PI_READER: { label: "Pi Reader", variant: "blue" },
    MOCK: { label: "Mock CLI", variant: "yellow" },
    MANUAL_UI: { label: "Web UI", variant: "gray" },
  };
  const entry = map[type] ?? { label: type, variant: "gray" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
