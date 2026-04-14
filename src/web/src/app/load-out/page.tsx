"use client";

import { useRef, useState, useTransition, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import TmNavbar from "@/components/TmNavbar";
import {
  getDeliveryRoutesAction,
  getStagingParcelsAction,
  type DeliveryRoute,
  type StagingParcel,
} from "@/lib/actions/stageParcel";
import { loadParcel, completeLoading } from "@/lib/api/routes";
import { downloadManifest } from "@/lib/api/routes";

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
  red: "#ef4444" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

type ConfirmDialog =
  | { open: false }
  | { open: true; title: string; message: string; onConfirm: () => void };

type ScanOutcome = "loaded" | "force-loaded" | "error";

interface ScanRecord {
  id: string;
  trackingNumber: string;
  outcome: ScanOutcome;
  routeName: string | null;
  errorMessage?: string;
  scannedAt: Date;
}

const outcomeColor: Record<ScanOutcome, string> = {
  loaded: S.green,
  "force-loaded": S.accent,
  error: S.red,
};

const outcomeLabel: Record<ScanOutcome, string> = {
  loaded: "LOADED",
  "force-loaded": "FORCE-LOADED",
  error: "ERROR",
};

const outcomeSymbol: Record<ScanOutcome, string> = {
  loaded: "\u2713",
  "force-loaded": "\u2713",
  error: "\u2717",
};

const ROUTES_PER_PAGE = 5;

export default function LoadOutPage() {
  const { data: session } = useSession();
  const operatorName = session?.user?.name ?? "Unknown";

  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [parcels, setParcels] = useState<StagingParcel[]>([]);
  const [parcelsLoading, setParcelsLoading] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({ open: false });
  const [isPending, startTransition] = useTransition();
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Load draft routes for today on mount
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    getDeliveryRoutesAction(today).then(setRoutes).catch((err) => {
      console.error("Failed to load routes:", err);
    });
  }, []);

  function focusScanInput() {
    setTimeout(() => scanInputRef.current?.focus(), 0);
  }

  function fetchParcels(routeId: string) {
    setParcelsLoading(true);
    getStagingParcelsAction(routeId).then(setParcels).catch((err) => {
      console.error("Failed to load parcels:", err);
    }).finally(() => setParcelsLoading(false));
  }

  function selectRoute(id: string) {
    setSelectedRouteId(id);
    setScanInput("");
    fetchParcels(id);
    focusScanInput();
  }

  function addScanRecord(trackingNumber: string, outcome: ScanOutcome, routeName: string | null, errorMessage?: string) {
    setScanHistory((prev) => [
      { id: crypto.randomUUID(), trackingNumber, outcome, routeName, errorMessage, scannedAt: new Date() },
      ...prev.slice(0, 49),
    ]);
  }

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  const loadedCount = parcels.filter((p) => p.status === "LOADED").length;
  const totalCount = parcels.length;

  const handleScan = useCallback(
    (forceLoad = false) => {
      const trackingNumber = scanInput.trim();
      if (!trackingNumber || !selectedRouteId) return;

      startTransition(async () => {
        try {
          const result = await loadParcel({
            trackingNumber,
            routeId: selectedRouteId,
            operatorName,
            forceLoad,
          }).then((res) => res.loadParcel);

          if (result.isWrongRoute && !forceLoad) {
            setConfirmDialog({
              open: true,
              title: "Wrong Route",
              message: `Parcel ${trackingNumber} is assigned to route "${result.assignedRouteName ?? "unknown"}". Load anyway?`,
              onConfirm: () => {
                setConfirmDialog({ open: false });
                handleScan(true);
              },
            });
            return;
          }

          const outcome: ScanOutcome = forceLoad ? "force-loaded" : "loaded";
          addScanRecord(trackingNumber, outcome, selectedRoute?.name ?? null);
          fetchParcels(selectedRouteId);

          toast.success(
            forceLoad
              ? `Parcel ${trackingNumber} force-loaded.`
              : `Parcel ${trackingNumber} loaded.`,
          );
          setScanInput("");
          focusScanInput();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to load parcel.";
          addScanRecord(trackingNumber, "error", null, msg);
          toast.error(msg);
          setScanInput("");
          focusScanInput();
        }
      });
    },
    [scanInput, selectedRouteId, operatorName, selectedRoute],
  );

  async function handleCompleteLoading(forceComplete = false) {
    if (!selectedRouteId) return;

    try {
      const result = await completeLoading({
        routeId: selectedRouteId,
        operatorName,
        forceComplete,
      }).then((res) => res.completeLoading);

      if (!result.isSuccess && !forceComplete) {
        const names = result.unloadedParcels
          .map((p) => p.trackingNumber)
          .join(", ");
        setConfirmDialog({
          open: true,
          title: "Unloaded Parcels",
          message: `${result.unloadedParcelCount} parcel(s) not yet loaded: ${names}. Complete loading anyway?`,
          onConfirm: () => {
            setConfirmDialog({ open: false });
            handleCompleteLoading(true);
          },
        });
        return;
      }

      toast.success(
        forceComplete
          ? "Loading completed with unloaded parcels."
          : "Loading completed successfully.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to complete loading.",
      );
    }
  }

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .lo-route-card:hover { border-color: rgba(245,158,11,.25) !important; }
        .lo-route-card.lo-selected { border-color: rgba(245,158,11,.4) !important; background: rgba(245,158,11,.04) !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: S.bg, color: S.text }}>
        <TmNavbar />

        <div style={{ padding: "2rem", maxWidth: 1360, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: "1.5rem" }}>
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
              Depot Operations
            </p>
            <h1
              style={{
                fontFamily: S.mono,
                fontSize: "1.5rem",
                fontWeight: 800,
                margin: 0,
              }}
            >
              Route Load-Out
            </h1>
            <p
              style={{
                margin: ".55rem 0 0",
                fontFamily: S.mono,
                fontSize: "11px",
                letterSpacing: ".06em",
                color: S.muted,
              }}
            >
              Scan staged parcels to load them onto the correct vehicle.
            </p>
          </div>

          {routes.length === 0 ? (
            <div
              style={{
                background: S.panel,
                border: `1px solid ${S.border}`,
                borderRadius: 10,
                padding: "1.25rem",
                fontFamily: S.mono,
                color: S.muted,
              }}
            >
              No draft routes found.
            </div>
          ) : null}

          {routes.length > 0 ? (
            <div>
              <div
                style={{
                  fontFamily: S.mono,
                  fontSize: "10px",
                  letterSpacing: ".14em",
                  color: S.muted,
                  textTransform: "uppercase",
                  marginBottom: ".5rem",
                }}
              >
                Routes ({routes.length})
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "340px 1fr",
                  gap: "1.25rem",
                  alignItems: "start",
                }}
              >
                {/* Left: Route List + Scan History */}
                <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  <RouteList
                    routes={routes}
                    selectedRouteId={selectedRouteId}
                    onSelect={selectRoute}
                  />

                  {/* Scan History */}
                  {scanHistory.length > 0 && (
                    <div style={{ marginTop: ".5rem" }}>
                      <div
                        style={{
                          fontFamily: S.mono,
                          fontSize: "10px",
                          letterSpacing: ".14em",
                          color: S.muted,
                          textTransform: "uppercase",
                          marginBottom: ".25rem",
                        }}
                      >
                        Recent Scans
                      </div>
                      <div
                        style={{
                          background: S.panel,
                          border: `1px solid ${S.border}`,
                          borderRadius: 10,
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ maxHeight: 250, overflowY: "auto" }}>
                          {scanHistory.map((rec) => (
                            <div
                              key={rec.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: ".6rem",
                                padding: ".5rem .85rem",
                                borderBottom: `1px solid ${S.border}`,
                                fontFamily: S.mono,
                                fontSize: "11px",
                              }}
                            >
                              <span
                                style={{
                                  color: outcomeColor[rec.outcome],
                                  fontSize: "12px",
                                  width: 16,
                                  textAlign: "center",
                                }}
                              >
                                {outcomeSymbol[rec.outcome]}
                              </span>
                              <span style={{ fontWeight: 600, flex: 1 }}>{rec.trackingNumber}</span>
                              <span
                                style={{
                                  fontSize: "9px",
                                  letterSpacing: ".1em",
                                  color: outcomeColor[rec.outcome],
                                  textTransform: "uppercase",
                                }}
                              >
                                {outcomeLabel[rec.outcome]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Selected route detail */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {!selectedRoute ? (
                    <div
                      style={{
                        background: S.panel,
                        border: `1px solid ${S.border}`,
                        borderRadius: 10,
                        padding: "3rem 1.5rem",
                        textAlign: "center",
                        fontFamily: S.mono,
                        color: S.muted,
                        fontSize: "12px",
                      }}
                    >
                      Select a route to begin scanning.
                    </div>
                  ) : (
                    <>
                      {/* Route header */}
                      <div
                        style={{
                          background: S.panel,
                          border: `1px solid ${S.border}`,
                          borderRadius: 10,
                          padding: "1rem 1.25rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: ".6rem",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontFamily: S.mono,
                                fontSize: "16px",
                                fontWeight: 800,
                                marginBottom: ".25rem",
                              }}
                            >
                              {selectedRoute.name}
                            </div>
                            <div
                              style={{
                                fontFamily: S.mono,
                                fontSize: "11px",
                                color: S.muted,
                                letterSpacing: ".06em",
                              }}
                            >
                              {selectedRoute.driverName
                                ? `Driver: ${selectedRoute.driverName}`
                                : "No driver assigned"}
                              {selectedRoute.zoneName ? ` \u00B7 Zone: ${selectedRoute.zoneName}` : ""}
                              {" \u00B7 "}{selectedRoute.date}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                            <span
                              style={{
                                fontFamily: S.mono,
                                fontSize: "12px",
                                fontWeight: 700,
                                color: loadedCount >= totalCount && totalCount > 0 ? S.green : S.accent,
                              }}
                            >
                              {loadedCount}/{totalCount}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await downloadManifest(selectedRoute.id);
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Failed to download manifest.");
                                }
                              }}
                              style={{
                                fontFamily: S.mono,
                                fontSize: "10px",
                                letterSpacing: ".08em",
                                textTransform: "uppercase",
                                padding: ".35rem .7rem",
                                borderRadius: 5,
                                border: "1px solid rgba(245,158,11,.35)",
                                background: "rgba(245,158,11,.12)",
                                color: S.accent,
                                cursor: "pointer",
                              }}
                            >
                              PDF
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div
                          style={{
                            height: 8,
                            background: "rgba(255,255,255,.05)",
                            borderRadius: 999,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0}%`,
                              background: loadedCount >= totalCount && totalCount > 0 ? S.green : S.accent,
                              height: "100%",
                              transition: "width .3s ease",
                            }}
                          />
                        </div>
                      </div>

                      {/* Scan Input */}
                      <div>
                        <label
                          htmlFor="scan-input"
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
                          Scan Tracking Number
                        </label>
                        <div style={{ display: "flex", gap: ".5rem" }}>
                          <input
                            ref={scanInputRef}
                            id="scan-input"
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleScan();
                            }}
                            placeholder="Scan or enter parcel tracking number"
                            autoFocus
                            className="tm-input"
                            style={{
                              flex: 1,
                              background: S.inputBg,
                              border: `1px solid ${S.inputBorder}`,
                              borderRadius: 6,
                              color: S.text,
                              padding: ".65rem .8rem",
                              fontFamily: S.mono,
                              fontSize: "13px",
                              boxSizing: "border-box",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleScan()}
                            disabled={!scanInput.trim() || isPending}
                            style={{
                              fontFamily: S.mono,
                              fontSize: "11px",
                              letterSpacing: ".08em",
                              textTransform: "uppercase",
                              padding: ".5rem 1rem",
                              borderRadius: 6,
                              border: "1px solid rgba(245,158,11,.35)",
                              background: "rgba(245,158,11,.12)",
                              color: S.accent,
                              cursor: !scanInput.trim() || isPending ? "not-allowed" : "pointer",
                              opacity: !scanInput.trim() || isPending ? 0.55 : 1,
                            }}
                          >
                            Load
                          </button>
                        </div>
                      </div>

                      {/* Parcel List */}
                      <div
                        style={{
                          background: S.panel,
                          border: `1px solid ${S.border}`,
                          borderRadius: 10,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            padding: ".75rem 1rem",
                            borderBottom: `1px solid ${S.border}`,
                            fontFamily: S.mono,
                            fontSize: "10px",
                            letterSpacing: ".14em",
                            color: S.muted,
                            textTransform: "uppercase",
                          }}
                        >
                          Parcels ({parcels.length})
                        </div>
                        <div style={{ maxHeight: 440, overflowY: "auto" }}>
                          {parcelsLoading ? (
                            <div
                              style={{
                                padding: "1rem",
                                fontFamily: S.mono,
                                color: S.muted,
                                fontSize: "12px",
                              }}
                            >
                              Loading parcels...
                            </div>
                          ) : parcels.length === 0 ? (
                            <div
                              style={{
                                padding: "1rem",
                                fontFamily: S.mono,
                                color: S.muted,
                                fontSize: "12px",
                              }}
                            >
                              No parcels assigned to this route yet.
                            </div>
                          ) : (
                            parcels.map((parcel) => {
                              const isLoaded = parcel.status === "LOADED";
                              return (
                                <div
                                  key={parcel.id}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "24px 1fr auto auto",
                                    alignItems: "center",
                                    gap: ".75rem",
                                    padding: ".7rem 1rem",
                                    borderBottom: `1px solid ${S.border}`,
                                    fontFamily: S.mono,
                                    fontSize: "12px",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: isLoaded ? S.green : S.dim,
                                      fontSize: "14px",
                                    }}
                                  >
                                    {isLoaded ? "\u2713" : "\u25CB"}
                                  </span>
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{parcel.trackingNumber}</div>
                                    <div
                                      style={{
                                        fontSize: "10px",
                                        color: S.muted,
                                        marginTop: ".15rem",
                                      }}
                                    >
                                      {parcel.city}
                                      {parcel.state ? `, ${parcel.state}` : ""}
                                    </div>
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      color: S.muted,
                                      letterSpacing: ".06em",
                                    }}
                                  >
                                    {parcel.weight ? `${parcel.weight} ${(parcel.weightUnit ?? "kg").toLowerCase()}` : ""}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      letterSpacing: ".1em",
                                      textTransform: "uppercase",
                                      color: isLoaded ? S.green : S.muted,
                                      fontWeight: isLoaded ? 600 : 400,
                                    }}
                                  >
                                    {parcel.status}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Complete Loading */}
                      <button
                        type="button"
                        onClick={() => handleCompleteLoading()}
                        style={{
                          width: "100%",
                          fontFamily: S.mono,
                          fontSize: "11px",
                          letterSpacing: ".1em",
                          textTransform: "uppercase",
                          padding: ".75rem",
                          borderRadius: 8,
                          border:
                            loadedCount >= totalCount && totalCount > 0
                              ? "1px solid rgba(34,197,94,.4)"
                              : "1px solid rgba(245,158,11,.35)",
                          background:
                            loadedCount >= totalCount && totalCount > 0
                              ? "rgba(34,197,94,.1)"
                              : "rgba(245,158,11,.08)",
                          color:
                            loadedCount >= totalCount && totalCount > 0 ? S.green : S.accent,
                          cursor: "pointer",
                        }}
                      >
                        Complete Loading
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.open ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#0d1424",
              border: `1px solid ${S.border}`,
              borderRadius: 14,
              padding: "1.5rem",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <h2
              style={{
                fontFamily: S.mono,
                color: S.accent,
                marginTop: 0,
                marginBottom: ".75rem",
                fontSize: "1rem",
              }}
            >
              {confirmDialog.title}
            </h2>
            <p
              style={{
                fontFamily: S.mono,
                fontSize: "12px",
                color: S.muted,
                marginBottom: "1.25rem",
                lineHeight: 1.6,
              }}
            >
              {confirmDialog.message}
            </p>
            <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setConfirmDialog({ open: false })}
                style={{
                  fontFamily: S.mono,
                  fontSize: "11px",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  padding: ".5rem .85rem",
                  borderRadius: 6,
                  border: `1px solid ${S.border}`,
                  background: "transparent",
                  color: S.muted,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                style={{
                  fontFamily: S.mono,
                  fontSize: "11px",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  padding: ".5rem .85rem",
                  borderRadius: 6,
                  border: "1px solid rgba(245,158,11,.35)",
                  background: "rgba(245,158,11,.12)",
                  color: S.accent,
                  cursor: "pointer",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RouteList({
  routes,
  selectedRouteId,
  onSelect,
}: {
  routes: DeliveryRoute[];
  selectedRouteId: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = routes.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.driverName ?? "").toLowerCase().includes(q) ||
      (r.zoneName ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / ROUTES_PER_PAGE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pageItems = filtered.slice(safePage * ROUTES_PER_PAGE, (safePage + 1) * ROUTES_PER_PAGE);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  return (
    <>
      <input
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search by route, driver or zone"
        className="tm-input"
        style={{
          width: "100%",
          background: S.inputBg,
          border: `1px solid ${S.inputBorder}`,
          borderRadius: 6,
          color: S.text,
          fontFamily: S.mono,
          fontSize: "12px",
          padding: ".55rem .7rem",
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      {filtered.length === 0 ? (
        <div
          style={{
            background: S.panel,
            border: `1px solid ${S.border}`,
            borderRadius: 10,
            padding: "1.25rem",
            fontFamily: S.mono,
            color: S.muted,
            fontSize: "12px",
          }}
        >
          {search ? `No routes match "${search}".` : "No draft routes found."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
          {pageItems.map((r) => {
            const isSelected = r.id === selectedRouteId;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelect(r.id)}
                className={`lo-route-card${isSelected ? " lo-selected" : ""}`}
                style={{
                  background: isSelected ? "rgba(245,158,11,.04)" : S.panel,
                  border: `1px solid ${isSelected ? "rgba(245,158,11,.4)" : S.border}`,
                  borderRadius: 10,
                  padding: ".85rem 1rem",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "border-color .15s, background .15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: ".35rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: S.mono,
                      fontSize: "13px",
                      fontWeight: 700,
                      color: S.text,
                    }}
                  >
                    {r.name}
                  </span>
                  <span
                    style={{
                      fontFamily: S.mono,
                      fontSize: "10px",
                      color: isSelected ? S.accent : S.muted,
                      fontWeight: 600,
                    }}
                  >
                    {r.status}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: S.mono,
                    fontSize: "10px",
                    color: S.muted,
                    letterSpacing: ".06em",
                  }}
                >
                  {r.driverName ?? "No driver"}
                  {r.zoneName ? ` \u00B7 ${r.zoneName}` : ""}
                </div>
              </button>
            );
          })}

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: ".5rem",
              }}
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                style={paginationBtn(safePage === 0)}
              >
                Prev
              </button>
              <span style={{ fontSize: "10px", color: S.muted, fontFamily: S.mono }}>
                Page {safePage + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage === totalPages - 1}
                style={paginationBtn(safePage === totalPages - 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function paginationBtn(disabled: boolean): React.CSSProperties {
  return {
    fontFamily: S.mono,
    fontSize: "10px",
    padding: ".3rem .6rem",
    borderRadius: 4,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 1,
    background: "transparent",
    border: `1px solid ${S.border}`,
    color: S.muted,
  };
}
