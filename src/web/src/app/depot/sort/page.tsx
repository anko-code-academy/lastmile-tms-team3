"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import TmNavbar from "@/components/TmNavbar";
import { sortParcelAction, SortParcelResult } from "@/lib/actions/sortParcel";

type ScanOutcome = "sorted" | "missort" | "exception" | "error";

interface ScanRecord {
  id: string;
  trackingNumber: string;
  outcome: ScanOutcome;
  zoneName: string | null;
  errorMessage?: string;
  scannedAt: Date;
}

export default function SortScanPage() {
  const [trackingInput, setTrackingInput] = useState("");
  const [zoneInput, setZoneInput] = useState("");
  const [lastResult, setLastResult] = useState<SortParcelResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [isPending, startTransition] = useTransition();
  const trackingRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback((tracking: string, zone: string) => {
    const trackingValue = tracking.trim();
    if (!trackingValue) return;

    const scannedZoneId = zone.trim() || null;

    setLastResult(null);
    setLastError(null);

    startTransition(async () => {
      try {
        const result = await sortParcelAction({
          trackingNumber: trackingValue,
          scannedZoneId,
          operatorName: null,
          locationCity: null,
          locationState: null,
          locationCountryCode: null,
        });

        setLastResult(result);
        setTrackingInput("");
        setZoneInput("");

        const outcome: ScanOutcome = result.isUnsortable
          ? "exception"
          : result.isMissort
            ? "missort"
            : "sorted";

        setScanHistory((prev) => [
          {
            id: crypto.randomUUID(),
            trackingNumber: result.trackingNumber,
            outcome,
            zoneName: result.zoneName,
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
            zoneName: null,
            errorMessage: msg,
            scannedAt: new Date(),
          },
          ...prev.slice(0, 49),
        ]);
      } finally {
        trackingRef.current?.focus();
      }
    });
  }, []);

  const handleTrackingKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (trackingInput.trim()) {
        // Move focus to zone field so operator can optionally scan zone bin
        zoneRef.current?.focus();
      }
    }
  };

  const handleZoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleScan(trackingInput, zoneInput);
    }
  };

  const mono = "var(--font-geist-mono, monospace)";

  const outcomeColor: Record<ScanOutcome, string> = {
    sorted: "#10b981",
    missort: "#ef4444",
    exception: "#f59e0b",
    error: "#94a3b8",
  };

  const outcomeLabel: Record<ScanOutcome, string> = {
    sorted: "SORTED",
    missort: "MIS-SORT",
    exception: "EXCEPTION",
    error: "ERROR",
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
            Sort &amp; Zone Assignment
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", maxWidth: "960px" }}>
          {/* Scan Panel */}
          <div>
            {/* Scan Inputs */}
            <div style={{
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: "12px",
              padding: "1.5rem",
              marginBottom: "1rem",
            }}>
              {/* Step 1: Parcel barcode */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "10px",
                  letterSpacing: ".16em",
                  color: "#64748b",
                  textTransform: "uppercase",
                  marginBottom: ".5rem",
                }}>
                  Step 1 — Scan Parcel Barcode
                </label>
                <input
                  ref={trackingRef}
                  autoFocus
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  onKeyDown={handleTrackingKeyDown}
                  disabled={isPending}
                  placeholder="Scan parcel tracking number…"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: "8px",
                    padding: ".625rem 1rem",
                    color: "#e2e8f0",
                    fontFamily: mono,
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <p style={{ marginTop: ".375rem", fontSize: "11px", color: "#475569" }}>
                  Press Enter to advance to zone confirmation field.
                </p>
              </div>

              {/* Step 2: Zone bin barcode (optional) */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "10px",
                  letterSpacing: ".16em",
                  color: "#64748b",
                  textTransform: "uppercase",
                  marginBottom: ".5rem",
                }}>
                  Step 2 — Scan Zone Bin Barcode{" "}
                  <span style={{ color: "#334155", letterSpacing: "normal", textTransform: "none", fontSize: "10px" }}>
                    (optional — for mis-sort validation)
                  </span>
                </label>
                <input
                  ref={zoneRef}
                  value={zoneInput}
                  onChange={(e) => setZoneInput(e.target.value)}
                  onKeyDown={handleZoneKeyDown}
                  disabled={isPending}
                  placeholder="Scan zone bin ID — or leave empty and press Sort…"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: "8px",
                    padding: ".625rem 1rem",
                    color: "#e2e8f0",
                    fontFamily: mono,
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <p style={{ marginTop: ".375rem", fontSize: "11px", color: "#475569" }}>
                  Press Enter to submit. If zone does not match, a mis-sort alert will fire.
                </p>
              </div>

              {/* Submit button */}
              <button
                onClick={() => handleScan(trackingInput, zoneInput)}
                disabled={isPending || !trackingInput.trim()}
                style={{
                  padding: ".625rem 1.5rem",
                  background: isPending || !trackingInput.trim() ? "#1e293b" : "#f59e0b",
                  color: isPending || !trackingInput.trim() ? "#64748b" : "#0f172a",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: mono,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  cursor: isPending || !trackingInput.trim() ? "not-allowed" : "pointer",
                }}
              >
                {isPending ? "Processing…" : "Sort"}
              </button>
            </div>

            {/* Result Card */}
            {(lastResult || lastError) && (
              <ResultCard result={lastResult} error={lastError} mono={mono} />
            )}
          </div>

          {/* Scan History */}
          <div style={{
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.06)",
            borderRadius: "12px",
            padding: "1rem",
            height: "fit-content",
          }}>
            <p style={{
              fontSize: "10px",
              letterSpacing: ".16em",
              color: "#475569",
              textTransform: "uppercase",
              marginBottom: ".75rem",
            }}>
              Recent Scans
            </p>
            {scanHistory.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#334155" }}>No scans yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                {scanHistory.map((scan) => (
                  <div
                    key={scan.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: ".5rem .75rem",
                      background: "rgba(255,255,255,.03)",
                      borderRadius: "6px",
                      borderLeft: `3px solid ${outcomeColor[scan.outcome]}`,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: "12px", color: "#cbd5e1", marginBottom: "2px" }}>
                        {scan.trackingNumber}
                      </p>
                      <p style={{ fontSize: "10px", color: "#475569" }}>
                        {scan.zoneName ?? scan.errorMessage ?? "—"}
                      </p>
                    </div>
                    <span style={{
                      fontSize: "9px",
                      letterSpacing: ".12em",
                      color: outcomeColor[scan.outcome],
                      textTransform: "uppercase",
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

function ResultCard({
  result,
  error,
  mono,
}: {
  result: SortParcelResult | null;
  error: string | null;
  mono: string;
}) {
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

  if (result.isUnsortable) {
    return (
      <div style={{
        background: "rgba(245,158,11,.08)",
        border: "1px solid rgba(245,158,11,.35)",
        borderRadius: "12px",
        padding: "1.5rem",
      }}>
        <p style={{ fontSize: "10px", letterSpacing: ".16em", color: "#f59e0b", textTransform: "uppercase", marginBottom: ".5rem" }}>
          ⚠ Unsortable — Route to Exception Area
        </p>
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#fcd34d", marginBottom: ".5rem" }}>
          {result.trackingNumber}
        </p>
        <p style={{ fontSize: "12px", color: "#92400e" }}>
          No zone assigned. Parcel moved to Exception status. Place in exception bin for manual review.
        </p>
      </div>
    );
  }

  if (result.isMissort) {
    return (
      <div style={{
        background: "rgba(239,68,68,.08)",
        border: "1px solid rgba(239,68,68,.35)",
        borderRadius: "12px",
        padding: "1.5rem",
      }}>
        <p style={{ fontSize: "10px", letterSpacing: ".16em", color: "#ef4444", textTransform: "uppercase", marginBottom: ".5rem" }}>
          ✗ Mis-Sort Alert
        </p>
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#fca5a5", marginBottom: ".75rem" }}>
          {result.trackingNumber}
        </p>
        <div style={{ background: "rgba(255,255,255,.04)", borderRadius: "8px", padding: "1rem" }}>
          <p style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: ".25rem" }}>
            Correct Zone
          </p>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "#10b981" }}>
            {result.zoneName ?? "Unknown"}
          </p>
        </div>
        <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: ".75rem" }}>
          Move parcel to the correct bin above. Parcel was NOT sorted — scan again after moving.
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
        ✓ Sorted
      </p>
      <p style={{ fontSize: "18px", fontWeight: 700, color: "#6ee7b7", marginBottom: ".75rem" }}>
        {result.trackingNumber}
      </p>
      <div style={{
        background: "rgba(255,255,255,.04)",
        borderRadius: "8px",
        padding: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
      }}>
        <div>
          <p style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: ".25rem" }}>
            {result.binCode ? "Place in Bin" : "Place in Zone"}
          </p>
          <p style={{ fontSize: "28px", fontWeight: 900, color: "#e2e8f0", letterSpacing: "-.02em" }}>
            {result.binCode
              ? `${result.zoneName ?? "—"} → ${result.binCode}`
              : (result.zoneName ?? "—")}
          </p>
        </div>
      </div>
    </div>
  );
}
