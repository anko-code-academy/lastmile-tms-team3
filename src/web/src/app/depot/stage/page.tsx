"use client";

import { useRef, useState, useTransition, useCallback, useEffect } from "react";
import TmNavbar from "@/components/TmNavbar";
import {
  stageParcelAction,
  getDeliveryRoutesAction,
  getStagingStatusAction,
  type StageParcelResult,
  type DeliveryRoute,
  type StagingStatus,
} from "@/lib/actions/stageParcel";

type ScanOutcome = "staged" | "misstage" | "error";

interface ScanRecord {
  id: string;
  trackingNumber: string;
  outcome: ScanOutcome;
  routeName: string | null;
  errorMessage?: string;
  scannedAt: Date;
}

const mono = "var(--font-geist-mono, monospace)";

const outcomeColor: Record<ScanOutcome, string> = {
  staged: "#10b981",
  misstage: "#ef4444",
  error: "#94a3b8",
};

const outcomeLabel: Record<ScanOutcome, string> = {
  staged: "STAGED",
  misstage: "MIS-STAGE",
  error: "ERROR",
};

export default function StagePage() {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [stagingStatus, setStagingStatus] = useState<StagingStatus | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [lastResult, setLastResult] = useState<StageParcelResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [isPending, startTransition] = useTransition();
  const trackingRef = useRef<HTMLInputElement>(null);

  // Load routes for today on mount
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    getDeliveryRoutesAction(today).then(setRoutes).catch((err) => {
      console.error("Failed to load routes:", err);
    });
  }, []);

  // Refresh staging status when route changes
  useEffect(() => {
    if (!selectedRouteId) {
      setStagingStatus(null);
      return;
    }
    getStagingStatusAction(selectedRouteId).then(setStagingStatus).catch((err) => {
      console.error("Failed to load staging status:", err);
    });
  }, [selectedRouteId, scanHistory]);

  const handleScan = useCallback(
    (tracking: string) => {
      const trackingValue = tracking.trim();
      if (!trackingValue || !selectedRouteId) return;

      setLastResult(null);
      setLastError(null);

      startTransition(async () => {
        try {
          const result = await stageParcelAction({
            trackingNumber: trackingValue,
            routeId: selectedRouteId,
            operatorName: null,
            locationCity: null,
            locationState: null,
            locationCountryCode: null,
          });

          setLastResult(result);
          setTrackingInput("");

          const outcome: ScanOutcome = result.isMisstage ? "misstage" : "staged";

          setScanHistory((prev) => [
            {
              id: crypto.randomUUID(),
              trackingNumber: result.trackingNumber,
              outcome,
              routeName: result.routeName,
              scannedAt: new Date(),
            },
            ...prev.slice(0, 49),
          ]);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setLastError(msg);
          setScanHistory((prev) => [
            {
              id: crypto.randomUUID(),
              trackingNumber: trackingValue,
              outcome: "error",
              routeName: null,
              errorMessage: msg,
              scannedAt: new Date(),
            },
            ...prev.slice(0, 49),
          ]);
        } finally {
          trackingRef.current?.focus();
        }
      });
    },
    [selectedRouteId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleScan(trackingInput);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e2e8f0", position: "relative", overflow: "hidden", fontFamily: mono }}>
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)",
        backgroundSize: "52px 52px",
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <TmNavbar />
        <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: "2rem" }}>
            <p style={{ fontFamily: mono, fontSize: "10px", letterSpacing: ".2em", color: "#f59e0b", textTransform: "uppercase", marginBottom: ".375rem" }}>
              Depot Operations
            </p>
            <h1 style={{ fontFamily: mono, fontSize: "1.5rem", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-.02em", lineHeight: 1 }}>
              Staging for Route Load-Out
            </h1>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
            {/* Left: Route selection + scan */}
            <div>
              {/* Route selector */}
              <div style={{
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: "12px",
                padding: "1.5rem",
                marginBottom: "1rem",
              }}>
                <label style={{
                  display: "block", fontSize: "10px", letterSpacing: ".16em",
                  color: "#4a5f7a", textTransform: "uppercase", marginBottom: ".5rem",
                }}>
                  Select Route / Staging Area
                </label>
                {routes.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#3a526e" }}>
                    No active routes for today. Create routes in the dispatch board first.
                  </p>
                ) : (
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.12)",
                      borderRadius: "8px",
                      padding: ".625rem 1rem",
                      color: "#e2e8f0",
                      fontFamily: mono,
                      fontSize: "13px",
                      outline: "none",
                    }}
                  >
                    <option value="">— Choose a route —</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}{r.driverName ? ` · ${r.driverName}` : ""}{r.zoneName ? ` · ${r.zoneName}` : ""}
                      </option>
                    ))}
                  </select>
                )}

                {/* Staging status counter */}
                {stagingStatus && (
                  <div style={{
                    marginTop: "1rem",
                    display: "flex",
                    gap: "1.5rem",
                    padding: ".75rem 1rem",
                    background: "rgba(255,255,255,.03)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,.06)",
                  }}>
                    <div>
                      <p style={{ fontSize: "9px", letterSpacing: ".16em", color: "#3a526e", textTransform: "uppercase", marginBottom: ".25rem" }}>Staged</p>
                      <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981", letterSpacing: "-.02em", lineHeight: 1 }}>
                        {stagingStatus.stagedCount}
                      </p>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,.06)" }} />
                    <div>
                      <p style={{ fontSize: "9px", letterSpacing: ".16em", color: "#3a526e", textTransform: "uppercase", marginBottom: ".25rem" }}>Expected</p>
                      <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-.02em", lineHeight: 1 }}>
                        {stagingStatus.expectedCount}
                      </p>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,.06)" }} />
                    <div>
                      <p style={{ fontSize: "9px", letterSpacing: ".16em", color: "#3a526e", textTransform: "uppercase", marginBottom: ".25rem" }}>Remaining</p>
                      <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f59e0b", letterSpacing: "-.02em", lineHeight: 1 }}>
                        {Math.max(0, stagingStatus.expectedCount - stagingStatus.stagedCount)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Scan input */}
              <div style={{
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: "12px",
                padding: "1.5rem",
                marginBottom: "1rem",
              }}>
                <label style={{
                  display: "block", fontSize: "10px", letterSpacing: ".16em",
                  color: "#4a5f7a", textTransform: "uppercase", marginBottom: ".5rem",
                }}>
                  Scan Parcel Barcode
                </label>
                <div style={{ display: "flex", gap: ".75rem" }}>
                  <input
                    ref={trackingRef}
                    autoFocus
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isPending || !selectedRouteId}
                    placeholder={selectedRouteId ? "Scan parcel tracking number…" : "Select a route first"}
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.12)",
                      borderRadius: "8px",
                      padding: ".625rem 1rem",
                      color: "#e2e8f0",
                      fontFamily: mono,
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => handleScan(trackingInput)}
                    disabled={isPending || !trackingInput.trim() || !selectedRouteId}
                    style={{
                      padding: ".625rem 1.5rem",
                      background: isPending || !trackingInput.trim() || !selectedRouteId
                        ? "#1e293b" : "#f59e0b",
                      color: isPending || !trackingInput.trim() || !selectedRouteId
                        ? "#4a5f7a" : "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      fontFamily: mono,
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      cursor: isPending || !trackingInput.trim() || !selectedRouteId ? "not-allowed" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {isPending ? "…" : "Stage"}
                  </button>
                </div>
              </div>

              {/* Result card */}
              {(lastResult || lastError) && (
                <ResultCard result={lastResult} error={lastError} />
              )}
            </div>

            {/* Right: Scan history */}
            <div style={{
              background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "12px",
              padding: "1rem",
              height: "fit-content",
            }}>
              <p style={{
                fontSize: "10px", letterSpacing: ".16em",
                color: "#4a5f7a", textTransform: "uppercase", marginBottom: ".75rem",
              }}>
                Recent Scans
              </p>
              {scanHistory.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#3a526e" }}>No scans yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  {scanHistory.map((scan) => (
                    <div key={scan.id} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: ".5rem .75rem",
                      background: "rgba(255,255,255,.03)",
                      borderRadius: "6px",
                      borderLeft: `3px solid ${outcomeColor[scan.outcome]}`,
                    }}>
                      <div>
                        <p style={{ fontSize: "12px", color: "#e2e8f0", marginBottom: "2px" }}>
                          {scan.trackingNumber}
                        </p>
                        <p style={{ fontSize: "10px", color: "#4a5f7a" }}>
                          {scan.routeName ?? scan.errorMessage ?? "—"}
                        </p>
                      </div>
                      <span style={{
                        fontSize: "9px", letterSpacing: ".12em",
                        color: outcomeColor[scan.outcome], textTransform: "uppercase",
                      }}>
                        {outcomeLabel[scan.outcome]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result, error }: { result: StageParcelResult | null; error: string | null }) {
  if (error) {
    return (
      <div style={{
        background: "rgba(239,68,68,.08)",
        border: "1px solid rgba(239,68,68,.3)",
        borderRadius: "12px",
        padding: "1.5rem",
      }}>
        <p style={{ fontSize: "10px", letterSpacing: ".16em", color: "#ef4444", textTransform: "uppercase", marginBottom: ".5rem" }}>
          Error
        </p>
        <p style={{ fontSize: "14px", color: "#fca5a5", fontFamily: mono }}>{error}</p>
      </div>
    );
  }

  if (!result) return null;

  if (result.isMisstage) {
    return (
      <div style={{
        background: "rgba(239,68,68,.08)",
        border: "1px solid rgba(239,68,68,.35)",
        borderRadius: "12px",
        padding: "1.5rem",
      }}>
        <p style={{ fontSize: "10px", letterSpacing: ".16em", color: "#ef4444", textTransform: "uppercase", marginBottom: ".5rem" }}>
          ✗ Mis-Stage Alert
        </p>
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#fca5a5", marginBottom: ".75rem" }}>
          {result.trackingNumber}
        </p>
        <div style={{ background: "rgba(255,255,255,.04)", borderRadius: "8px", padding: "1rem" }}>
          <p style={{ fontSize: "10px", color: "#4a5f7a", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: ".25rem" }}>
            Correct Route
          </p>
          <p style={{ fontSize: "20px", fontWeight: 800, color: "#10b981" }}>
            {result.assignedRouteName ?? "—"}
          </p>
        </div>
        <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: ".75rem" }}>
          Move parcel to the correct staging area above. Parcel was NOT staged.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(16,185,129,.08)",
      border: "1px solid rgba(16,185,129,.3)",
      borderRadius: "12px",
      padding: "1.5rem",
    }}>
      <p style={{ fontSize: "10px", letterSpacing: ".16em", color: "#10b981", textTransform: "uppercase", marginBottom: ".5rem" }}>
        ✓ Staged
      </p>
      <p style={{ fontSize: "18px", fontWeight: 700, color: "#6ee7b7", marginBottom: ".75rem" }}>
        {result.trackingNumber}
      </p>
      <div style={{
        background: "rgba(255,255,255,.04)",
        borderRadius: "8px",
        padding: "1rem",
      }}>
        <p style={{ fontSize: "10px", color: "#4a5f7a", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: ".25rem" }}>
          Staging Area
        </p>
        <p style={{ fontSize: "24px", fontWeight: 900, color: "#e2e8f0", letterSpacing: "-.02em" }}>
          {result.routeName}
        </p>
      </div>
    </div>
  );
}
