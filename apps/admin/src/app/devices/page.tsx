"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, EmptyState,
  Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  formatDateTime,
} from "@employee-tracker/shared";

export default function DevicesPage() {
  const utils = api.useUtils();
  const { data: devices, isLoading } = api.device.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [newApiKey, setNewApiKey] = useState<{ deviceName: string; key: string } | null>(null);

  const setActive = api.device.setActive.useMutation({
    onSuccess: () => void utils.device.list.invalidate(),
  });

  const rotateKey = api.device.rotateApiKey.useMutation({
    onSuccess: (data) => {
      void utils.device.list.invalidate();
      if (data.apiKey) setNewApiKey({ deviceName: data.name, key: data.apiKey });
    },
  });

  const createDevice = api.device.create.useMutation({
    onSuccess: (data) => {
      void utils.device.list.invalidate();
      setShowCreate(false);
      if (data.apiKey) setNewApiKey({ deviceName: data.name, key: data.apiKey });
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
        <Button onClick={() => setShowCreate(true)}>+ Add device</Button>
      </div>

      {/* One-time API key reveal */}
      {newApiKey && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">API key for {newApiKey.deviceName}</CardTitle>
            <CardDescription className="text-amber-700">
              Copy this now — it will not be shown again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <code className="block w-full rounded-md border border-amber-200 bg-white px-3 py-2 font-mono text-sm break-all">
              {newApiKey.key}
            </code>
            <Button variant="outline" size="sm" onClick={() => setNewApiKey(null)}>
              Done — I copied it
            </Button>
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <CreateDeviceForm
          onSubmit={(data) => createDevice.mutate(data)}
          onCancel={() => setShowCreate(false)}
          isLoading={createDevice.isPending}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registered devices</CardTitle>
          <CardDescription>Kiosk, Pi readers, mock CLI, and web UI devices.</CardDescription>
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
                    <th className="pb-2 pr-4">Scans</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {devices.map((device) => (
                    <tr key={device.id}>
                      <td className="py-2.5 pr-4 font-mono font-medium">{device.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{device.location ?? "—"}</td>
                      <td className="py-2.5 pr-4"><DeviceTypeBadge type={device.type} /></td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={device.isActive ? "green" : "gray"}>
                          {device.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{device._count.scanEvents}</td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">{formatDateTime(device.createdAt)}</td>
                      <td className="py-2.5">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setActive.mutate({ id: device.id, isActive: !device.isActive })}>
                            {device.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          {device.type !== "MANUAL_UI" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={rotateKey.isPending}
                              onClick={() => {
                                if (confirm(`Rotate API key for ${device.name}? The old key will stop working immediately.`)) {
                                  rotateKey.mutate({ id: device.id });
                                }
                              }}
                            >
                              Rotate key
                            </Button>
                          )}
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

function CreateDeviceForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: { name: string; location?: string | null; type: "MOCK" | "PI_READER" | "MANUAL_UI" | "IPAD_KIOSK" }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<"IPAD_KIOSK" | "PI_READER" | "MOCK" | "MANUAL_UI">("IPAD_KIOSK");

  return (
    <Card>
      <CardHeader><CardTitle>New device</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={(e: React.FormEvent) => { e.preventDefault(); onSubmit({ name, location: location || null, type }); }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="dev-name">Name <span className="font-normal text-muted-foreground">(lowercase, hyphens/underscores only)</span></Label>
            <Input id="dev-name" className="font-mono" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} required placeholder="e.g. kiosk_front_door" pattern="[a-z0-9_-]+" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dev-location">Location (optional)</Label>
            <Input id="dev-location" value={location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)} placeholder="e.g. Sydney Office" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as typeof type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IPAD_KIOSK">Kiosk (iPad QR scanner)</SelectItem>
                <SelectItem value="PI_READER">Pi Reader (NFC)</SelectItem>
                <SelectItem value="MOCK">Mock CLI</SelectItem>
                <SelectItem value="MANUAL_UI">Manual UI (web simulator)</SelectItem>
              </SelectContent>
            </Select>
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

function DeviceTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; variant: "blue" | "yellow" | "gray" | "green" }> = {
    IPAD_KIOSK: { label: "Kiosk", variant: "green" },
    PI_READER: { label: "Pi Reader", variant: "blue" },
    MOCK: { label: "Mock CLI", variant: "yellow" },
    MANUAL_UI: { label: "Web UI", variant: "gray" },
  };
  const entry = map[type] ?? { label: type, variant: "gray" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
