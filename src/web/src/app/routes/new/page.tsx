"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import TmNavbar from "@/components/TmNavbar";
import { createRouteAction, addParcelsToRouteAction, autoAssignParcelsAction, removeParcelFromRouteAction, deleteRouteAction } from "@/lib/actions/routes";
import { useZones } from "@/lib/hooks/useZones";
import { useSearchVehicles } from "@/lib/hooks/useVehicles";
import { useDepotNames } from "@/lib/hooks/useDepots";
import type { CreateRouteInput, DeliveryRoute } from "@/lib/types/route";
import { RouteStatus } from "@/lib/types/route";
import { graphql } from "@/lib/api/graphql";

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)" as const,
  text: "#e2e8f0" as const,
  muted: "#647a96" as const,
  accent: "#f59e0b" as const,
  inputBg: "rgba(255,255,255,.05)" as const,
  inputBorder: "rgba(255,255,255,.1)" as const,
  red: "#ef4444" as const,
  green: "#22c55e" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

const inputStyle: React.CSSProperties = {
  background: S.inputBg,
  border: `1px solid ${S.inputBorder}`,
  color: S.text,
  borderRadius: 6,
  padding: ".5rem .75rem",
  fontSize: ".875rem",
  width: "100%",
  outline: "none",
  fontFamily: S.mono,
  boxSizing: "border-box",
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

function TmLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
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
      {children}
    </label>
  );
}

// Minimal driver type for dropdown
interface DriverOption {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  isActive: boolean;
}

interface StagedParcel {
  id: string;
  trackingNumber: string;
  routeAssignments: { routeId: string }[];
}

const GET_DRIVERS = `
  query GetDrivers($first: Int) {
    drivers(first: $first) {
      nodes {
        id
        firstName
        lastName
        fullName
        isActive
      }
    }
  }
`;

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

export default function NewRoutePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: route creation
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    zoneId: "",
    driverId: "",
    vehicleId: "",
  });
  const [createdRoute, setCreatedRoute] = useState<DeliveryRoute | null>(null);

  // Step 2: parcel assignment
  const [stagedParcels, setStagedParcels] = useState<StagedParcel[]>([]);
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  // Fetch dropdown data
  const { data: zonesData } = useZones(undefined, false);
  const { data: depots } = useDepotNames();
  const zones = zonesData ?? [];

  const { data: vehiclesData } = useSearchVehicles({
    filter: form.zoneId ? {} : {},
    sortField: "registrationPlate",
    sortDirection: "ASC",
    first: 100,
  });

  // Fetch drivers via graphql proxy (client-compatible)
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driverError, setDriverError] = useState<string | null>(null);
  useEffect(() => {
    graphql<{ drivers: { nodes: DriverOption[] } }>(GET_DRIVERS, { first: 100 })
      .then((data) => {
        setDrivers(data.drivers.nodes.filter((d) => d.isActive));
        setDriverError(null);
      })
      .catch((err) => setDriverError(err.message));
  }, []);

  // Filter: only show parcels not already on any route
  function filterAvailable(parcels: StagedParcel[]): StagedParcel[] {
    return parcels.filter((p) => p.routeAssignments.length === 0);
  }

  // When zone is selected, fetch staged parcels for that zone
  useEffect(() => {
    if (!form.zoneId) {
      setStagedParcels([]);
      return;
    }
    graphql<{ parcels: { nodes: StagedParcel[] } }>(GET_STAGED_PARCELS, {
      first: 50,
      where: { status: { eq: "SORTED" }, zoneId: { eq: form.zoneId } },
    })
      .then((data) => { setStagedParcels(filterAvailable(data.parcels.nodes)); })
      .catch((err) => { console.error("Failed to fetch staged parcels:", err); setStagedParcels([]); });
  }, [form.zoneId]);

  // Filter vehicles: only AVAILABLE
  const availableVehicles = vehiclesData?.items?.filter((v) => v.status === "AVAILABLE") ?? [];

  // Auto-assign driver when vehicle is selected (best-effort: pick available driver matching zone)
  const handleVehicleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setForm((f) => ({ ...f, vehicleId: e.target.value }));
    },
    []
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleCreateRoute(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const input: CreateRouteInput = {
      date: form.date,
      zoneId: form.zoneId,
      driverId: form.driverId || undefined,
      vehicleId: form.vehicleId || undefined,
    };

    const result = await createRouteAction(input);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.routeId) {
      // Invalidate routes list so it refreshes when user navigates back
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      // Route created — now fetch it for the parcel assignment step
      const { getRouteAction } = await import("@/lib/actions/routes");
      const route = await getRouteAction(result.routeId);
      setCreatedRoute(route);
    }
  }

  async function handleAutoAssign() {
    if (!createdRoute) return;
    setAssigning(true);
    setError(null);
    const result = await autoAssignParcelsAction(createdRoute.id);
    setAssigning(false);
    if (result.error) {
      setError(result.error);
    } else {
      // Refresh route
      const { getRouteAction } = await import("@/lib/actions/routes");
      const route = await getRouteAction(createdRoute.id);
      setCreatedRoute(route);
      // Refresh staged parcels list (remove already assigned)
      if (form.zoneId) {
        const data = await graphql<{ parcels: { nodes: StagedParcel[] } }>(GET_STAGED_PARCELS, {
          first: 50,
          where: { status: { eq: "SORTED" }, zoneId: { eq: form.zoneId } },
        });
        setStagedParcels(filterAvailable(data.parcels.nodes));
      }
    }
  }

  async function handleAddSelected() {
    if (!createdRoute || selectedParcelIds.size === 0) return;
    setAssigning(true);
    setError(null);
    const result = await addParcelsToRouteAction({
      routeId: createdRoute.id,
      parcelIds: Array.from(selectedParcelIds),
    });
    setAssigning(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSelectedParcelIds(new Set());
      const { getRouteAction } = await import("@/lib/actions/routes");
      const route = await getRouteAction(createdRoute.id);
      setCreatedRoute(route);
      // Refresh staged parcels list to remove already-assigned ones
      if (form.zoneId) {
        graphql<{ parcels: { nodes: StagedParcel[] } }>(GET_STAGED_PARCELS, {
          first: 50,
          where: { status: { eq: "SORTED" }, zoneId: { eq: form.zoneId } },
        })
          .then((data) => setStagedParcels(filterAvailable(data.parcels.nodes)))
          .catch(() => {});
      }
    }
  }

  async function handleRemoveParcel(parcelId: string) {
    if (!createdRoute) return;
    setAssigning(true);
    setError(null);
    const result = await removeParcelFromRouteAction({
      routeId: createdRoute.id,
      parcelId,
    });
    setAssigning(false);
    if (result.error) {
      setError(result.error);
    } else {
      const { getRouteAction } = await import("@/lib/actions/routes");
      const route = await getRouteAction(createdRoute.id);
      setCreatedRoute(route);
      // Refresh staged parcels so the removed one reappears
      if (form.zoneId) {
        graphql<{ parcels: { nodes: StagedParcel[] } }>(GET_STAGED_PARCELS, {
          first: 50,
          where: { status: { eq: "SORTED" }, zoneId: { eq: form.zoneId } },
        })
          .then((data) => setStagedParcels(filterAvailable(data.parcels.nodes)))
          .catch(() => {});
      }
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

  // Step 1: Route creation form
  if (!createdRoute) {
    return (
      <>
        <style>{`
          .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
          .tm-input::placeholder { color: #3a526e; }
          .tm-select { background: #0d1424; border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .5rem .75rem; font-size: .875rem; width: 100%; outline: none; font-family: var(--font-geist-mono,monospace); }
          .tm-select:focus { border-color: rgba(245,158,11,.45); }
          .tm-select option { background: #0d1424; color: #e2e8f0; }
        `}</style>
        <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 0,
              backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)",
              backgroundSize: "52px 52px", pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <TmNavbar />
            <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1.5rem" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <Link href="/routes" style={{ color: S.muted, fontSize: ".875rem", textDecoration: "none" }}>
                  &larr; Back to Routes
                </Link>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: ".5rem" }}>
                  Create Delivery Route
                </h1>
                <p style={{ color: S.muted, fontSize: ".8rem", marginTop: ".25rem" }}>
                  Step 1 of 2 &mdash; Define route details
                </p>
              </div>

              <form onSubmit={handleCreateRoute}>
                <div style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Date */}
                  <div>
                    <TmLabel htmlFor="date">Delivery Date *</TmLabel>
                    <input id="date" name="date" type="date" required value={form.date} onChange={handleChange} className="tm-input" style={inputStyle} />
                  </div>

                  {/* Zone dropdown */}
                  <div>
                    <TmLabel htmlFor="zoneId">Zone *</TmLabel>
                    <select id="zoneId" name="zoneId" required value={form.zoneId} onChange={handleChange} className="tm-select" style={selectStyle}>
                      <option value="">-- Select Zone --</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Driver dropdown */}
                  <div>
                    <TmLabel htmlFor="driverId">Driver</TmLabel>
                    <select id="driverId" name="driverId" value={form.driverId} onChange={handleChange} className="tm-select" style={selectStyle}>
                      <option value="">-- No Driver --</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName ?? `${d.firstName} ${d.lastName}`}
                        </option>
                      ))}
                    </select>
                    {driverError && (
                      <p style={{ color: S.red, fontSize: ".75rem", marginTop: ".25rem" }}>
                        Failed to load drivers: {driverError}
                      </p>
                    )}
                  </div>

                  {/* Vehicle dropdown */}
                  <div>
                    <TmLabel htmlFor="vehicleId">Vehicle</TmLabel>
                    <select id="vehicleId" name="vehicleId" value={form.vehicleId} onChange={handleVehicleChange} className="tm-select" style={selectStyle}>
                      <option value="">-- No Vehicle --</option>
                      {availableVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registrationPlate} ({v.type}, cap: {v.parcelCapacity})
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.zoneId && stagedParcels.length > 0 && (
                    <div style={{ padding: ".5rem .75rem", borderRadius: 6, background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.15)", fontSize: ".8rem", color: S.accent }}>
                      {stagedParcels.length} sorted parcel{stagedParcels.length !== 1 ? "s" : ""} available in this zone &mdash; you can assign them in step 2
                    </div>
                  )}

                  {error && (
                    <div style={{ padding: ".75rem", borderRadius: 6, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: S.red, fontSize: ".875rem" }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
                    <Link
                      href="/routes"
                      style={{ padding: ".5rem 1.25rem", borderRadius: 6, background: "transparent", border: `1px solid ${S.border}`, color: S.muted, fontSize: ".875rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting || !form.zoneId}
                      className="tm-btn-primary"
                      style={{
                        padding: ".5rem 1.25rem", borderRadius: 6,
                        background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)",
                        color: S.accent, fontWeight: 600, fontSize: ".875rem",
                        cursor: submitting ? "not-allowed" : "pointer",
                        opacity: submitting || !form.zoneId ? 0.5 : 1,
                      }}
                    >
                      {submitting ? "Creating..." : "Create & Continue"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Step 2: Parcel assignment
  const assignedParcels = createdRoute.routeParcels ?? [];

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; }
        .tm-select { background: #0d1424; border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .5rem .75rem; font-size: .875rem; width: 100%; outline: none; font-family: var(--font-geist-mono,monospace); }
        .tm-select:focus { border-color: rgba(245,158,11,.45); }
        .tm-select option { background: #0d1424; color: #e2e8f0; }
        .parcel-row:hover { background: rgba(255,255,255,.03); }
        .parcel-row:hover .remove-btn { opacity: 1 !important; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
      `}</style>
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 0,
            backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)",
            backgroundSize: "52px 52px", pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: ".5rem" }}>
                Assign Parcels to Route
              </h1>
              <p style={{ color: S.muted, fontSize: ".8rem", marginTop: ".25rem" }}>
                Step 2 of 2 &mdash; Route created ({createdRoute.status}). Add parcels before dispatching.
              </p>
            </div>

            {/* Route summary */}
            <div style={{ border: `1px solid ${S.border}`, borderRadius: 8, padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div><span style={{ color: S.muted, fontSize: ".75rem" }}>Date</span><br /><span style={{ fontFamily: S.mono }}>{createdRoute.date}</span></div>
              <div><span style={{ color: S.muted, fontSize: ".75rem" }}>Zone</span><br />{createdRoute.zoneName ?? "\u2014"}</div>
              <div><span style={{ color: S.muted, fontSize: ".75rem" }}>Driver</span><br />{createdRoute.driverName ?? "Unassigned"}</div>
              <div><span style={{ color: S.muted, fontSize: ".75rem" }}>Vehicle</span><br /><span style={{ fontFamily: S.mono }}>{createdRoute.vehiclePlate ?? "Unassigned"}</span></div>
              <div><span style={{ color: S.muted, fontSize: ".75rem" }}>Parcels</span><br /><strong>{createdRoute.parcelCount}</strong> ({createdRoute.estimatedStops} stops)</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Available staged parcels */}
              <div style={{ border: `1px solid ${S.border}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: ".75rem 1rem", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: ".875rem" }}>Available Parcels ({stagedParcels.length})</span>
                  <button
                    onClick={handleAutoAssign}
                    disabled={assigning || stagedParcels.length === 0}
                    style={{
                      padding: ".35rem .75rem", borderRadius: 4,
                      background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.3)",
                      color: S.green, fontSize: ".75rem", fontWeight: 600,
                      cursor: assigning ? "not-allowed" : "pointer",
                    }}
                  >
                    {assigning ? "Assigning..." : "Auto-Assign All"}
                  </button>
                </div>
                <div style={{ maxHeight: 400, overflow: "auto" }}>
                  {stagedParcels.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: S.muted, fontSize: ".8rem" }}>
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
                          background: selectedParcelIds.has(p.id) ? "rgba(245,158,11,.06)" : "transparent",
                        }}
                      >
                        <span
                          onClick={(e) => { e.stopPropagation(); toggleParcel(p.id); }}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 3,
                            border: `1.5px solid ${selectedParcelIds.has(p.id) ? S.accent : "rgba(255,255,255,.2)"}`,
                            background: selectedParcelIds.has(p.id) ? S.accent : "transparent",
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
                        <span style={{ fontFamily: S.mono, fontSize: ".8rem" }}>{p.trackingNumber}</span>
                      </div>
                    ))
                  )}
                </div>
                {selectedParcelIds.size > 0 && (
                  <div style={{ padding: ".75rem 1rem", borderTop: `1px solid ${S.border}` }}>
                    <button
                      onClick={handleAddSelected}
                      disabled={assigning}
                      className="tm-btn-primary"
                      style={{
                        width: "100%", padding: ".4rem .75rem", borderRadius: 4,
                        background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)",
                        color: S.accent, fontWeight: 600, fontSize: ".8rem",
                        cursor: assigning ? "not-allowed" : "pointer",
                      }}
                    >
                      Add {selectedParcelIds.size} Selected Parcel{selectedParcelIds.size !== 1 ? "s" : ""}
                    </button>
                  </div>
                )}
              </div>

              {/* Assigned parcels */}
              <div style={{ border: `1px solid ${S.border}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: ".75rem 1rem", borderBottom: `1px solid ${S.border}` }}>
                  <span style={{ fontWeight: 600, fontSize: ".875rem" }}>Assigned Parcels ({createdRoute.parcelCount})</span>
                </div>
                <div style={{ maxHeight: 440, overflow: "auto" }}>
                  {createdRoute.parcelCount === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: S.muted, fontSize: ".8rem" }}>
                      No parcels assigned yet. Select from the left or auto-assign.
                    </div>
                  ) : (
                    Array.isArray(assignedParcels) && assignedParcels.map((rp, i) => (
                      <div
                        key={rp.parcelId}
                        className="parcel-row"
                        style={{
                          padding: ".5rem 1rem",
                          borderBottom: `1px solid ${S.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: ".75rem",
                        }}
                      >
                        <span style={{ color: S.accent, fontSize: ".75rem", fontWeight: 600, minWidth: 24 }}>
                          #{rp.stopOrder || i + 1}
                        </span>
                        <span style={{ fontFamily: S.mono, fontSize: ".8rem", flex: 1 }}>
                          {rp.parcel?.trackingNumber ?? rp.parcelId.slice(0, 8)}
                        </span>
                        <button
                          className="remove-btn"
                          onClick={() => handleRemoveParcel(rp.parcelId)}
                          disabled={assigning}
                          title="Remove parcel from route"
                          style={{
                            background: "none",
                            border: "none",
                            color: S.red,
                            cursor: assigning ? "not-allowed" : "pointer",
                            fontSize: ".85rem",
                            padding: ".15rem .35rem",
                            borderRadius: 3,
                            opacity: assigning ? 0.4 : 0.7,
                            lineHeight: 1,
                            transition: "opacity .15s",
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div style={{ marginTop: "1rem", padding: ".75rem", borderRadius: 6, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: S.red, fontSize: ".875rem" }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", gap: ".75rem" }}>
              <div style={{ display: "flex", gap: ".75rem" }}>
                <button
                  onClick={async () => {
                    if (createdRoute && confirm("Delete this draft route and go back?")) {
                      await deleteRouteAction(createdRoute.id);
                      queryClient.invalidateQueries({ queryKey: ["routes"] });
                    }
                    router.push("/routes");
                  }}
                  style={{
                    padding: ".5rem 1.25rem", borderRadius: 6,
                    background: "transparent", border: `1px solid rgba(239,68,68,.3)`,
                    color: S.red, fontWeight: 600, fontSize: ".875rem",
                    cursor: "pointer",
                  }}
                >
                  &larr; Delete &amp; Back
                </button>
              </div>
              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["routes"] });
                  router.push("/routes");
                }}
                style={{
                  padding: ".5rem 1.25rem", borderRadius: 6,
                  background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)",
                  color: S.accent, fontWeight: 600, fontSize: ".875rem",
                  cursor: "pointer",
                }}
              >
                Done &mdash; Go to Routes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
