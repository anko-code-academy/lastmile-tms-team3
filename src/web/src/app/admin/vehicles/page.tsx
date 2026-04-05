"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TmNavbar from "@/components/TmNavbar";
import { useSearchVehicles } from "@/lib/hooks/useVehicles";
import { useDepotNames } from "@/lib/hooks/useDepots";
import { VehicleStatus, VehicleType } from "@/lib/types/vehicle";
import type { VehicleFilter } from "@/lib/actions/vehicles";

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

const STATUS_BADGE: Record<
  VehicleStatus,
  { label: string; border: string; color: string }
> = {
  [VehicleStatus.Available]: {
    label: "Available",
    border: "rgba(34,197,94,.3)",
    color: "#22c55e",
  },
  [VehicleStatus.InUse]: {
    label: "In Use",
    border: "rgba(245,158,11,.3)",
    color: "#f59e0b",
  },
  [VehicleStatus.Maintenance]: {
    label: "Maintenance",
    border: "rgba(239,68,68,.3)",
    color: "#ef4444",
  },
  [VehicleStatus.Retired]: {
    label: "Retired",
    border: "rgba(74,95,122,.4)",
    color: "#4a5f7a",
  },
};

type SortKey = "registrationPlate" | "type" | "status" | "createdAt";
type SortDir = "asc" | "desc";

function getSortIndicator(isActive: boolean, direction: SortDir) {
  return isActive ? (direction === "asc" ? "↑" : "↓") : "↕";
}

const COLS: { label: string; sortKey: SortKey | null }[] = [
  { label: "Plate", sortKey: "registrationPlate" },
  { label: "Type", sortKey: "type" },
  { label: "Depot", sortKey: null },
  { label: "Capacity", sortKey: null },
  { label: "Status", sortKey: "status" },
  { label: "Created", sortKey: "createdAt" },
];

export default function VehiclesPage() {
  const router = useRouter();
  const [plateNumber, setPlateNumber] = useState("");
  const [depotId, setDepotId] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "">("");
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [after, setAfter] = useState<string | undefined>(undefined);
  const [before, setBefore] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<
    "forward" | "backward" | undefined
  >(undefined);
  const [sortColumn, setSortColumn] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [filters, setFilters] = useState<VehicleFilter>({});
  const [appliedSearch, setAppliedSearch] = useState("");

  const { data: depots } = useDepotNames();
  const { data, isLoading } = useSearchVehicles({
    filter: filters,
    search: appliedSearch || undefined,
    sortField: sortColumn,
    sortDirection: sortDir.toUpperCase() as "ASC" | "DESC",
    first: direction !== "backward" ? 20 : undefined,
    after: direction === "forward" ? after : undefined,
    last: direction === "backward" ? 20 : undefined,
    before: direction === "backward" ? before : undefined,
  });

  function buildFilter(): VehicleFilter {
    const f: VehicleFilter = {};
    if (depotId) f.depotId = { eq: depotId };
    if (status) f.status = { eq: status };
    if (vehicleType) f.type = { eq: vehicleType };
    return f;
  }

  function handleSearch() {
    setAppliedSearch(plateNumber.trim());
    setFilters(buildFilter());
    setAfter(undefined);
    setBefore(undefined);
    setDirection(undefined);
  }

  function handleClear() {
    setPlateNumber("");
    setDepotId("");
    setStatus("");
    setVehicleType("");
    setAppliedSearch("");
    setFilters({});
    setAfter(undefined);
    setBefore(undefined);
    setDirection(undefined);
    setSortColumn("createdAt");
    setSortDir("desc");
  }

  function handleSort(key: SortKey) {
    setAfter(undefined);
    setBefore(undefined);
    setDirection(undefined);

    if (sortColumn === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDir("asc");
    }
  }

  const vehicles = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasNext = data?.hasNextPage ?? false;
  const hasPrev = data?.hasPreviousPage ?? false;

  const displayCount = vehicles.length;

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .veh-row:hover { background: rgba(255,255,255,.03); cursor: pointer; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
        .tm-select { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .5rem .75rem; font-size: .875rem; width: 100%; outline: none; font-family: var(--font-geist-mono,monospace); }
        .tm-select:focus { border-color: rgba(245,158,11,.45); }
        .tm-select option { background: #0f1929; color: #e2e8f0; }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          background: S.bg,
          color: S.text,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            backgroundImage:
              "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />
          <div
            style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: "2rem",
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: S.mono,
                    fontSize: "10px",
                    letterSpacing: ".2em",
                    color: S.accent,
                    textTransform: "uppercase",
                    marginBottom: ".375rem",
                  }}
                >
                  Fleet Management
                </p>
                <h1
                  style={{
                    fontFamily: S.mono,
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: S.text,
                    letterSpacing: "-.02em",
                    lineHeight: 1,
                  }}
                >
                  Vehicles
                </h1>
              </div>
              <button
                onClick={() => router.push("/admin/vehicles/new")}
                style={{
                  fontFamily: S.mono,
                  fontSize: "11px",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  padding: ".45rem .9rem",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: "rgba(245,158,11,.12)",
                  border: "1px solid rgba(245,158,11,.35)",
                  color: S.accent,
                }}
              >
                + Add Vehicle
              </button>
            </div>

            {/* Filter bar */}
            <div
              style={{
                background: S.panel,
                border: `1px solid ${S.border}`,
                borderRadius: 10,
                padding: "1.25rem 1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: ".75rem",
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: S.mono,
                      fontSize: "10px",
                      letterSpacing: ".14em",
                      color: S.muted,
                      textTransform: "uppercase",
                      marginBottom: ".4rem",
                    }}
                  >
                    Plate
                  </label>
                  <input
                    className="tm-input"
                    placeholder="Prefix match..."
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    style={{
                      background: S.inputBg,
                      border: `1px solid ${S.inputBorder}`,
                      color: S.text,
                      borderRadius: 6,
                      padding: ".5rem .75rem",
                      fontSize: ".875rem",
                      width: "180px",
                      outline: "none",
                      fontFamily: S.mono,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: S.mono,
                      fontSize: "10px",
                      letterSpacing: ".14em",
                      color: S.muted,
                      textTransform: "uppercase",
                      marginBottom: ".4rem",
                    }}
                  >
                    Depot
                  </label>
                  <select
                    className="tm-select"
                    value={depotId}
                    onChange={(e) => setDepotId(e.target.value)}
                    style={{ width: "180px" }}
                  >
                    <option value="">All</option>
                    {depots?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: S.mono,
                      fontSize: "10px",
                      letterSpacing: ".14em",
                      color: S.muted,
                      textTransform: "uppercase",
                      marginBottom: ".4rem",
                    }}
                  >
                    Status
                  </label>
                  <select
                    className="tm-select"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as VehicleStatus | "")
                    }
                    style={{ width: "150px" }}
                  >
                    <option value="">All</option>
                    <option value={VehicleStatus.Available}>Available</option>
                    <option value={VehicleStatus.InUse}>In Use</option>
                    <option value={VehicleStatus.Maintenance}>
                      Maintenance
                    </option>
                    <option value={VehicleStatus.Retired}>Retired</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: S.mono,
                      fontSize: "10px",
                      letterSpacing: ".14em",
                      color: S.muted,
                      textTransform: "uppercase",
                      marginBottom: ".4rem",
                    }}
                  >
                    Type
                  </label>
                  <select
                    className="tm-select"
                    value={vehicleType}
                    onChange={(e) =>
                      setVehicleType(e.target.value as VehicleType | "")
                    }
                    style={{ width: "130px" }}
                  >
                    <option value="">All</option>
                    <option value={VehicleType.Van}>Van</option>
                    <option value={VehicleType.Car}>Car</option>
                    <option value={VehicleType.Bike}>Bike</option>
                  </select>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: ".5rem" }}>
                  <button
                    onClick={handleSearch}
                    style={{
                      fontFamily: S.mono,
                      fontSize: "11px",
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      padding: ".5rem 1rem",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: "rgba(245,158,11,.12)",
                      border: `1px solid rgba(245,158,11,.35)`,
                      color: S.accent,
                    }}
                  >
                    Search
                  </button>
                  <button
                    onClick={handleClear}
                    style={{
                      fontFamily: S.mono,
                      fontSize: "11px",
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      padding: ".5rem 1rem",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: "transparent",
                      border: `1px solid ${S.border}`,
                      color: S.muted,
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <p
                style={{
                  fontFamily: S.mono,
                  fontSize: ".875rem",
                  color: S.muted,
                }}
              >
                Loading...
              </p>
            ) : (
              <>
                <div
                  style={{
                    background: S.panel,
                    border: `1px solid ${S.border}`,
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: `1px solid ${S.border}`,
                          background: "rgba(255,255,255,.02)",
                        }}
                      >
                        {COLS.map(({ label, sortKey }) => (
                          <th
                            key={label}
                            onClick={
                              sortKey ? () => handleSort(sortKey) : undefined
                            }
                            style={{
                              padding: ".75rem 1rem",
                              textAlign: "left",
                              fontFamily: S.mono,
                              fontSize: "9px",
                              letterSpacing: ".14em",
                              color:
                                sortKey && sortColumn === sortKey
                                  ? S.accent
                                  : S.muted,
                              textTransform: "uppercase",
                              fontWeight: 600,
                              cursor: sortKey ? "pointer" : "default",
                              userSelect: "none",
                            }}
                          >
                            {label}
                            {sortKey
                              ? ` ${getSortIndicator(sortColumn === sortKey, sortDir)}`
                              : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              padding: "3rem",
                              textAlign: "center",
                              fontFamily: S.mono,
                              fontSize: ".875rem",
                              color: S.dim,
                            }}
                          >
                            No vehicles found.
                          </td>
                        </tr>
                      ) : (
                        vehicles.map((v) => {
                          const badge = STATUS_BADGE[v.status];
                          return (
                            <tr
                              key={v.id}
                              className="veh-row"
                              onClick={() =>
                                router.push(`/admin/vehicles/${v.id}`)
                              }
                              style={{
                                borderBottom: `1px solid rgba(255,255,255,.04)`,
                                transition: "background .15s",
                              }}
                            >
                              <td
                                style={{
                                  padding: ".75rem 1rem",
                                  fontFamily: S.mono,
                                  fontWeight: 700,
                                  color: S.text,
                                }}
                              >
                                {v.registrationPlate}
                              </td>
                              <td
                                style={{
                                  padding: ".75rem 1rem",
                                  fontFamily: S.mono,
                                  fontSize: ".8rem",
                                  color: S.muted,
                                }}
                              >
                                {v.type}
                              </td>
                              <td
                                style={{
                                  padding: ".75rem 1rem",
                                  fontSize: ".875rem",
                                  color: S.muted,
                                }}
                              >
                                {v.depot?.name ?? "—"}
                              </td>
                              <td
                                style={{
                                  padding: ".75rem 1rem",
                                  fontFamily: S.mono,
                                  fontSize: ".8rem",
                                  color: S.dim,
                                }}
                              >
                                {v.parcelCapacity} parcels · {v.weightCapacity}{" "}
                                {v.weightUnit.toLowerCase()}
                              </td>
                              <td style={{ padding: ".75rem 1rem" }}>
                                <span
                                  style={{
                                    fontFamily: S.mono,
                                    fontSize: "9px",
                                    letterSpacing: ".1em",
                                    padding: ".2rem .5rem",
                                    borderRadius: 4,
                                    border: `1px solid ${badge.border}`,
                                    color: badge.color,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {badge.label}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: ".75rem 1rem",
                                  fontFamily: S.mono,
                                  fontSize: ".8rem",
                                  color: S.dim,
                                }}
                              >
                                {new Date(v.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination + count */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1rem",
                  }}
                >
                  <p
                    style={{
                      fontFamily: S.mono,
                      fontSize: "10px",
                      color: S.dim,
                      letterSpacing: ".06em",
                    }}
                  >
                    {displayCount} out of {totalCount} vehicle
                    {totalCount !== 1 ? "s" : ""}
                  </p>
                  <div style={{ display: "flex", gap: ".5rem" }}>
                    <button
                      onClick={() => {
                        if (!hasPrev) return;
                        setBefore(data?.previousCursor ?? undefined);
                        setAfter(undefined);
                        setDirection("backward");
                      }}
                      disabled={!hasPrev}
                      style={{
                        fontFamily: S.mono,
                        fontSize: "11px",
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        padding: ".4rem .9rem",
                        borderRadius: 6,
                        cursor: hasPrev ? "pointer" : "not-allowed",
                        opacity: hasPrev ? 1 : 0.4,
                        background: "transparent",
                        border: `1px solid ${S.border}`,
                        color: S.muted,
                      }}
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => {
                        if (!hasNext) return;
                        setAfter(data?.nextCursor ?? undefined);
                        setBefore(undefined);
                        setDirection("forward");
                      }}
                      disabled={!hasNext}
                      style={{
                        fontFamily: S.mono,
                        fontSize: "11px",
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        padding: ".4rem .9rem",
                        borderRadius: 6,
                        cursor: hasNext ? "pointer" : "not-allowed",
                        opacity: hasNext ? 1 : 0.4,
                        background: "transparent",
                        border: `1px solid ${S.border}`,
                        color: S.muted,
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
