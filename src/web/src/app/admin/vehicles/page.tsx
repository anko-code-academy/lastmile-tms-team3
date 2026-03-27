"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TmNavbar from "@/components/TmNavbar";
import { getVehiclesAction } from "@/lib/actions/vehicles";
import type { Vehicle } from "@/lib/types/vehicle";
import { VehicleStatus } from "@/lib/types/vehicle";

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)" as const,
  text: "#e2e8f0" as const,
  muted: "#4a5f7a" as const,
  dim: "#3a526e" as const,
  accent: "#f59e0b" as const,
  inputBg: "rgba(255,255,255,.05)" as const,
  inputBorder: "rgba(255,255,255,.1)" as const,
  green: "#22c55e" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

const STATUS_BADGE: Record<VehicleStatus, { label: string; border: string; color: string }> = {
  [VehicleStatus.Available]: { label: "Available", border: "rgba(34,197,94,.3)", color: "#22c55e" },
  [VehicleStatus.InUse]: { label: "In Use", border: "rgba(245,158,11,.3)", color: "#f59e0b" },
  [VehicleStatus.Maintenance]: { label: "Maintenance", border: "rgba(239,68,68,.3)", color: "#ef4444" },
  [VehicleStatus.Retired]: { label: "Retired", border: "rgba(74,95,122,.4)", color: "#4a5f7a" },
};

type SortField = "registrationPlate" | "type" | "status" | "createdAt";
type SortDir = "asc" | "desc";
type StatusFilter = "ALL" | VehicleStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Available", value: VehicleStatus.Available },
  { label: "In Use", value: VehicleStatus.InUse },
  { label: "Maintenance", value: VehicleStatus.Maintenance },
  { label: "Retired", value: VehicleStatus.Retired },
];

const COLS: { label: string; field: SortField | null }[] = [
  { label: "Plate", field: "registrationPlate" },
  { label: "Type", field: "type" },
  { label: "Status", field: "status" },
  { label: "Capacity", field: null },
  { label: "Depot", field: null },
  { label: "Created", field: "createdAt" },
];

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    getVehiclesAction().then(setVehicles).finally(() => setLoading(false));
  }, []);

  const filtered = vehicles
    .filter((v) => {
      const matchSearch = v.registrationPlate.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || v.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "registrationPlate") cmp = a.registrationPlate.localeCompare(b.registrationPlate);
      else if (sortField === "type") cmp = a.type.localeCompare(b.type);
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .veh-row:hover { background: rgba(255,255,255,.03); cursor: pointer; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
      `}</style>
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />
          <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
              <div>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>Fleet Management</p>
                <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>Vehicles</h1>
              </div>
              <button
                className="tm-btn-primary"
                onClick={() => router.push("/admin/vehicles/new")}
                style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: "pointer", background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent }}
              >
                + Add Vehicle
              </button>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
              <input
                className="tm-input"
                placeholder="Search by plate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", width: "260px", outline: "none", fontFamily: S.mono }}
              />
              <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                {STATUS_FILTERS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".3rem .75rem", borderRadius: 4, cursor: "pointer", border: `1px solid ${statusFilter === value ? "rgba(245,158,11,.4)" : S.border}`, background: statusFilter === value ? "rgba(245,158,11,.1)" : "transparent", color: statusFilter === value ? S.accent : S.muted }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <p style={{ fontFamily: S.mono, fontSize: ".875rem", color: S.muted }}>Loading...</p>
            ) : (
              <>
                <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${S.border}`, background: "rgba(255,255,255,.02)" }}>
                        {COLS.map(({ label, field }) => (
                          <th
                            key={label}
                            onClick={field ? () => toggleSort(field) : undefined}
                            style={{ padding: ".75rem 1rem", textAlign: "left", fontFamily: S.mono, fontSize: "9px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", fontWeight: 600, cursor: field ? "pointer" : "default", userSelect: "none" }}
                          >
                            {label}{field && sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: "3rem", textAlign: "center", fontFamily: S.mono, fontSize: ".875rem", color: S.dim }}>
                            {search || statusFilter !== "ALL" ? "No vehicles match your filters." : "No vehicles yet. Add one to get started."}
                          </td>
                        </tr>
                      ) : filtered.map((v) => {
                        const badge = STATUS_BADGE[v.status];
                        return (
                          <tr
                            key={v.id}
                            className="veh-row"
                            onClick={() => router.push(`/admin/vehicles/${v.id}`)}
                            style={{ borderBottom: `1px solid rgba(255,255,255,.04)`, transition: "background .15s" }}
                          >
                            <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontWeight: 700, color: S.text }}>{v.registrationPlate}</td>
                            <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontSize: ".8rem", color: S.muted }}>{v.type}</td>
                            <td style={{ padding: ".75rem 1rem" }}>
                              <span style={{ fontFamily: S.mono, fontSize: "9px", letterSpacing: ".1em", padding: ".2rem .5rem", borderRadius: 4, border: `1px solid ${badge.border}`, color: badge.color, textTransform: "uppercase" }}>
                                {badge.label}
                              </span>
                            </td>
                            <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>
                              {v.parcelCapacity} parcels · {v.weightCapacity} {v.weightUnit.toLowerCase()}
                            </td>
                            <td style={{ padding: ".75rem 1rem", fontSize: ".875rem", color: S.muted }}>{v.depot?.name ?? "—"}</td>
                            <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>{new Date(v.createdAt).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, marginTop: ".75rem", letterSpacing: ".06em" }}>
                  Showing {filtered.length} of {vehicles.length} vehicles
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
