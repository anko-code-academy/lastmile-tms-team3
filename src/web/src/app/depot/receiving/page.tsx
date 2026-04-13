"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import TmNavbar from "@/components/TmNavbar";
import {
  useInboundManifests,
  useStartReceivingSession,
  useReceiveParcel,
  useCompleteReceivingSession,
  useReceiveWalkInParcel,
} from "@/lib/hooks/useInboundManifests";
import type { InboundManifest } from "@/lib/types/inboundManifest";
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
  mono: "var(--font-geist-mono, monospace)" as const,
};

const DOCK_DOORS = [
  "Dock 1",
  "Dock 2",
  "Dock 3",
  "Dock 4",
  "Dock 5",
  "Door A",
  "Door B",
  "Door C",
];

type ScanMode = "manifest" | "walkin";

type ConfirmDialog =
  | { open: false }
  | { open: true; title: string; message: string; onConfirm: () => void };

interface ScanRecord {
  id: string;
  trackingNumber: string;
  success: boolean;
  message: string;
  scannedAt: Date;
}

function getProgress(manifest: InboundManifest) {
  const total = manifest.parcels.length;
  const received = manifest.parcels.filter(
    (p) => p.status === ParcelStatus.ReceivedAtDepot,
  ).length;
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;
  return { total, received, pct };
}

function getParcelIndicator(status: string) {
  if (status === ParcelStatus.ReceivedAtDepot) {
    return { symbol: "\u2713", color: S.green };
  }
  if (status === "EXCEPTION") {
    return { symbol: "\u2717", color: S.red };
  }
  return { symbol: "\u25CB", color: S.dim };
}

export default function ReceivingPage() {
  const { data: session } = useSession();
  const operatorName = session?.user?.name ?? "Unknown";

  // Manifest list search + paging
  const [listSearch, setListSearch] = useState("");
  const [listSearchDebounced, setListSearchDebounced] = useState("");
  const [pageHistory, setPageHistory] = useState<(string | null)[]>([null]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setListSearchDebounced(listSearch), 400);
    return () => clearTimeout(t);
  }, [listSearch]);

  // Reset to first page when search changes
  useEffect(() => {
    setPageHistory([null]);
  }, [listSearchDebounced]);

  const currentCursor = useMemo(
    () => pageHistory[pageHistory.length - 1] ?? null,
    [pageHistory],
  );

  const { data: manifestsData, isLoading, error } = useInboundManifests({
    search: listSearchDebounced || undefined,
    after: currentCursor,
  });
  const startSessionMutation = useStartReceivingSession();
  const receiveParcelMutation = useReceiveParcel();
  const completeSessionMutation = useCompleteReceivingSession();
  const receiveWalkInMutation = useReceiveWalkInParcel();

  const [scanMode, setScanMode] = useState<ScanMode>("manifest");
  const [selectedManifestId, setSelectedManifestId] = useState<string>("");
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [dockDoor, setDockDoor] = useState(DOCK_DOORS[0]);
  const [scanInput, setScanInput] = useState("");
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({ open: false });
  const [lastCompletionResult, setLastCompletionResult] = useState<{
    manifestNumber: string;
    receivedCount: number;
    missingCount: number;
    misdirectedCount: number;
  } | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  const manifests = manifestsData?.nodes ?? [];
  const pageInfo = manifestsData?.pageInfo;
  const totalCount = manifestsData?.totalCount ?? 0;
  const selectedManifest = manifests.find((m) => m.id === selectedManifestId);
  const progress = selectedManifest ? getProgress(selectedManifest) : null;

  // The manifest that currently has an active scanning session
  const activeManifestId = manifests.find((m) =>
    m.sessions.some((s) => s.status === "OPEN"),
  )?.id;

  // Is ANY manifest currently being scanned?
  const hasActiveSession = !!activeManifestId;

  function focusScanInput() {
    setTimeout(() => scanInputRef.current?.focus(), 0);
  }

  function selectManifest(id: string) {
    setSelectedManifestId(id);
    setScanInput("");

    const manifest = manifests.find((m) => m.id === id);
    const openSession = manifest?.sessions.find((s) => s.status === "OPEN");
    if (openSession) {
      setActiveSessionId(openSession.id);
      setDockDoor(openSession.dockDoor ?? DOCK_DOORS[0]);
      focusScanInput();
    }
    // Keep activeSessionId intact — scan input stays for the active session
  }

  function handleTabChange(mode: ScanMode) {
    if (mode === "walkin" && hasActiveSession) return;
    setScanMode(mode);
    setScanInput("");
    setLastCompletionResult(null);
    if (mode === "walkin") {
      setSelectedManifestId("");
      focusScanInput();
    }
  }

  // ── Manifest mode handlers ──────────────────────────────

  async function handleStartSession(manifestId: string) {
    try {
      const result = await startSessionMutation.mutateAsync({
        manifestId,
        dockDoor,
      });
      setActiveSessionId(result.sessionId);
      setSelectedManifestId(manifestId);
      setLastCompletionResult(null);
      focusScanInput();
      toast.success("Scanning session started.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start session.",
      );
    }
  }

  async function handleManifestScan() {
    const trackingNumber = scanInput.trim();
    if (!trackingNumber || !activeSessionId) return;

    try {
      const result = await receiveParcelMutation.mutateAsync({
        trackingNumber,
        sessionId: activeSessionId,
        operatorName,
      });

      if (result.isAlreadyReceived) {
        const msg = result.isUnexpected
          ? `Parcel ${trackingNumber} already scanned (exception).`
          : `Parcel ${trackingNumber} already scanned.`;
        toast.warning(msg);
        addScanRecord(trackingNumber, false, msg);
      } else if (result.isUnexpected) {
        const msg = `Parcel ${trackingNumber} flagged as misdirected (not in manifest).`;
        toast.error(msg);
        addScanRecord(trackingNumber, false, msg);
      } else {
        const msg = `Parcel ${trackingNumber} received.`;
        toast.success(msg);
        addScanRecord(trackingNumber, true, msg);
      }
      setScanInput("");
      focusScanInput();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to receive parcel.";
      toast.error(msg);
      setScanInput("");
      focusScanInput();
    }
  }

  async function handleCompleteSession() {
    if (!activeSessionId) return;

    const activeManifest = manifests.find((m) =>
      m.sessions.some((s) => s.id === activeSessionId),
    );
    if (!activeManifest) return;

    const missingParcels = activeManifest.parcels.filter(
      (p) => p.status === ParcelStatus.Registered,
    );

    if (missingParcels.length > 0) {
      setConfirmDialog({
        open: true,
        title: "Unscanned Parcels",
        message: `${missingParcels.length} parcel(s) not yet received: ${missingParcels.map((p) => p.trackingNumber).join(", ")}. Missing parcels will be marked as Exception. Complete receiving?`,
        onConfirm: () => {
          setConfirmDialog({ open: false });
          executeCompleteSession();
        },
      });
      return;
    }

    await executeCompleteSession();
  }

  async function executeCompleteSession() {
    if (!activeSessionId) return;

    try {
      const result = await completeSessionMutation.mutateAsync({
        sessionId: activeSessionId,
        confirmedBy: operatorName,
      });

      toast.success(
        `Receiving complete. ${result.receivedCount} received, ${result.missingCount} missing, ${result.misdirectedCount} misdirected.`,
      );
      const completedManifest = manifests.find((m) =>
        m.sessions.some((s) => s.id === activeSessionId),
      );
      setLastCompletionResult({
        manifestNumber: completedManifest?.manifestNumber ?? "",
        receivedCount: result.receivedCount,
        missingCount: result.missingCount,
        misdirectedCount: result.misdirectedCount,
      });
      setActiveSessionId("");
      setPageHistory([null]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to complete session.",
      );
    }
  }

  // ── Walk-in mode handlers ───────────────────────────────

  async function handleWalkInScan() {
    const trackingNumber = scanInput.trim();
    if (!trackingNumber) return;

    try {
      const result = await receiveWalkInMutation.mutateAsync({
        trackingNumber,
        dockDoor,
        operatorName,
      });

      const msg = result.isMisdirected
        ? `Parcel ${trackingNumber} flagged as misdirected (belongs to a manifest).`
        : `Parcel ${trackingNumber} received (walk-in).`;

      if (result.isMisdirected) {
        toast.error(msg);
      } else {
        toast.success(msg);
      }

      addScanRecord(trackingNumber, !result.isMisdirected, msg);
      setScanInput("");
      focusScanInput();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to receive parcel.";
      toast.error(msg);
      setScanInput("");
      focusScanInput();
    }
  }

  // ── Shared helpers ──────────────────────────────────────

  function addScanRecord(trackingNumber: string, success: boolean, message: string) {
    setScanHistory((prev) => [
      { id: crypto.randomUUID(), trackingNumber, success, message, scannedAt: new Date() },
      ...prev.slice(0, 49),
    ]);
  }

  const handleScan = scanMode === "walkin" ? handleWalkInScan : handleManifestScan;
  const isScanning = receiveParcelMutation.isPending || receiveWalkInMutation.isPending;

  const handleListNext = useCallback(() => {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;
    setPageHistory((prev) => [...prev, pageInfo.endCursor!]);
  }, [pageInfo]);

  const handleListPrev = useCallback(() => {
    if (pageHistory.length <= 1) return;
    setPageHistory((prev) => prev.slice(0, -1));
  }, [pageHistory]);

  // ── Render ──────────────────────────────────────────────

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .rcv-card:hover { border-color: rgba(245,158,11,.25) !important; }
        .rcv-card.rcv-selected { border-color: rgba(245,158,11,.4) !important; background: rgba(245,158,11,.04) !important; }
        @keyframes rcv-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
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
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <h1
                style={{
                  fontFamily: S.mono,
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                Inbound Receiving
              </h1>

              {/* Tab selector */}
              <div style={{ display: "flex", gap: 0, marginLeft: "1rem" }}>
                <button
                  type="button"
                  onClick={() => handleTabChange("manifest")}
                  disabled={scanMode === "manifest"}
                  style={{
                    fontFamily: S.mono,
                    fontSize: "11px",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    padding: ".4rem .85rem",
                    borderRadius: "6px 0 0 6px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: scanMode === "manifest" ? "rgba(245,158,11,.4)" : S.border,
                    background: scanMode === "manifest" ? "rgba(245,158,11,.12)" : "transparent",
                    color: scanMode === "manifest" ? S.accent : S.muted,
                    cursor: scanMode === "manifest" ? "default" : "pointer",
                  }}
                >
                  Manifest
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("walkin")}
                  disabled={scanMode === "walkin" || hasActiveSession}
                  style={{
                    fontFamily: S.mono,
                    fontSize: "11px",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    padding: ".4rem .85rem",
                    borderRadius: "0 6px 6px 0",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: scanMode === "walkin" ? "rgba(245,158,11,.4)" : S.border,
                    marginLeft: -1,
                    background: scanMode === "walkin" ? "rgba(245,158,11,.12)" : "transparent",
                    color: scanMode === "walkin" ? S.accent : hasActiveSession ? S.dim : S.muted,
                    cursor: scanMode === "walkin" ? "default" : hasActiveSession ? "not-allowed" : "pointer",
                    opacity: hasActiveSession && scanMode !== "walkin" ? 0.5 : 1,
                  }}
                >
                  Walk-in
                </button>
              </div>
            </div>
            <p
              style={{
                margin: ".55rem 0 0",
                fontFamily: S.mono,
                fontSize: "11px",
                letterSpacing: ".06em",
                color: S.muted,
              }}
            >
              {scanMode === "manifest"
                ? "Scan parcels against manifests arriving on trucks."
                : "Scan walk-in parcels delivered in person."}
            </p>
          </div>

          {error ? (
            <p style={{ fontFamily: S.mono, color: S.red }}>{String(error)}</p>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "340px 1fr",
              gap: "1.25rem",
              alignItems: "start",
            }}
          >
            {/* ── Left column: manifests + scan history ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
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
                Manifests ({totalCount})
              </div>

              {/* Search */}
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search by manifest or tracking number..."
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

              {isLoading ? (
                <p style={{ fontFamily: S.mono, color: S.muted, fontSize: "11px", padding: "1rem 0" }}>
                  Loading...
                </p>
              ) : manifests.length === 0 ? (
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
                  {listSearchDebounced
                    ? "No manifests match your search."
                    : "No open or sealed manifests found."}
                </div>
              ) : null}

              {manifests.map((manifest) => {
                  const p = getProgress(manifest);
                  const isSelected = manifest.id === selectedManifestId;
                  const isActive = manifest.id === activeManifestId;
                  const hasOpenSession = manifest.sessions.some((s) => s.status === "OPEN");
                  const isDimmed = scanMode === "walkin";

                  // Show "Begin scanning" inside this manifest card when:
                  // - In manifest mode, this manifest is selected, no active session anywhere
                  // - Or this manifest is selected and has its own open session (show scanning status)
                  const showBeginScanning =
                    scanMode === "manifest" &&
                    isSelected &&
                    !hasActiveSession &&
                    !hasOpenSession;

                  const showActiveScanning =
                    scanMode === "manifest" &&
                    isActive &&
                    hasOpenSession;

                  return (
                    <div
                      key={manifest.id}
                      style={{
                        position: "relative",
                        borderRadius: 10,
                        overflow: "hidden",
                        opacity: isDimmed ? 0.4 : 1,
                      }}
                    >
                      {/* Active session left stripe */}
                      {isActive && !isDimmed ? (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 3,
                            background: S.accent,
                            animation: "rcv-pulse 2s ease-in-out infinite",
                          }}
                        />
                      ) : null}

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={isDimmed ? undefined : () => selectManifest(manifest.id)}
                        onKeyDown={isDimmed ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") selectManifest(manifest.id); }}
                        className={`rcv-card${isSelected && !isDimmed ? " rcv-selected" : ""}`}
                        style={{
                          background: isActive && !isDimmed
                            ? "rgba(245,158,11,.06)"
                            : isSelected && !isDimmed
                              ? "rgba(245,158,11,.04)"
                              : S.panel,
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: isActive && !isDimmed ? "rgba(245,158,11,.5)" : isSelected && !isDimmed ? "rgba(245,158,11,.4)" : S.border,
                          borderRadius: 10,
                          padding: ".85rem 1rem",
                          paddingLeft: isActive && !isDimmed ? "calc(1rem + 3px)" : "1rem",
                          cursor: isDimmed ? "default" : "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "border-color .15s, background .15s",
                          pointerEvents: isDimmed ? "none" : undefined,
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
                            {manifest.manifestNumber}
                          </span>
                          <span
                            style={{
                              fontFamily: S.mono,
                              fontSize: "10px",
                              color: p.pct === 100 ? S.green : hasOpenSession ? S.accent : S.muted,
                              fontWeight: 600,
                            }}
                          >
                            {isActive ? "SCANNING" : manifest.status}
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
                          {manifest.depot.name}
                          {" · "}{manifest.parcels.length} parcels
                          {" · "}{p.received}/{p.total} received
                        </div>

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

                        {/* "Begin scanning" button inside the manifest card */}
                        {showBeginScanning && (
                          <div
                            style={{ marginTop: ".65rem", display: "flex", gap: ".5rem", alignItems: "center" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={dockDoor}
                              onChange={(e) => setDockDoor(e.target.value)}
                              className="tm-input"
                              style={{
                                background: S.inputBg,
                                border: `1px solid ${S.inputBorder}`,
                                borderRadius: 6,
                                color: S.text,
                                padding: ".4rem .6rem",
                                fontFamily: S.mono,
                                fontSize: "11px",
                              }}
                            >
                              {DOCK_DOORS.map((door) => (
                                <option key={door} value={door} style={{ background: "#0d1424", color: "#e2e8f0" }}>
                                  {door}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleStartSession(manifest.id)}
                              disabled={startSessionMutation.isPending}
                              style={{
                                fontFamily: S.mono,
                                fontSize: "10px",
                                letterSpacing: ".08em",
                                textTransform: "uppercase",
                                padding: ".4rem .75rem",
                                borderRadius: 6,
                                border: "1px solid rgba(245,158,11,.35)",
                                background: "rgba(245,158,11,.12)",
                                color: S.accent,
                                cursor: startSessionMutation.isPending ? "not-allowed" : "pointer",
                                opacity: startSessionMutation.isPending ? 0.55 : 1,
                              }}
                            >
                              {startSessionMutation.isPending ? "Starting..." : "Begin scanning"}
                            </button>
                          </div>
                        )}

                        {/* Active scanning indicator */}
                        {showActiveScanning && (
                          <div
                            style={{
                              marginTop: ".5rem",
                              display: "flex",
                              alignItems: "center",
                              gap: ".5rem",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleCompleteSession()}
                              disabled={completeSessionMutation.isPending}
                              style={{
                                fontFamily: S.mono,
                                fontSize: "10px",
                                letterSpacing: ".08em",
                                textTransform: "uppercase",
                                padding: ".4rem .75rem",
                                borderRadius: 6,
                                width: "100%",
                                border: "1px solid rgba(34,197,94,.4)",
                                background: "rgba(34,197,94,.1)",
                                color: S.green,
                                cursor: completeSessionMutation.isPending ? "not-allowed" : "pointer",
                                opacity: completeSessionMutation.isPending ? 0.55 : 1,
                              }}
                            >
                              {completeSessionMutation.isPending
                                ? "Completing..."
                                : progress?.pct === 100
                                  ? "Complete Receiving"
                                  : `Complete (${p.total - p.received} unscanned)`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
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
                    onClick={handleListPrev}
                    disabled={pageHistory.length <= 1 || isLoading}
                    style={paginationBtn(pageHistory.length <= 1 || isLoading)}
                  >
                    Prev
                  </button>
                  <span
                    style={{ fontSize: "10px", color: "#334155", fontFamily: S.mono }}
                  >
                    Page {pageHistory.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleListNext}
                    disabled={!pageInfo?.hasNextPage || isLoading}
                    style={paginationBtn(!pageInfo?.hasNextPage || isLoading)}
                  >
                    Next
                  </button>
                </div>

                {/* Scan history — below manifest list */}
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
                                color: rec.success ? S.green : S.red,
                                fontSize: "12px",
                                width: 16,
                                textAlign: "center",
                              }}
                            >
                              {rec.success ? "\u2713" : "\u2717"}
                            </span>
                            <span style={{ fontWeight: 600 }}>{rec.trackingNumber}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Right column: scan input + dock/door + parcels ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* ── Walk-in mode ── */}
                {scanMode === "walkin" && (
                  <>
                    {/* Spacer to align with left column header */}
                    <div style={{ height: 10 }} />

                    {/* Scan input at top */}
                    <ScanInputPanel
                      inputRef={scanInputRef}
                      scanInput={scanInput}
                      setScanInput={setScanInput}
                      onScan={handleScan}
                      isScanning={isScanning}
                      label="Scan Parcel Barcode"
                      buttonText="Receive"
                      placeholder="Scan or enter tracking number..."
                    />

                    {/* Dock/door */}
                    <DockDoorSelect value={dockDoor} onChange={setDockDoor} />

                    {/* Manifest detail (view-only) */}
                    {selectedManifest && (
                      <ManifestDetail
                        manifest={selectedManifest}
                        progress={progress}
                      />
                    )}
                  </>
                )}

                {/* ── Manifest mode ── */}
                {scanMode === "manifest" && (
                  <>
                    {/* Spacer to align with left column "Manifests (N)" header */}
                    <div style={{ height: 10 }} />

                    {/* Scan input stays visible as long as any session is active */}
                    {hasActiveSession && (
                      <ScanInputPanel
                        inputRef={scanInputRef}
                        scanInput={scanInput}
                        setScanInput={setScanInput}
                        onScan={handleScan}
                        isScanning={isScanning}
                        label="Scan Tracking Number"
                        buttonText="Scan"
                        placeholder="Scan or type tracking number..."
                        dockDoor={dockDoor}
                      />
                    )}

                    {/* Color-coded completion summary */}
                    {lastCompletionResult && (
                      <CompletionSummary
                        result={lastCompletionResult}
                        onDismiss={() => setLastCompletionResult(null)}
                      />
                    )}

                    {!selectedManifest && !hasActiveSession && !lastCompletionResult ? (
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
                        Select a manifest to view parcels and begin scanning.
                      </div>
                    ) : selectedManifest ? (
                      <ManifestDetail
                        manifest={selectedManifest}
                        progress={progress}
                      />
                    ) : null}
                  </>
                )}
              </div>
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

// ── Pagination Button Style ──────────────────────────────

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

// ── Scan Input Panel ─────────────────────────────────────

function ScanInputPanel({
  inputRef,
  scanInput,
  setScanInput,
  onScan,
  isScanning,
  label,
  buttonText,
  placeholder,
  dockDoor,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  scanInput: string;
  setScanInput: (v: string) => void;
  onScan: () => void;
  isScanning: boolean;
  label: string;
  buttonText: string;
  placeholder: string;
  dockDoor?: string;
}) {
  return (
    <div
      style={{
        background: S.panel,
        border: `1px solid ${S.border}`,
        borderRadius: 12,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: ".5rem",
        }}
      >
        <label
          style={{
            fontSize: "10px",
            letterSpacing: ".16em",
            color: S.muted,
            textTransform: "uppercase",
          }}
        >
          {label}
        </label>
        {dockDoor ? (
          <span
            style={{
              fontFamily: S.mono,
              fontSize: "10px",
              color: S.dim,
              letterSpacing: ".06em",
            }}
          >
            {dockDoor}
          </span>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: ".5rem" }}>
        <input
          ref={inputRef}
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onScan();
          }}
          disabled={isScanning}
          placeholder={placeholder}
          autoFocus
          className="tm-input"
          style={{
            flex: 1,
            background: S.inputBg,
            border: `1px solid ${S.inputBorder}`,
            borderRadius: 8,
            padding: ".625rem 1rem",
            color: S.text,
            fontFamily: S.mono,
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={onScan}
          disabled={!scanInput.trim() || isScanning}
          style={{
            padding: ".5rem 1.25rem",
            background: !scanInput.trim() || isScanning ? "#1e293b" : S.accent,
            color: !scanInput.trim() || isScanning ? S.dim : "#000",
            border: "none",
            borderRadius: 6,
            fontFamily: S.mono,
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            cursor: !scanInput.trim() || isScanning ? "not-allowed" : "pointer",
          }}
        >
          {isScanning ? "Processing..." : buttonText}
        </button>
      </div>
    </div>
  );
}

// ── Dock/Door Select ─────────────────────────────────────

function DockDoorSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        background: S.panel,
        border: `1px solid ${S.border}`,
        borderRadius: 10,
        padding: "1rem 1.25rem",
        opacity: disabled ? 0.6 : 1,
      }}
    >
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
        Dock / Door
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="tm-input"
        style={{
          background: S.inputBg,
          border: `1px solid ${S.inputBorder}`,
          borderRadius: 6,
          color: S.text,
          padding: ".55rem .7rem",
          fontFamily: S.mono,
          fontSize: "12px",
        }}
      >
        {DOCK_DOORS.map((door) => (
          <option key={door} value={door} style={{ background: "#0d1424", color: "#e2e8f0" }}>
            {door}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Manifest Detail ──────────────────────────────────────

function ManifestDetail({
  manifest,
  progress,
}: {
  manifest: InboundManifest;
  progress: { total: number; received: number; pct: number } | null;
}) {
  return (
    <div
      style={{
        background: S.panel,
        border: `1px solid ${S.border}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${S.border}` }}>
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
              {manifest.manifestNumber}
            </div>
            <div
              style={{
                fontFamily: S.mono,
                fontSize: "11px",
                color: S.muted,
                letterSpacing: ".06em",
              }}
            >
              {manifest.depot.name}
              {" · "}
              {manifest.parcels.length} parcels
              {" · "}
              {manifest.status}
            </div>
          </div>
          <span
            style={{
              fontFamily: S.mono,
              fontSize: "12px",
              fontWeight: 700,
              color: progress?.pct === 100 ? S.green : S.accent,
            }}
          >
            {progress?.received}/{progress?.total}
          </span>
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
              background: progress?.pct === 100 ? S.green : S.accent,
              height: "100%",
              transition: "width .3s ease",
            }}
          />
        </div>
      </div>

      {/* Parcel list */}
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {manifest.parcels.length === 0 ? (
          <div
            style={{
              padding: "1rem",
              fontFamily: S.mono,
              color: S.muted,
              fontSize: "12px",
            }}
          >
            No parcels in this manifest.
          </div>
        ) : (
          manifest.parcels.map((parcel) => {
            const indicator = getParcelIndicator(parcel.status);
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
                <span style={{ color: indicator.color, fontSize: "14px" }}>
                  {indicator.symbol}
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>{parcel.trackingNumber}</div>
                  <div style={{ fontSize: "10px", color: S.muted, marginTop: ".15rem" }}>
                    {parcel.recipientAddress.city}
                    {parcel.recipientAddress.state ? `, ${parcel.recipientAddress.state}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: "10px", color: S.muted, letterSpacing: ".06em" }}>
                  {parcel.weight} {parcel.weightUnit.toLowerCase()}
                </span>
                <span style={{ fontSize: "10px", color: S.muted, letterSpacing: ".06em" }}>
                  {parcel.serviceType}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Completion Summary ────────────────────────────────────

function CompletionSummary({
  result,
  onDismiss,
}: {
  result: { manifestNumber: string; receivedCount: number; missingCount: number; misdirectedCount: number };
  onDismiss: () => void;
}) {
  return (
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
          alignItems: "center",
          marginBottom: ".75rem",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: S.mono,
              fontSize: "10px",
              letterSpacing: ".14em",
              color: S.muted,
              textTransform: "uppercase",
            }}
          >
            Receiving Complete
          </div>
          <div
            style={{
              fontFamily: S.mono,
              fontSize: "13px",
              fontWeight: 700,
              color: S.text,
              marginTop: ".2rem",
            }}
          >
            {result.manifestNumber}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            color: S.muted,
            cursor: "pointer",
            fontFamily: S.mono,
            fontSize: "11px",
            padding: ".2rem .4rem",
          }}
        >
          Dismiss
        </button>
      </div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.green }}>
            {result.receivedCount}
          </div>
          <div
            style={{
              fontFamily: S.mono,
              fontSize: "10px",
              color: S.muted,
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Received
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.red }}>
            {result.missingCount}
          </div>
          <div
            style={{
              fontFamily: S.mono,
              fontSize: "10px",
              color: S.muted,
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Missing
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.accent }}>
            {result.misdirectedCount}
          </div>
          <div
            style={{
              fontFamily: S.mono,
              fontSize: "10px",
              color: S.muted,
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Misdirected
          </div>
        </div>
      </div>
    </div>
  );
}
