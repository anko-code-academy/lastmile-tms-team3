import { RouteStatus } from "@/lib/types/route";

const STATUS_BADGE: Record<RouteStatus, { label: string; border: string; color: string }> = {
  [RouteStatus.Draft]: {
    label: "Draft",
    border: "rgba(148,163,184,.3)",
    color: "#94a3b8",
  },
  [RouteStatus.Dispatched]: {
    label: "Dispatched",
    border: "rgba(59,130,246,.3)",
    color: "#3b82f6",
  },
  [RouteStatus.InProgress]: {
    label: "In Progress",
    border: "rgba(245,158,11,.3)",
    color: "#f59e0b",
  },
  [RouteStatus.Completed]: {
    label: "Completed",
    border: "rgba(34,197,94,.3)",
    color: "#22c55e",
  },
};

export default function RouteStatusBadge({ status }: { status: RouteStatus }) {
  const badge = STATUS_BADGE[status] ?? { label: status, border: "rgba(74,95,122,.4)", color: "#4a5f7a" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 9999,
        fontSize: ".75rem",
        fontWeight: 600,
        letterSpacing: ".04em",
        border: `1px solid ${badge.border}`,
        color: badge.color,
      }}
    >
      {badge.label}
    </span>
  );
}
