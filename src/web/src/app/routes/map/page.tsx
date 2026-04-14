"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import TmNavbar from "@/components/TmNavbar";
import RouteStatusBadge from "@/components/routes/RouteStatusBadge";
import RoutesOverviewMap from "@/components/routes/RoutesOverviewMap";
import { getRoutesForMapAction } from "@/lib/actions/routes";
import { useDriverPositions } from "@/lib/hooks/useDriverPositions";
import type { RouteMapData } from "@/lib/types/route";
import { RouteStatus } from "@/lib/types/route";

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)" as const,
  text: "#e2e8f0" as const,
  muted: "#4a5f7a" as const,
  accent: "#f59e0b" as const,
  inputBg: "rgba(255,255,255,.05)" as const,
  inputBorder: "rgba(255,255,255,.1)" as const,
};

const STATUS_COLORS: Record<RouteStatus, string> = {
  [RouteStatus.Draft]: "#94a3b8",
  [RouteStatus.Dispatched]: "#3b82f6",
  [RouteStatus.InProgress]: "#f59e0b",
  [RouteStatus.Completed]: "#22c55e",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RouteMapPage() {
  const [date, setDate] = useState(todayStr());
  const [routes, setRoutes] = useState<RouteMapData[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeIds = routes.map((r) => r.id);
  const driverPositions = useDriverPositions(routeIds);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoutes() {
      const result = await getRoutesForMapAction(date);
      if (cancelled) return;
      if (result.error) {
        setLoading(false);
        setError(result.error);
        setRoutes([]);
      } else {
        setLoading(false);
        setError(null);
        setRoutes(result.routes ?? []);
        setSelectedRouteId(null);
      }
    }

    setLoading(true);
    fetchRoutes();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const routesWithStops = useMemo(() => routes.filter((r) => r.stops.length > 0), [routes]);
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .sidebar-route:hover { background: rgba(255,255,255,.04); }
        .sidebar-route.tm-selected { background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.2) !important; }
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
          <div style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem 1.5rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <Link
                  href="/routes"
                  style={{ color: S.muted, fontSize: ".875rem", textDecoration: "none" }}
                >
                  &larr; Back to Routes
                </Link>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, marginTop: ".25rem" }}>
                  Route Map
                </h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                <label style={{ fontSize: ".75rem", color: S.muted }}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="tm-input"
                  style={{
                    background: S.inputBg,
                    border: `1px solid ${S.inputBorder}`,
                    borderRadius: 6,
                    padding: ".45rem .75rem",
                    color: S.text,
                    fontSize: ".875rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginBottom: "1rem", padding: ".75rem", borderRadius: 6, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444", fontSize: ".85rem" }}>
                {error}
              </div>
            )}

            {/* Layout: Sidebar + Map */}
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem" }}>
              {/* Sidebar */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Route list */}
                <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: ".75rem 1rem", borderBottom: `1px solid rgba(255,255,255,.08)`, background: "rgba(255,255,255,.025)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: ".875rem" }}>Routes</span>
                    <span style={{ fontSize: ".75rem", color: S.muted }}>{routes.length} total</span>
                  </div>
                  <div style={{ maxHeight: 400, overflow: "auto" }}>
                    {loading ? (
                      <div style={{ padding: "1.5rem", textAlign: "center", color: S.muted, fontSize: ".85rem" }}>
                        Loading...
                      </div>
                    ) : routes.length === 0 ? (
                      <div style={{ padding: "1.5rem", textAlign: "center", color: S.muted, fontSize: ".85rem" }}>
                        No routes for this date
                      </div>
                    ) : (
                      routes.map((route) => {
                        const isSelected = route.id === selectedRouteId;
                        return (
                          <div
                            key={route.id}
                            className={`sidebar-route${isSelected ? " tm-selected" : ""}`}
                            onClick={() => setSelectedRouteId(isSelected ? null : route.id)}
                            style={{
                              padding: ".6rem 1rem",
                              borderBottom: `1px solid ${S.border}`,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: ".75rem",
                            }}
                          >
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: STATUS_COLORS[route.status] ?? "#94a3b8",
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: ".8rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {route.name}
                              </div>
                              <div style={{ fontSize: ".7rem", color: S.muted }}>
                                {route.stops.length} stops
                                {route.driverName ? ` \u00b7 ${route.driverName}` : ""}
                              </div>
                            </div>
                            <RouteStatusBadge status={route.status} />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Selected route details */}
                {selectedRoute && (
                  <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1rem" }}>
                    <h3 style={{ fontSize: ".875rem", fontWeight: 600, margin: 0, marginBottom: ".5rem" }}>
                      {selectedRoute.name}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                      <div style={{ fontSize: ".75rem" }}>
                        <span style={{ color: S.muted }}>Driver:</span>{" "}
                        {selectedRoute.driverName ?? "\u2014"}
                      </div>
                      <div style={{ fontSize: ".75rem" }}>
                        <span style={{ color: S.muted }}>Vehicle:</span>{" "}
                        {selectedRoute.vehiclePlate ?? "\u2014"}
                      </div>
                      <div style={{ fontSize: ".75rem" }}>
                        <span style={{ color: S.muted }}>Depot:</span>{" "}
                        {selectedRoute.depot?.name ?? "\u2014"}
                      </div>
                      <div style={{ fontSize: ".75rem" }}>
                        <span style={{ color: S.muted }}>Stops:</span>{" "}
                        {selectedRoute.stops.length}
                      </div>
                    </div>
                    <Link
                      href={`/routes/${selectedRoute.id}`}
                      style={{
                        display: "inline-block",
                        marginTop: ".75rem",
                        fontSize: ".75rem",
                        color: S.accent,
                        textDecoration: "none",
                      }}
                    >
                      View route details &rarr;
                    </Link>
                  </div>
                )}

                {/* Legend */}
                <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: ".75rem 1rem" }}>
                  <div style={{ fontSize: ".7rem", fontWeight: 600, color: S.muted, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".5rem" }}>
                    Legend
                  </div>
                  {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <div key={status} style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".25rem" }}>
                      <div style={{ width: 12, height: 3, borderRadius: 2, background: color }} />
                      <span style={{ fontSize: ".75rem", color: S.text }}>
                        {status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map */}
              <div>
                {loading ? (
                  <div
                    style={{
                      height: 500,
                      borderRadius: 8,
                      border: `1px solid ${S.border}`,
                      background: S.panel,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: S.muted,
                      fontSize: ".85rem",
                    }}
                  >
                    Loading map...
                  </div>
                ) : (
                  <RoutesOverviewMap
                    routes={routesWithStops}
                    selectedRouteId={selectedRouteId}
                    onRouteSelected={setSelectedRouteId}
                    driverPositions={driverPositions}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
