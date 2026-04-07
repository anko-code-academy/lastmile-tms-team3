"use client";

import { ParcelStatus } from "@/lib/types/parcel";

const STATUS_CONFIG: Record<ParcelStatus, { label: string; color: string; bg: string; border: string }> = {
  [ParcelStatus.Registered]:      { label: "Registered",       color: "#94a3b8", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.25)" },
  [ParcelStatus.ReceivedAtDepot]: { label: "Received",         color: "#60a5fa", bg: "rgba(96,165,250,.1)",  border: "rgba(96,165,250,.25)"  },
  [ParcelStatus.Sorted]:          { label: "Sorted",           color: "#818cf8", bg: "rgba(129,140,248,.1)", border: "rgba(129,140,248,.25)" },
  [ParcelStatus.Staged]:          { label: "Staged",           color: "#a78bfa", bg: "rgba(167,139,250,.1)", border: "rgba(167,139,250,.25)" },
  [ParcelStatus.Loaded]:          { label: "Loaded",           color: "#c084fc", bg: "rgba(192,132,252,.1)", border: "rgba(192,132,252,.25)" },
  [ParcelStatus.OutForDelivery]:  { label: "Out for Delivery", color: "#f59e0b", bg: "rgba(245,158,11,.1)",  border: "rgba(245,158,11,.25)"  },
  [ParcelStatus.Delivered]:       { label: "Delivered",        color: "#22c55e", bg: "rgba(34,197,94,.1)",   border: "rgba(34,197,94,.25)"   },
  [ParcelStatus.FailedAttempt]:   { label: "Failed Attempt",   color: "#fb923c", bg: "rgba(251,146,60,.1)",  border: "rgba(251,146,60,.25)"  },
  [ParcelStatus.ReturnedToDepot]: { label: "Returned",         color: "#f43f5e", bg: "rgba(244,63,94,.1)",   border: "rgba(244,63,94,.25)"   },
  [ParcelStatus.Cancelled]:       { label: "Cancelled",        color: "#ef4444", bg: "rgba(239,68,68,.1)",   border: "rgba(239,68,68,.25)"   },
  [ParcelStatus.Exception]:       { label: "Exception",        color: "#ec4899", bg: "rgba(236,72,153,.1)",  border: "rgba(236,72,153,.25)"  },
};

const MONO = "var(--font-geist-mono, monospace)";

export function ParcelStatusBadge({ status }: { status: ParcelStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "#94a3b8", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.25)" };
  return (
    <span style={{
      display: "inline-block",
      fontFamily: MONO,
      fontSize: "9px",
      letterSpacing: ".1em",
      textTransform: "uppercase",
      padding: ".2rem .5rem",
      borderRadius: 4,
      border: `1px solid ${cfg.border}`,
      background: cfg.bg,
      color: cfg.color,
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}
