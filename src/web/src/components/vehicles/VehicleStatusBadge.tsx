"use client";

import { VehicleStatus } from "@/lib/types/vehicle";

const statusConfig: Record<
  VehicleStatus,
  { label: string; className: string }
> = {
  [VehicleStatus.Available]: {
    label: "Available",
    className:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  [VehicleStatus.InUse]: {
    label: "In Use",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  [VehicleStatus.Maintenance]: {
    label: "Maintenance",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  [VehicleStatus.Retired]: {
    label: "Retired",
    className: "bg-muted text-muted-foreground border-border",
  },
};

interface VehicleStatusBadgeProps {
  status: VehicleStatus;
}

export function VehicleStatusBadge({ status }: VehicleStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
