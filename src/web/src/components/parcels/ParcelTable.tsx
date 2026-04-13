"use client";

import { useRouter } from "next/navigation";
import type { ParcelListItem } from "@/lib/types/parcel";
import { ParcelStatusBadge } from "@/components/parcels/ParcelStatusBadge";

type SortableParcelField = "trackingNumber" | "status" | "createdAt";
type SortDir = "asc" | "desc";

const mono = "var(--font-geist-mono, monospace)";

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
      <style>{`
        .pt-row:hover { background: rgba(255,255,255,.04) !important; cursor: pointer; }
        .pt-row:hover .pt-tracking { color: #fbbf24 !important; }
      `}</style>
      <div style={{
        background: "rgba(255,255,255,.025)",
        border: "1px solid rgba(255,255,255,.07)",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}>
              {COLS.map(({ label, field }) => {
                const isActive = field && sortField === field;
                return (
                  <th
                    key={label}
                    onClick={field ? () => onSort(field) : undefined}
                    style={{
                      padding: ".7rem 1rem",
                      textAlign: "left",
                      fontFamily: mono,
                      fontSize: "11px",
                      letterSpacing: ".12em",
                      color: isActive ? "#f59e0b" : "#647a96",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      cursor: field ? "pointer" : "default",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                    {field ? ` ${isActive ? (sortDir === "asc" ? "↑" : "↓") : "↕"}` : ""}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "3rem", textAlign: "center", fontFamily: mono, fontSize: "13px", color: "#4e6480" }}>
                  No parcels found.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr
                  key={p.id}
                  className="pt-row"
                  onClick={() => router.push(`/parcels/${p.id}`)}
                  style={{ borderBottom: "1px solid rgba(255,255,255,.04)", transition: "background .12s" }}
                >
                  {/* Tracking # — amber, monospace, bold */}
                  <td style={{ padding: ".75rem 1rem" }}>
                    <span className="pt-tracking" style={{ fontFamily: mono, fontWeight: 700, fontSize: "13px", color: "#f59e0b", letterSpacing: ".02em" }}>
                      {p.trackingNumber}
                    </span>
                  </td>

                  {/* Recipient — bright white */}
                  <td style={{ padding: ".75rem 1rem", fontSize: "13px", color: "#e2e8f0", fontWeight: 500 }}>
                    {p.recipientName}
                  </td>

                  {/* Status — badge */}
                  <td style={{ padding: ".75rem 1rem" }}>
                    <ParcelStatusBadge status={p.status} />
                  </td>

                  {/* City — light sky */}
                  <td style={{ padding: ".75rem 1rem", fontSize: "13px", color: "#93c5fd" }}>
                    {p.recipientCity}
                  </td>

                  {/* Zone — cyan, monospace, smaller */}
                  <td style={{ padding: ".75rem 1rem", fontFamily: mono, fontSize: "12px", color: "#38bdf8" }}>
                    {p.zoneName ?? <span style={{ color: "#4e6480" }}>—</span>}
                  </td>

                  {/* Service — green tint */}
                  <td style={{ padding: ".75rem 1rem", fontSize: "13px", color: "#6ee7b7" }}>
                    {p.serviceType.charAt(0) + p.serviceType.slice(1).toLowerCase()}
                  </td>

                  {/* Weight — muted */}
                  <td style={{ padding: ".75rem 1rem", fontFamily: mono, fontSize: "12px", color: "#7a9ab8" }}>
                    {p.weight} {p.weightUnit.toLowerCase()}
                  </td>

                  {/* Type — muted */}
                  <td style={{ padding: ".75rem 1rem", fontSize: "13px", color: "#7a9ab8" }}>
                    {p.parcelType ?? <span style={{ color: "#4e6480" }}>—</span>}
                  </td>

                  {/* Created — dim monospace */}
                  <td style={{ padding: ".75rem 1rem", fontFamily: mono, fontSize: "11px", color: "#647a96", letterSpacing: ".04em" }}>
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
