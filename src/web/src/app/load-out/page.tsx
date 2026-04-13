"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import TmNavbar from "@/components/TmNavbar";
import { useDeliveryRoutes, useLoadParcel, useCompleteLoading } from "@/lib/hooks/useRoutes";
import { downloadManifest } from "@/lib/api/routes";
import type { DeliveryRoute } from "@/lib/types/route";
import { ParcelStatus } from "@/lib/types/parcel";

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
  blue: "#38bdf8" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

type ConfirmDialog =
  | { open: false }
  | {
      open: true;
      title: string;
      message: string;
      onConfirm: () => void;
    };

function getProgress(route: DeliveryRoute) {
  const total = route.parcels.length;
  const loaded = route.parcels.filter(
    (p) => p.status === ParcelStatus.Loaded,
  ).length;
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return { total, loaded, pct };
}

function formatWeight(value: number, unit: string) {
  return `${value} ${unit.toLowerCase()}`;
}

export default function LoadOutPage() {
  const { data: session } = useSession();
  const operatorName = session?.user?.name ?? "Unknown";

  const { data: routesData, isLoading, error } = useDeliveryRoutes();
  const loadParcelMutation = useLoadParcel();
  const completeLoadingMutation = useCompleteLoading();

  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [scanInput, setScanInput] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    open: false,
  });

  const scanInputRef = useRef<HTMLInputElement>(null);

  const routes = routesData?.nodes ?? [];
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;
  const progress = selectedRoute ? getProgress(selectedRoute) : null;

  function focusScanInput() {
    setTimeout(() => scanInputRef.current?.focus(), 0);
  }

  function selectRoute(id: string) {
    setSelectedRouteId(id);
    setScanInput("");
    focusScanInput();
  }

  async function handleScan(forceLoad = false) {
    const trackingNumber = scanInput.trim();
    if (!trackingNumber || !selectedRouteId) return;

    try {
      const result = await loadParcelMutation.mutateAsync({
        trackingNumber,
        routeId: selectedRouteId,
        operatorName,
        forceLoad,
      });

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

      toast.success(
        forceLoad
          ? `Parcel ${trackingNumber} force-loaded.`
          : `Parcel ${trackingNumber} loaded.`,
      );
      setScanInput("");
      focusScanInput();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load parcel.");
    }
  }

  async function handleCompleteLoading(forceComplete = false) {
    if (!selectedRouteId) return;

    try {
      const result = await completeLoadingMutation.mutateAsync({
        routeId: selectedRouteId,
        operatorName,
        forceComplete,
      });

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

      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
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
              Scan parcels onto vehicles for today&apos;s routes.
            </p>
          </div>

          {isLoading ? (
            <p style={{ fontFamily: S.mono, color: S.muted }}>
              Loading routes...
            </p>
          ) : null}

          {error ? (
            <p style={{ fontFamily: S.mono, color: S.red }}>
              {String(error)}
            </p>
          ) : null}

          {!isLoading && routes.length === 0 ? (
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

          {!isLoading && routes.length > 0 ? (
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
                {/* Left: Route List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: ".5rem",
                  }}
                >
                  {routes.map((route) => {
                  const p = getProgress(route);
                  const isSelected = route.id === selectedRouteId;
                  return (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => selectRoute(route.id)}
                      className={`lo-route-card${isSelected ? " lo-selected" : ""}`}
                      style={{
                        background: isSelected
                          ? "rgba(245,158,11,.04)"
                          : S.panel,
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
                          {route.name}
                        </span>
                        <span
                          style={{
                            fontFamily: S.mono,
                            fontSize: "10px",
                            color: p.pct === 100 ? S.green : S.accent,
                            fontWeight: 600,
                          }}
                        >
                          {p.loaded}/{p.total}
                        </span>
                      </div>

                      <div
                        style={{
                          fontFamily: S.mono,
                          fontSize: "10px",
                          color: S.muted,
                          letterSpacing: ".06em",
                          marginBottom: ".5rem",
                        }}
                      >
                        {route.depot.name}
                        {route.driver ? ` · ${route.driver.firstName} ${route.driver.lastName}` : ""}
                        {route.zoneName ? ` · ${route.zoneName}` : ""}
                      </div>

                      {/* Mini progress bar */}
                      <div
                        style={{
                          height: 4,
                          background: "rgba(255,255,255,.06)",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${p.pct}%`,
                            background: p.pct === 100 ? S.green : S.accent,
                            height: "100%",
                            transition: "width .3s ease",
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right: Selected route detail */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
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
                            {selectedRoute.depot.name}
                            {selectedRoute.driver
                              ? ` · Driver: ${selectedRoute.driver.firstName} ${selectedRoute.driver.lastName}`
                              : ""}
                            {selectedRoute.zoneName
                              ? ` · Zone: ${selectedRoute.zoneName}`
                              : ""}
                            {" · "}{selectedRoute.date}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: ".75rem",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: S.mono,
                              fontSize: "12px",
                              fontWeight: 700,
                              color: progress?.pct === 100 ? S.green : S.accent,
                            }}
                          >
                            {progress?.loaded}/{progress?.total}
                          </span>
                          <button
                            type="button"
                            disabled={!selectedRoute.loadedAt}
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
                              border: selectedRoute.loadedAt
                                ? "1px solid rgba(245,158,11,.35)"
                                : `1px solid ${S.border}`,
                              background: selectedRoute.loadedAt
                                ? "rgba(245,158,11,.12)"
                                : "transparent",
                              color: selectedRoute.loadedAt ? S.accent : S.dim,
                              cursor: selectedRoute.loadedAt ? "pointer" : "not-allowed",
                              opacity: selectedRoute.loadedAt ? 1 : 0.5,
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
                            width: `${progress?.pct ?? 0}%`,
                            background:
                              progress?.pct === 100 ? S.green : S.accent,
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
                          placeholder="Scan or type tracking number..."
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
                          disabled={
                            !scanInput.trim() || loadParcelMutation.isPending
                          }
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
                            cursor:
                              !scanInput.trim() || loadParcelMutation.isPending
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              !scanInput.trim() || loadParcelMutation.isPending
                                ? 0.55
                                : 1,
                          }}
                        >
                          Scan
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
                        Parcels ({selectedRoute.parcels.length})
                      </div>
                      <div style={{ maxHeight: 440, overflowY: "auto" }}>
                        {selectedRoute.parcels.length === 0 ? (
                          <div
                            style={{
                              padding: "1rem",
                              fontFamily: S.mono,
                              color: S.muted,
                              fontSize: "12px",
                            }}
                          >
                            No parcels assigned to this route.
                          </div>
                        ) : (
                          selectedRoute.parcels.map((parcel) => {
                            const isLoaded =
                              parcel.status === ParcelStatus.Loaded;
                            return (
                              <div
                                key={parcel.id}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "24px 1fr auto auto auto auto",
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
                                  <div style={{ fontWeight: 600 }}>
                                    {parcel.trackingNumber}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: S.muted,
                                      marginTop: ".15rem",
                                    }}
                                  >
                                    {parcel.recipientAddress.city}
                                    {parcel.recipientAddress.state
                                      ? `, ${parcel.recipientAddress.state}`
                                      : ""}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: S.muted,
                                    letterSpacing: ".06em",
                                  }}
                                >
                                  {formatWeight(
                                    parcel.weight,
                                    parcel.weightUnit,
                                  )}
                                </span>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: S.muted,
                                    letterSpacing: ".06em",
                                  }}
                                >
                                  {parcel.contentItemsCount} item{parcel.contentItemsCount !== 1 ? "s" : ""}
                                </span>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: S.muted,
                                    letterSpacing: ".06em",
                                  }}
                                >
                                  {parcel.serviceType}
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
                      disabled={completeLoadingMutation.isPending}
                      style={{
                        width: "100%",
                        fontFamily: S.mono,
                        fontSize: "11px",
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        padding: ".75rem",
                        borderRadius: 8,
                        border:
                          progress?.pct === 100
                            ? "1px solid rgba(34,197,94,.4)"
                            : "1px solid rgba(245,158,11,.35)",
                        background:
                          progress?.pct === 100
                            ? "rgba(34,197,94,.1)"
                            : "rgba(245,158,11,.08)",
                        color:
                          progress?.pct === 100 ? S.green : S.accent,
                        cursor: completeLoadingMutation.isPending
                          ? "not-allowed"
                          : "pointer",
                        opacity: completeLoadingMutation.isPending
                          ? 0.55
                          : 1,
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
            <div
              style={{
                display: "flex",
                gap: ".75rem",
                justifyContent: "flex-end",
              }}
            >
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
