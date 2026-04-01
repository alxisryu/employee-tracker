"use client";

import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  EmptyState,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { formatDateTime } from "~/lib/format";

export default function DevicesPage() {
  const utils = api.useUtils();
  const { data: devices, isLoading } = api.device.list.useQuery();

  const setActive = api.device.setActive.useMutation({
    onSuccess: () => void utils.device.list.invalidate(),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Devices</h1>

      <Card>
        <CardHeader>
          <CardTitle>Registered devices</CardTitle>
          <CardDescription>
            iPad kiosks and the web UI simulator are registered here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !devices?.length ? (
            <EmptyState message="No devices registered. Run pnpm db:seed to add sample devices." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Location</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Total scans</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {devices.map((device) => (
                    <tr key={device.id}>
                      <td className="py-2.5 pr-4 font-mono font-medium">{device.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {device.location ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <DeviceTypeBadge type={device.type} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={device.isActive ? "green" : "gray"}>
                          {device.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {device._count.scanEvents}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                        {formatDateTime(device.createdAt)}
                      </td>
                      <td className="py-2.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActive.mutate({
                              id: device.id,
                              isActive: !device.isActive,
                            })
                          }
                        >
                          {device.isActive ? "Deactivate" : "Activate"}
                        </Button>
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

function DeviceTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; variant: "blue" | "yellow" | "gray" }> = {
    IPAD_KIOSK: { label: "iPad Kiosk", variant: "blue" },
    MANUAL_UI: { label: "Web UI", variant: "gray" },
  };
  const entry = map[type] ?? { label: type, variant: "gray" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
