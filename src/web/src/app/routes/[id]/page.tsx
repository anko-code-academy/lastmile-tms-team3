"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import TmNavbar from "@/components/TmNavbar";
import RouteStatusBadge from "@/components/routes/RouteStatusBadge";
import RouteMap from "@/components/routes/RouteMap";
import SortableStopList from "@/components/routes/SortableStopList";
import {
  getRouteAction,
  assignDriverToRouteAction,
  assignVehicleToRouteAction,
  unassignDriverFromRouteAction,
  unassignVehicleFromRouteAction,
  deleteRouteAction,
  addParcelsToRouteAction,
  removeParcelFromRouteAction,
  autoAssignParcelsAction,
  getAvailableDriversAction,
  optimizeRouteStopsAction,
  reorderRouteStopsAction,
  dispatchRouteAction,
} from "@/lib/actions/routes";
import { useSearchVehicles } from "@/lib/hooks/useVehicles";
import { graphql } from "@/lib/api/graphql";
import type {
  DeliveryRoute,
  AvailableDriver,
} from "@/lib/types/route";
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
  red: "#ef4444" as const,
  green: "#22c55e" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

const selectStyle: React.CSSProperties = {
  background: S.inputBg,
  border: `1px solid ${S.inputBorder}`,
  color: S.text,
  borderRadius: 6,
  padding: ".5rem .75rem",
  fontSize: ".875rem",
  width: "100%",
  outline: "none",
};

interface StagedParcel {
  id: string;
  trackingNumber: string;
  routeAssignments: { routeId: string }[];
}

export default function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [routeId, setRouteId] = useState<string>("");
  const [route, setRoute] = useState<DeliveryRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assignment state
  const [availableDrivers, setAvailableDrivers] = useState<AvailableDriver[]>(
    []
  );
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Parcel assignment state
  const [stagedParcels, setStagedParcels] = useState<StagedParcel[]>([]);
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(
    new Set()
  );
  const [parcelLoading, setParcelLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Vehicles
  const { data: vehiclesData } = useSearchVehicles({
    sortField: "registrationPlate",
    sortDirection: "ASC",
    first: 100,
  });
  const availableVehicles =
    vehiclesData?.items?.filter((v) => v.status === "AVAILABLE") ?? [];

  // Resolve params and load route data
  const loadRoute = useCallback(async () => {
    if (!routeId) return;
    const data = await getRouteAction(routeId);
    setRoute(data);
  }, [routeId]);

  useEffect(() => {
    params.then((p) => setRouteId(p.id));
  }, [params]);

  useEffect(() => {
    if (!routeId) return;
    let cancelled = false;
    getRouteAction(routeId).then((data) => {
      if (!cancelled) {
        setRoute(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [routeId]);

  // Load available drivers when route is loaded
  useEffect(() => {
    if (!route) return;
    let cancelled = false;
    getAvailableDriversAction(route.date).then((result) => {
      if (!cancelled && result.drivers) {
        setAvailableDrivers(result.drivers);
      }
    });
    return () => { cancelled = true; };
  }, [route?.date]);

  // Load staged parcels when route is loaded (for draft routes)
  useEffect(() => {
    if (!route || route.status !== RouteStatus.Draft || !route.zoneId) {
      return;
    }

    let cancelled = false;
    const GET_STAGED_PARCELS = `
      query GetStagedParcels($first: Int, $where: ParcelFilterInput) {
        parcels(first: $first, where: $where) {
          nodes {
            id
            trackingNumber
            routeAssignments {
              routeId
            }
          }
        }
      }
    `;

    graphql<{ parcels: { nodes: StagedParcel[] } }>(GET_STAGED_PARCELS, {
      first: 50,
      where: {
        status: { eq: "SORTED" },
        zoneId: { eq: route.zoneId },
      },
    })
      .then((data) => {
        if (!cancelled) {
          setStagedParcels(
            data.parcels.nodes.filter(
              (p: StagedParcel) => p.routeAssignments.length === 0
            )
          );
        }
      })
      .catch(() => { if (!cancelled) setStagedParcels([]); });
    return () => { cancelled = true; };
  }, [route?.id, route?.status, route?.zoneId]);

  // Driver assignment
  async function handleAssignDriver() {
    if (!routeId || !selectedDriverId) return;
    setAssigning(true);
    setError(null);
    const result = await assignDriverToRouteAction({
      routeId,
      driverId: selectedDriverId,
    });
    setAssigning(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSelectedDriverId("");
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      await loadRoute();
    }
  }

  async function handleUnassignDriver() {
    if (!routeId) return;
    setAssigning(true);
    setError(null);
    const result = await unassignDriverFromRouteAction({ routeId });
    setAssigning(false);
    if (result.error) {
      setError(result.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      await loadRoute();
    }
  }

  // Vehicle assignment
  async function handleAssignVehicle() {
    if (!routeId || !selectedVehicleId) return;
    setAssigning(true);
    setError(null);
    const result = await assignVehicleToRouteAction({
      routeId,
      vehicleId: selectedVehicleId,
    });
    setAssigning(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSelectedVehicleId("");
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      await loadRoute();
    }
  }

  async function handleUnassignVehicle() {
    if (!routeId) return;
    setAssigning(true);
    setError(null);
    const result = await unassignVehicleFromRouteAction({ routeId });
    setAssigning(false);
    if (result.error) {
      setError(result.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      await loadRoute();
    }
  }

  // Delete
  async function handleDelete() {
    if (!routeId || !confirm("Delete this draft route?")) return;
    const result = await deleteRouteAction(routeId);
    if (result.error) {
      setError(result.error);
    } else {
      await queryClient.invalidateQueries({ queryKey: ["routes"] });
      router.push("/routes");
    }
  }

  // Parcel actions
  async function handleAutoAssign() {
    if (!routeId) return;
    setParcelLoading(true);
    setError(null);
    const result = await autoAssignParcelsAction(routeId);
    setParcelLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      await loadRoute();
    }
  }

  async function handleAddSelected() {
    if (!routeId || selectedParcelIds.size === 0) return;
    setParcelLoading(true);
    setError(null);
    const result = await addParcelsToRouteAction({
      routeId,
      parcelIds: Array.from(selectedParcelIds),
    });
    setParcelLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSelectedParcelIds(new Set());
      await loadRoute();
    }
  }

  async function handleRemoveParcel(parcelId: string) {
    if (!routeId) return;
    setParcelLoading(true);
    setError(null);
    const result = await removeParcelFromRouteAction({ routeId, parcelId });
    setParcelLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      await loadRoute();
    }
  }

  function toggleParcel(parcelId: string) {
    setSelectedParcelIds((prev) => {
      const next = new Set(prev);
      if (next.has(parcelId)) next.delete(parcelId);
      else next.add(parcelId);
      return next;
    });
  }

  async function handleOptimize() {
    if (!routeId) return;
    setOptimizing(true);
    setError(null);
    const result = await optimizeRouteStopsAction(routeId);
    setOptimizing(false);
    if (result.error) {
      setError(result.error);
    } else {
      await loadRoute();
    }
  }

  async function handleReorder(
    newOrder: { parcelId: string; stopOrder: number }[]
  ) {
    if (!routeId) return;
    setError(null);
    const result = await reorderRouteStopsAction({ routeId, newOrder });
    if (result.error) {
      setError(result.error);
    }
    // Don't reload — the SortableStopList manages local state optimistically
  }

  async function handleDispatch() {
    if (!routeId || !route) return;
    if (
      !confirm(
        `Dispatch route "${route.name}"?\n\nThis will lock the route and transition all parcels to Out for Delivery.`
      )
    )
      return;
    setDispatching(true);
    setError(null);
    const result = await dispatchRouteAction(routeId);
    setDispatching(false);
    if (result.error) {
      setError(result.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      await loadRoute();
    }
  }

  const isDraft = route?.status === RouteStatus.Draft;
  const assignedParcels = route?.routeParcels ?? [];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: S.bg,
          color: S.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!route) {
    return (
      <>
        <TmNavbar />
        <div
          style={{
            minHeight: "100vh",
            background: S.bg,
            color: S.text,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
          }}
        >
          <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Route not found
          </p>
          <Link
            href="/routes"
            style={{ color: S.accent, fontSize: ".875rem" }}
          >
            &larr; Back to Routes
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .tm-select { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .5rem .75rem; font-size: .875rem; width: 100%; outline: none; }
        .tm-select:focus { border-color: rgba(245,158,11,.45); }
        .tm-select option { background: #0f1929; color: #e2e8f0; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
        .parcel-row:hover { background: rgba(255,255,255,.03); }
        .parcel-row:hover .remove-btn { opacity: 1 !important; }
        .assign-section:hover { border-color: rgba(255,255,255,.12) !important; }
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
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              padding: "2rem 1.5rem",
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: "1.5rem" }}>
              <Link
                href="/routes"
                style={{
                  color: S.muted,
                  fontSize: ".875rem",
                  textDecoration: "none",
                }}
              >
                &larr; Back to Routes
              </Link>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: ".5rem",
                }}
              >
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
                  {route.name}
                </h1>
                <RouteStatusBadge status={route.status} />
              </div>
            </div>

            {/* Route Summary */}
            <div
              style={{
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                padding: "1rem 1.5rem",
                marginBottom: "1.5rem",
                display: "flex",
                gap: "2rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <span style={{ color: S.muted, fontSize: ".75rem" }}>Date</span>
                <br />
                <span style={{ fontFamily: S.mono }}>{route.date}</span>
              </div>
              <div>
                <span style={{ color: S.muted, fontSize: ".75rem" }}>Depot</span>
                <br />
                {route.depot?.name ?? "\u2014"}
              </div>
              <div>
                <span style={{ color: S.muted, fontSize: ".75rem" }}>Zone</span>
                <br />
                {route.zoneName ?? "\u2014"}
              </div>
              <div>
                <span style={{ color: S.muted, fontSize: ".75rem" }}>
                  Parcels
                </span>
                <br />
                <strong>{route.parcelCount}</strong> ({route.estimatedStops}{" "}
                stops)
              </div>
              {route.estimatedDistance != null && (
                <div>
                  <span style={{ color: S.muted, fontSize: ".75rem" }}>
                    Distance
                  </span>
                  <br />
                  <span style={{ fontFamily: S.mono, fontSize: ".85rem" }}>
                    {(route.estimatedDistance / 1000).toFixed(1)} km
                  </span>
                </div>
              )}
              {route.estimatedDuration != null && (
                <div>
                  <span style={{ color: S.muted, fontSize: ".75rem" }}>
                    Est. Duration
                  </span>
                  <br />
                  <span style={{ fontFamily: S.mono, fontSize: ".85rem" }}>
                    {Math.round(route.estimatedDuration / 60)} min
                  </span>
                </div>
              )}
              <div>
                <span style={{ color: S.muted, fontSize: ".75rem" }}>
                  Created
                </span>
                <br />
                <span style={{ fontSize: ".85rem" }}>
                  {new Date(route.createdAt).toLocaleDateString()}
                </span>
              </div>
              {route.lastModifiedAt && (
                <div>
                  <span style={{ color: S.muted, fontSize: ".75rem" }}>
                    Last Modified
                  </span>
                  <br />
                  <span style={{ fontSize: ".85rem" }}>
                    {new Date(route.lastModifiedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Driver & Vehicle Assignment */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {/* Driver Assignment */}
              <div
                className="assign-section"
                style={{
                  border: `1px solid ${S.border}`,
                  borderRadius: 8,
                  padding: "1.25rem",
                }}
              >
                <h3
                  style={{
                    fontSize: ".875rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: ".5rem",
                  }}
                >
                  <span style={{ color: S.muted, fontSize: ".65rem" }}>
                    DRIVER
                  </span>
                </h3>

                {route.driverName ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: ".5rem",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {route.driverName}
                      </span>
                      {isDraft && (
                        <button
                          onClick={handleUnassignDriver}
                          disabled={assigning}
                          style={{
                            background: "none",
                            border: `1px solid rgba(239,68,68,.3)`,
                            color: S.red,
                            fontSize: ".7rem",
                            padding: ".25rem .5rem",
                            borderRadius: 4,
                            cursor: assigning ? "not-allowed" : "pointer",
                            opacity: assigning ? 0.5 : 1,
                          }}
                        >
                          Unassign
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: S.muted, fontSize: ".85rem" }}>
                    No driver assigned
                  </span>
                )}

                {isDraft && (
                  <div
                    style={{
                      marginTop: ".75rem",
                      display: "flex",
                      gap: ".5rem",
                    }}
                  >
                    <select
                      className="tm-select"
                      style={{ ...selectStyle, flex: 1 }}
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                    >
                      <option value="">
                        -- Select Driver --
                      </option>
                      {availableDrivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName}{" "}
                          {d.routeCount > 0
                            ? `(${d.routeCount} route${d.routeCount !== 1 ? "s" : ""} today)`
                            : "(available)"}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignDriver}
                      disabled={assigning || !selectedDriverId}
                      className="tm-btn-primary"
                      style={{
                        padding: ".5rem .75rem",
                        borderRadius: 6,
                        background: "rgba(245,158,11,.1)",
                        border: "1px solid rgba(245,158,11,.3)",
                        color: S.accent,
                        fontWeight: 600,
                        fontSize: ".75rem",
                        cursor:
                          assigning || !selectedDriverId
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          assigning || !selectedDriverId ? 0.5 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {assigning ? "..." : "Assign"}
                    </button>
                  </div>
                )}

                {isDraft && availableDrivers.length > 0 && (
                  <div style={{ marginTop: ".5rem" }}>
                    <span
                      style={{ color: S.muted, fontSize: ".7rem" }}
                    >
                      {availableDrivers.filter((d) => d.routeCount === 0)
                        .length}{" "}
                      driver
                      {availableDrivers.filter((d) => d.routeCount === 0)
                        .length !== 1
                        ? "s"
                        : ""}{" "}
                      with no routes today
                    </span>
                  </div>
                )}
              </div>

              {/* Vehicle Assignment */}
              <div
                className="assign-section"
                style={{
                  border: `1px solid ${S.border}`,
                  borderRadius: 8,
                  padding: "1.25rem",
                }}
              >
                <h3
                  style={{
                    fontSize: ".875rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: ".5rem",
                  }}
                >
                  <span style={{ color: S.muted, fontSize: ".65rem" }}>
                    VEHICLE
                  </span>
                </h3>

                {route.vehiclePlate ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: ".5rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontFamily: S.mono,
                        }}
                      >
                        {route.vehiclePlate}
                      </span>
                      {isDraft && (
                        <button
                          onClick={handleUnassignVehicle}
                          disabled={assigning}
                          style={{
                            background: "none",
                            border: `1px solid rgba(239,68,68,.3)`,
                            color: S.red,
                            fontSize: ".7rem",
                            padding: ".25rem .5rem",
                            borderRadius: 4,
                            cursor: assigning ? "not-allowed" : "pointer",
                            opacity: assigning ? 0.5 : 1,
                          }}
                        >
                          Unassign
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: S.muted, fontSize: ".85rem" }}>
                    No vehicle assigned
                  </span>
                )}

                {isDraft && (
                  <div
                    style={{
                      marginTop: ".75rem",
                      display: "flex",
                      gap: ".5rem",
                    }}
                  >
                    <select
                      className="tm-select"
                      style={{ ...selectStyle, flex: 1 }}
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                    >
                      <option value="">-- Select Vehicle --</option>
                      {availableVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registrationPlate} ({v.type}, cap:{" "}
                          {v.parcelCapacity})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignVehicle}
                      disabled={assigning || !selectedVehicleId}
                      className="tm-btn-primary"
                      style={{
                        padding: ".5rem .75rem",
                        borderRadius: 6,
                        background: "rgba(245,158,11,.1)",
                        border: "1px solid rgba(245,158,11,.3)",
                        color: S.accent,
                        fontWeight: 600,
                        fontSize: ".75rem",
                        cursor:
                          assigning || !selectedVehicleId
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          assigning || !selectedVehicleId ? 0.5 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {assigning ? "..." : "Assign"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Parcels (Draft routes) */}
            {isDraft && (
              <>
                {/* Route Map + Optimize */}
                {route.parcelCount > 0 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: ".75rem",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: ".875rem" }}>
                        Route Map
                      </span>
                      <button
                        onClick={handleOptimize}
                        disabled={optimizing || parcelLoading}
                        style={{
                          padding: ".4rem .85rem",
                          borderRadius: 4,
                          background: "rgba(34,197,94,.1)",
                          border: "1px solid rgba(34,197,94,.3)",
                          color: S.green,
                          fontSize: ".75rem",
                          fontWeight: 600,
                          cursor:
                            optimizing || parcelLoading
                              ? "not-allowed"
                              : "pointer",
                          opacity: optimizing || parcelLoading ? 0.5 : 1,
                        }}
                      >
                        {optimizing
                          ? "Optimizing..."
                          : "Optimize Stop Order"}
                      </button>
                    </div>
                    <RouteMap
                      depotLocation={
                        route.depot?.address?.latitude != null &&
                        route.depot?.address?.longitude != null
                          ? {
                              latitude: route.depot.address.latitude,
                              longitude: route.depot.address.longitude,
                              name: route.depot.name ?? "Depot",
                            }
                          : null
                      }
                      stops={assignedParcels
                        .filter(
                          (rp) =>
                            rp.parcel?.recipientAddress?.latitude != null &&
                            rp.parcel?.recipientAddress?.longitude != null
                        )
                        .map((rp) => ({
                          parcelId: rp.parcelId,
                          stopOrder: rp.stopOrder,
                          trackingNumber:
                            rp.parcel?.trackingNumber ??
                            rp.parcelId.slice(0, 8),
                          latitude:
                            rp.parcel?.recipientAddress?.latitude ?? 0,
                          longitude:
                            rp.parcel?.recipientAddress?.longitude ?? 0,
                          address:
                            rp.parcel?.recipientAddress?.city ??
                            "Unknown",
                        }))}
                      selectedStopId={selectedStopId}
                      onStopSelected={setSelectedStopId}
                    />
                  </div>
                )}

                <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                {/* Available staged parcels */}
                <div
                  style={{
                    border: `1px solid ${S.border}`,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: ".75rem 1rem",
                      borderBottom: `1px solid ${S.border}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: ".875rem" }}>
                      Available Parcels ({stagedParcels.length})
                    </span>
                    <button
                      onClick={handleAutoAssign}
                      disabled={parcelLoading || stagedParcels.length === 0}
                      style={{
                        padding: ".35rem .75rem",
                        borderRadius: 4,
                        background: "rgba(34,197,94,.1)",
                        border: "1px solid rgba(34,197,94,.3)",
                        color: S.green,
                        fontSize: ".75rem",
                        fontWeight: 600,
                        cursor: parcelLoading ? "not-allowed" : "pointer",
                      }}
                    >
                      {parcelLoading ? "Assigning..." : "Auto-Assign All"}
                    </button>
                  </div>
                  <div style={{ maxHeight: 300, overflow: "auto" }}>
                    {stagedParcels.length === 0 ? (
                      <div
                        style={{
                          padding: "1.5rem",
                          textAlign: "center",
                          color: S.muted,
                          fontSize: ".8rem",
                        }}
                      >
                        No sorted parcels available for this zone
                      </div>
                    ) : (
                      stagedParcels.map((p) => (
                        <div
                          key={p.id}
                          className="parcel-row"
                          onClick={() => toggleParcel(p.id)}
                          style={{
                            padding: ".5rem 1rem",
                            borderBottom: `1px solid ${S.border}`,
                            display: "flex",
                            alignItems: "center",
                            gap: ".75rem",
                            cursor: "pointer",
                            background: selectedParcelIds.has(p.id)
                              ? "rgba(245,158,11,.06)"
                              : "transparent",
                          }}
                        >
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleParcel(p.id);
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 3,
                              border: `1.5px solid ${selectedParcelIds.has(p.id) ? S.accent : "rgba(255,255,255,.2)"}`,
                              background: selectedParcelIds.has(p.id)
                                ? S.accent
                                : "transparent",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              flexShrink: 0,
                              fontSize: 11,
                              color: "#080c14",
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            {selectedParcelIds.has(p.id) ? "\u2713" : ""}
                          </span>
                          <span
                            style={{
                              fontFamily: S.mono,
                              fontSize: ".8rem",
                            }}
                          >
                            {p.trackingNumber}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedParcelIds.size > 0 && (
                    <div
                      style={{
                        padding: ".75rem 1rem",
                        borderTop: `1px solid ${S.border}`,
                      }}
                    >
                      <button
                        onClick={handleAddSelected}
                        disabled={parcelLoading}
                        className="tm-btn-primary"
                        style={{
                          width: "100%",
                          padding: ".4rem .75rem",
                          borderRadius: 4,
                          background: "rgba(245,158,11,.1)",
                          border: "1px solid rgba(245,158,11,.3)",
                          color: S.accent,
                          fontWeight: 600,
                          fontSize: ".8rem",
                          cursor: parcelLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        Add {selectedParcelIds.size} Selected Parcel
                        {selectedParcelIds.size !== 1 ? "s" : ""}
                      </button>
                    </div>
                  )}
                </div>

                {/* Assigned parcels */}
                <div
                  style={{
                    border: `1px solid ${S.border}`,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: ".75rem 1rem",
                      borderBottom: `1px solid ${S.border}`,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: ".875rem" }}>
                      Assigned Parcels ({route.parcelCount})
                    </span>
                  </div>
                  <div style={{ maxHeight: 340, overflow: "auto" }}>
                    {route.parcelCount === 0 ? (
                      <div
                        style={{
                          padding: "1.5rem",
                          textAlign: "center",
                          color: S.muted,
                          fontSize: ".8rem",
                        }}
                      >
                        No parcels assigned yet.
                      </div>
                    ) : (
                      <SortableStopList
                        stops={assignedParcels
                          .slice()
                          .sort((a, b) => a.stopOrder - b.stopOrder)
                          .map((rp) => ({
                            parcelId: rp.parcelId,
                            stopOrder: rp.stopOrder,
                            trackingNumber:
                              rp.parcel?.trackingNumber ??
                              rp.parcelId.slice(0, 8),
                            address:
                              rp.parcel?.recipientAddress?.city ?? "",
                          }))}
                        selectedStopId={selectedStopId}
                        onStopSelected={setSelectedStopId}
                        onReorder={handleReorder}
                        onRemove={handleRemoveParcel}
                        disabled={parcelLoading || optimizing}
                      />
                    )}
                  </div>
                </div>
              </div>
              </>
            )}

            {/* Non-draft: show assigned parcels as read-only */}
            {!isDraft && route.parcelCount > 0 && (
              <div
                style={{
                  border: `1px solid ${S.border}`,
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    padding: ".75rem 1rem",
                    borderBottom: `1px solid ${S.border}`,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: ".875rem" }}>
                    Parcels ({route.parcelCount})
                  </span>
                </div>
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  {Array.isArray(assignedParcels) &&
                    assignedParcels.map((rp, i) => (
                      <div
                        key={rp.parcelId}
                        style={{
                          padding: ".5rem 1rem",
                          borderBottom: `1px solid ${S.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: ".75rem",
                        }}
                      >
                        <span
                          style={{
                            color: S.accent,
                            fontSize: ".75rem",
                            fontWeight: 600,
                            minWidth: 24,
                          }}
                        >
                          #{rp.stopOrder || i + 1}
                        </span>
                        <span
                          style={{
                            fontFamily: S.mono,
                            fontSize: ".8rem",
                            flex: 1,
                          }}
                        >
                          {rp.parcel?.trackingNumber ??
                            rp.parcelId.slice(0, 8)}
                        </span>
                        <span
                          style={{
                            fontSize: ".75rem",
                            color: S.muted,
                          }}
                        >
                          {rp.parcel?.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: ".75rem",
                  borderRadius: 6,
                  background: "rgba(239,68,68,.1)",
                  border: "1px solid rgba(239,68,68,.3)",
                  color: S.red,
                  fontSize: ".875rem",
                }}
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: ".75rem",
              }}
            >
              {isDraft &&
                route.driverId &&
                route.vehicleId &&
                route.parcelCount > 0 && (
                  <button
                    onClick={handleDispatch}
                    disabled={dispatching}
                    style={{
                      padding: ".5rem 1.25rem",
                      borderRadius: 6,
                      background: "rgba(34,197,94,.1)",
                      border: "1px solid rgba(34,197,94,.3)",
                      color: S.green,
                      fontWeight: 600,
                      fontSize: ".875rem",
                      cursor: dispatching ? "not-allowed" : "pointer",
                      opacity: dispatching ? 0.5 : 1,
                    }}
                  >
                    {dispatching ? "Dispatching..." : "Dispatch Route"}
                  </button>
                )}
              {isDraft && (
                <button
                  onClick={handleDelete}
                  style={{
                    padding: ".5rem 1.25rem",
                    borderRadius: 6,
                    background: "transparent",
                    border: "1px solid rgba(239,68,68,.3)",
                    color: S.red,
                    fontWeight: 600,
                    fontSize: ".875rem",
                    cursor: "pointer",
                  }}
                >
                  Delete Draft
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
