"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import TmNavbar from "@/components/TmNavbar";
import RouteStatusBadge from "@/components/routes/RouteStatusBadge";
import { useSearchRoutes } from "@/lib/hooks/useRoutes";
import { deleteRouteAction } from "@/lib/actions/routes";
import { RouteStatus } from "@/lib/types/route";
import type { RouteFilter } from "@/lib/actions/routes";

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)" as const,
  text: "#e2e8f0" as const,
  muted: "#4a5f7a" as const,
  accent: "#f59e0b" as const,
  red: "#ef4444" as const,
  inputBg: "rgba(255,255,255,.05)" as const,
  inputBorder: "rgba(255,255,255,.1)" as const,
};

type SortKey = "date" | "status" | "createdAt";
type SortDir = "asc" | "desc";

const COLS: { label: string; sortKey: SortKey | null }[] = [
  { label: "Date", sortKey: "date" },
  { label: "Depot", sortKey: null },
  { label: "Zone", sortKey: null },
  { label: "Driver", sortKey: null },
  { label: "Vehicle", sortKey: null },
  { label: "Parcels", sortKey: null },
  { label: "Stops", sortKey: null },
  { label: "Status", sortKey: "status" },
  { label: "Created", sortKey: "createdAt" },
  { label: "", sortKey: null },
];

export default function RoutesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<RouteStatus | "">("");
  const [after, setAfter] = useState<string | undefined>(undefined);
  const [before, setBefore] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<"forward" | "backward" | undefined>(undefined);
  const [sortColumn, setSortColumn] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState<string | null>(null);

  const [filters, setFilters] = useState<RouteFilter>({});

  const { data, isLoading, error: queryError } = useSearchRoutes({
    filter: filters,
    sortField: sortColumn,
    sortDirection: sortDir.toUpperCase() as "ASC" | "DESC",
    first: direction !== "backward" ? 20 : undefined,
    after: direction === "forward" ? after : undefined,
    last: direction === "backward" ? 20 : undefined,
    before: direction === "backward" ? before : undefined,
  });

  const handleDelete = useCallback(async (e: React.MouseEvent, routeId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this draft route?")) return;
    setDeleting(routeId);
    const result = await deleteRouteAction(routeId);
    setDeleting(null);
    if (result.error) {
      alert(result.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    }
  }, [queryClient]);

  function handleSearch() {
    const f: RouteFilter = {};
    if (statusFilter) f.status = { eq: statusFilter };
    setFilters(f);
    setAfter(undefined);
    setBefore(undefined);
    setDirection(undefined);
  }

  function handleClear() {
    setStatusFilter("");
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

  function getSortIndicator(key: SortKey) {
    if (sortColumn !== key) return "\u2195";
    return sortDir === "asc" ? "\u2191" : "\u2193";
  }

  const routes = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasNext = data?.hasNextPage ?? false;
  const hasPrev = data?.hasPreviousPage ?? false;

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .rt-row:hover { background: rgba(255,255,255,.03); cursor: pointer; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
        .tm-select { background: #0d1424; border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .5rem .75rem; font-size: .875rem; width: 100%; outline: none; font-family: var(--font-geist-mono,monospace); }
        .tm-select:focus { border-color: rgba(245,158,11,.45); }
        .tm-select option { background: #0d1424; color: #e2e8f0; }
        .del-btn:hover { opacity: 1 !important; }
      `}</style>
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 0,
            backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />
          <div style={{ maxWidth: 1300, margin: "0 auto", padding: "2rem 1.5rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Delivery Routes</h1>
                <p style={{ color: S.muted, fontSize: ".875rem", marginTop: 4 }}>
                  {totalCount} route{totalCount !== 1 ? "s" : ""} total
                </p>
              </div>
              <Link
                href="/routes/new"
                style={{
                  padding: ".5rem 1.25rem",
                  borderRadius: 6,
                  background: "rgba(245,158,11,.12)",
                  border: "1px solid rgba(245,158,11,.3)",
                  color: S.accent,
                  fontWeight: 600,
                  fontSize: ".875rem",
                  textDecoration: "none",
                }}
              >
                + New Route
              </Link>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: ".75rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: ".75rem", color: S.muted, marginBottom: 4 }}>Status</label>
                <select
                  className="tm-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as RouteStatus | "")}
                  style={{ width: 160 }}
                >
                  <option value="">All Statuses</option>
                  {Object.values(RouteStatus).map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSearch}
                className="tm-btn-primary"
                style={{
                  padding: ".5rem 1rem",
                  borderRadius: 6,
                  background: "rgba(245,158,11,.1)",
                  border: "1px solid rgba(245,158,11,.3)",
                  color: S.accent,
                  fontWeight: 600,
                  fontSize: ".875rem",
                  cursor: "pointer",
                }}
              >
                Search
              </button>
              <button
                onClick={handleClear}
                style={{
                  padding: ".5rem 1rem",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${S.border}`,
                  color: S.muted,
                  fontSize: ".875rem",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>

            {/* Error */}
            {queryError && (
              <div style={{ marginBottom: "1rem", padding: ".75rem", borderRadius: 6, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: S.red, fontSize: ".85rem" }}>
                {queryError.message}
              </div>
            )}

            {/* Table */}
            <div style={{ border: `1px solid ${S.border}`, borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                    {COLS.map((col) => (
                      <th
                        key={col.label}
                        onClick={col.sortKey ? () => handleSort(col.sortKey as SortKey) : undefined}
                        style={{
                          padding: ".75rem 1rem",
                          textAlign: "left",
                          fontSize: ".75rem",
                          fontWeight: 600,
                          color: S.muted,
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                          cursor: col.sortKey ? "pointer" : "default",
                          userSelect: "none",
                        }}
                      >
                        {col.label} {col.sortKey ? getSortIndicator(col.sortKey) : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={COLS.length} style={{ padding: "2rem", textAlign: "center", color: S.muted }}>
                        Loading...
                      </td>
                    </tr>
                  ) : routes.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length} style={{ padding: "2rem", textAlign: "center", color: S.muted }}>
                        No routes found
                      </td>
                    </tr>
                  ) : (
                    routes.map((route) => (
                      <tr
                        key={route.id}
                        className="rt-row"
                        style={{ borderBottom: `1px solid ${S.border}` }}
                        onClick={() => router.push(`/routes/${route.id}`)}
                      >
                        <td style={{ padding: ".75rem 1rem", fontSize: "11px", fontFamily: "var(--font-geist-mono,monospace)", color: "#647a96", letterSpacing: ".04em" }}>
                          {route.date}
                        </td>
                        <td style={{ padding: ".75rem 1rem", fontSize: "12px", fontFamily: "var(--font-geist-mono,monospace)", color: "#38bdf8" }}>
                          {route.depot?.name ?? "\u2014"}
                        </td>
                        <td style={{ padding: ".75rem 1rem", fontSize: "12px", fontFamily: "var(--font-geist-mono,monospace)", color: "#38bdf8" }}>
                          {route.zoneName ?? "\u2014"}
                        </td>
                        <td style={{ padding: ".75rem 1rem", fontSize: "13px", color: "#93c5fd" }}>
                          {route.driverName ?? "\u2014"}
                        </td>
                        <td style={{ padding: ".75rem 1rem", fontSize: "13px", fontFamily: "var(--font-geist-mono,monospace)", fontWeight: 700, color: "#f59e0b" }}>
                          {route.vehiclePlate ?? "\u2014"}
                        </td>
                        <td style={{ padding: ".75rem 1rem", fontSize: "12px", fontFamily: "var(--font-geist-mono,monospace)", color: "#6ee7b7", textAlign: "center" }}>
                          {route.parcelCount}
                        </td>
                        <td style={{ padding: ".75rem 1rem", fontSize: "12px", fontFamily: "var(--font-geist-mono,monospace)", color: "#6ee7b7", textAlign: "center" }}>
                          {route.estimatedStops}
                        </td>
                        <td style={{ padding: ".75rem 1rem" }}>
                          <RouteStatusBadge status={route.status} />
                        </td>
                        <td style={{ padding: ".75rem 1rem", fontSize: "11px", fontFamily: "var(--font-geist-mono,monospace)", color: "#647a96", letterSpacing: ".04em" }}>
                          {new Date(route.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: ".5rem .5rem", textAlign: "center" }}>
                          {route.status === "DRAFT" && (
                            <button
                              className="del-btn"
                              onClick={(e) => handleDelete(e, route.id)}
                              disabled={deleting === route.id}
                              title="Delete draft route"
                              style={{
                                background: "none",
                                border: "none",
                                color: S.red,
                                cursor: deleting === route.id ? "not-allowed" : "pointer",
                                fontSize: ".8rem",
                                opacity: deleting === route.id ? 0.4 : 0.5,
                                padding: ".25rem",
                                borderRadius: 3,
                              }}
                            >
                              {"\u2715"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
              <span style={{ fontSize: ".8rem", color: S.muted }}>
                Showing {routes.length} of {totalCount}
              </span>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <button
                  disabled={!hasPrev}
                  onClick={() => {
                    setBefore(data?.previousCursor ?? undefined);
                    setAfter(undefined);
                    setDirection("backward");
                  }}
                  style={{
                    padding: ".4rem .75rem",
                    borderRadius: 4,
                    background: hasPrev ? "rgba(255,255,255,.05)" : "transparent",
                    border: `1px solid ${S.border}`,
                    color: hasPrev ? S.text : S.muted,
                    cursor: hasPrev ? "pointer" : "default",
                    fontSize: ".8rem",
                  }}
                >
                  {"\u2190"} Prev
                </button>
                <button
                  disabled={!hasNext}
                  onClick={() => {
                    setAfter(data?.nextCursor ?? undefined);
                    setBefore(undefined);
                    setDirection("forward");
                  }}
                  style={{
                    padding: ".4rem .75rem",
                    borderRadius: 4,
                    background: hasNext ? "rgba(255,255,255,.05)" : "transparent",
                    border: `1px solid ${S.border}`,
                    color: hasNext ? S.text : S.muted,
                    cursor: hasNext ? "pointer" : "default",
                    fontSize: ".8rem",
                  }}
                >
                  Next {"\u2192"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
