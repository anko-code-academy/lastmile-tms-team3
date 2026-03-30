"use client";

import { ParcelStatus } from "@/lib/types/parcel";

const STATUS_CONFIG: Record<ParcelStatus, { label: string; color: string }> = {
  [ParcelStatus.Registered]:         { label: "Registered",        color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  [ParcelStatus.ReceivedAtDepot]:    { label: "Received",         color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  [ParcelStatus.Sorted]:              { label: "Sorted",           color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  [ParcelStatus.Staged]:              { label: "Staged",           color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  [ParcelStatus.Loaded]:              { label: "Loaded",           color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  [ParcelStatus.OutForDelivery]:      { label: "Out for Delivery", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  [ParcelStatus.Delivered]:           { label: "Delivered",        color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  [ParcelStatus.FailedAttempt]:       { label: "Failed Attempt",   color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  [ParcelStatus.ReturnedToDepot]:     { label: "Returned",         color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  [ParcelStatus.Cancelled]:           { label: "Cancelled",        color: "bg-red-500/20 text-red-400 border-red-500/30" },
  [ParcelStatus.Exception]:           { label: "Exception",        color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
};

interface ParcelStatusBadgeProps {
  status: ParcelStatus;
}

export function ParcelStatusBadge({ status }: ParcelStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
