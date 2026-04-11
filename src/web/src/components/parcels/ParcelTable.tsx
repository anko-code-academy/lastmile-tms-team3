"use client";

import { useRouter } from "next/navigation";
import type { ParcelListItem } from "@/lib/types/parcel";
import { ParcelStatusBadge } from "@/components/parcels/ParcelStatusBadge";

type SortableParcelField = "trackingNumber" | "status" | "createdAt";
type SortDir = "asc" | "desc";

const S = {
  panel:  "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)"  as const,
  text:   "#e2e8f0"                as const,
  muted:  "#4a5f7a"                as const,
  dim:    "#3a526e"                as const,
  accent: "#f59e0b"                as const,
  mono:   "var(--font-geist-mono, monospace)" as const,
};

const COLS: { label: string; field: SortableParcelField | null }[] = [
  { label: "Tracking #",  field: "trackingNumber" },
  { label: "Recipient",   field: null             },
  { label: "Status",      field: "status"         },
  { label: "City",        field: null             },
  { label: "Zone",        field: null             },
  { label: "Service",     field: null             },
  { label: "Weight",      field: null             },
  { label: "Type",        field: null             },
  { label: "Created",     field: "createdAt"      },
];

interface ParcelTableProps {
  items: ParcelListItem[];
  sortField: SortableParcelField | null;
  sortDir: SortDir;
  onSort: (field: SortableParcelField) => void;
}

export function ParcelTable({ items, sortField, sortDir, onSort }: ParcelTableProps) {
  const router = useRouter();

  return (
    <>
      <style>{`.pt-row:hover { background: rgba(255,255,255,.03); cursor: pointer; }`}</style>
      <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${S.border}`, background: "rgba(255,255,255,.02)" }}>
              {COLS.map(({ label, field }) => (
                <th
                  key={label}
                  onClick={field ? () => onSort(field) : undefined}
                  style={{
                    padding: ".75rem 1rem",
                    textAlign: "left",
                    fontFamily: S.mono,
                    fontSize: "9px",
                    letterSpacing: ".14em",
                    color: field && sortField === field ? S.accent : S.muted,
                    textTransform: "uppercase",
                    fontWeight: 600,
                    cursor: field ? "pointer" : "default",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                  {field ? ` ${sortField === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}` : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: "3rem",
                    textAlign: "center",
                    fontFamily: S.mono,
                    fontSize: ".875rem",
                    color: S.dim,
                  }}
                >
                  No parcels found.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr
                  key={p.id}
                  className="pt-row"
                  onClick={() => router.push(`/parcels/${p.id}`)}
                  style={{ borderBottom: `1px solid rgba(255,255,255,.04)`, transition: "background .15s" }}
                >
                  <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontWeight: 700, color: S.text, fontSize: ".8rem" }}>
                    {p.trackingNumber}
                  </td>
                  <td style={{ padding: ".75rem 1rem", fontSize: ".875rem", color: S.muted }}>
                    {p.recipientName}
                  </td>
                  <td style={{ padding: ".75rem 1rem" }}>
                    <ParcelStatusBadge status={p.status} />
                  </td>
                  <td style={{ padding: ".75rem 1rem", fontSize: ".875rem", color: S.muted }}>
                    {p.recipientCity}
                  </td>
                  <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>
                    {p.zoneName ?? "—"}
                  </td>
                  <td style={{ padding: ".75rem 1rem", fontSize: ".875rem", color: S.muted }}>
                    {p.serviceType.charAt(0) + p.serviceType.slice(1).toLowerCase()}
                  </td>
                  <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>
                    {p.weight} {p.weightUnit.toLowerCase()}
                  </td>
                  <td style={{ padding: ".75rem 1rem", fontSize: ".875rem", color: S.muted }}>
                    {p.parcelType ?? "—"}
                  </td>
                  <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
