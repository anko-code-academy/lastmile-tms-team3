"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import TmNavbar from "@/components/TmNavbar";
import {
  useInboundManifests,
  useStartReceivingSession,
  useReceiveParcel,
  useCompleteReceivingSession,
} from "@/lib/hooks/useInboundManifests";
import type {
  InboundManifest,
} from "@/lib/types/inboundManifest";
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

type ConfirmDialog =
  | { open: false }
  | {
      open: true;
      title: string;
      message: string;
      onConfirm: () => void;
    };

function getReceivedCount(manifest: InboundManifest) {
  return manifest.parcels.filter(
    (p) => p.status !== ParcelStatus.Registered,
  ).length;
}

function getProgress(manifest: InboundManifest) {
  const total = manifest.parcels.length;
  const received = getReceivedCount(manifest);
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;
  return { total, received, pct };
}

export default function ReceivingPage() {
  const { data: session } = useSession();
  const operatorName = session?.user?.name ?? "Unknown";

  const { data: manifestsData, isLoading, error } = useInboundManifests();
  const startSessionMutation = useStartReceivingSession();
  const receiveParcelMutation = useReceiveParcel();
  const completeSessionMutation = useCompleteReceivingSession();

  const [selectedManifestId, setSelectedManifestId] = useState<string>("");
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [dockDoor, setDockDoor] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    open: false,
  });

  const scanInputRef = useRef<HTMLInputElement>(null);

  const manifests = manifestsData?.nodes ?? [];
  const selectedManifest = manifests.find((m) => m.id === selectedManifestId);
  const progress = selectedManifest ? getProgress(selectedManifest) : null;

  // Check if selected manifest already has an open session
  const existingOpenSession = selectedManifest?.sessions.find(
    (s) => s.status === "OPEN",
  );

  function focusScanInput() {
    setTimeout(() => scanInputRef.current?.focus(), 0);
  }

  function selectManifest(id: string) {
    setSelectedManifestId(id);
    setScanInput("");

    // Check for existing open session
    const manifest = manifests.find((m) => m.id === id);
    const openSession = manifest?.sessions.find((s) => s.status === "OPEN");
    if (openSession) {
      setActiveSessionId(openSession.id);
      setDockDoor(openSession.dockDoor ?? "");
      focusScanInput();
    } else {
      setActiveSessionId("");
      setDockDoor("");
    }
  }

  async function handleStartSession() {
    if (!selectedManifestId) return;

    try {
      const result = await startSessionMutation.mutateAsync({
        manifestId: selectedManifestId,
        dockDoor: dockDoor || null,
      });
      setActiveSessionId(result.sessionId);
      focusScanInput();
      toast.success("Receiving session started.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start session.",
      );
    }
  }

  async function handleScan() {
    const trackingNumber = scanInput.trim();
    if (!trackingNumber || !activeSessionId) return;

    try {
      const result = await receiveParcelMutation.mutateAsync({
        trackingNumber,
        sessionId: activeSessionId,
        operatorName,
      });

      if (result.isUnexpected) {
        toast.warning(
          `Parcel ${trackingNumber} received (unexpected — not in manifest).`,
        );
      } else {
        toast.success(`Parcel ${trackingNumber} received.`);
      }
      setScanInput("");
      focusScanInput();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to receive parcel.",
      );
    }
  }

  async function handleCompleteSession() {
    if (!activeSessionId || !selectedManifest) return;

    // Frontend check: are there unscanned parcels?
    const missingParcels = selectedManifest.parcels.filter(
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
        `Receiving complete. ${result.receivedCount} received, ${result.missingCount} missing.`,
      );
      setActiveSessionId("");
      setSelectedManifestId("");
      setDockDoor("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to complete session.",
      );
    }
  }

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .rcv-card:hover { border-color: rgba(245,158,11,.25) !important; }
        .rcv-card.rcv-selected { border-color: rgba(245,158,11,.4) !important; background: rgba(245,158,11,.04) !important; }
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
              Inbound Receiving
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
              Scan parcels arriving on trucks and verify against manifests.
            </p>
          </div>

          {isLoading ? (
            <p style={{ fontFamily: S.mono, color: S.muted }}>
              Loading manifests...
            </p>
          ) : null}

          {error ? (
            <p style={{ fontFamily: S.mono, color: S.red }}>
              {String(error)}
            </p>
          ) : null}

          {!isLoading && manifests.length === 0 ? (
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
              No open or sealed manifests found.
            </div>
          ) : null}

          {!isLoading && manifests.length > 0 ? (
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
                Manifests ({manifests.length})
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "340px 1fr",
                  gap: "1.25rem",
                  alignItems: "start",
                }}
              >
                {/* Left: Manifest List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: ".5rem",
                  }}
                >
                  {manifests.map((manifest) => {
                    const p = getProgress(manifest);
                    const isSelected = manifest.id === selectedManifestId;
                    const hasOpenSession = manifest.sessions.some(
                      (s) => s.status === "OPEN",
                    );
                    return (
                      <button
                        key={manifest.id}
                        type="button"
                        onClick={() => selectManifest(manifest.id)}
                        className={`rcv-card${isSelected ? " rcv-selected" : ""}`}
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
                            {manifest.manifestNumber}
                          </span>
                          <span
                            style={{
                              fontFamily: S.mono,
                              fontSize: "10px",
                              color:
                                p.pct === 100
                                  ? S.green
                                  : hasOpenSession
                                    ? S.accent
                                    : S.muted,
                              fontWeight: 600,
                            }}
                          >
                            {manifest.status}
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
                          {hasOpenSession ? " · Session active" : ""}
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
                              background:
                                p.pct === 100 ? S.green : S.accent,
                              height: "100%",
                              transition: "width .3s ease",
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right: Selected manifest detail */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {!selectedManifest ? (
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
                      Select a manifest to begin receiving.
                    </div>
                  ) : (
                    <>
                      {/* Manifest header */}
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
                              {selectedManifest.manifestNumber}
                            </div>
                            <div
                              style={{
                                fontFamily: S.mono,
                                fontSize: "11px",
                                color: S.muted,
                                letterSpacing: ".06em",
                              }}
                            >
                              {selectedManifest.depot.name}
                              {" · "}
                              {selectedManifest.parcels.length} parcels
                              {" · "}
                              {selectedManifest.status}
                            </div>
                          </div>
                          <span
                            style={{
                              fontFamily: S.mono,
                              fontSize: "12px",
                              fontWeight: 700,
                              color:
                                progress?.pct === 100
                                  ? S.green
                                  : S.accent,
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
                              background:
                                progress?.pct === 100
                                  ? S.green
                                  : S.accent,
                              height: "100%",
                              transition: "width .3s ease",
                            }}
                          />
                        </div>
                      </div>

                      {/* Session Controls */}
                      {!activeSessionId && !existingOpenSession ? (
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
                              fontFamily: S.mono,
                              fontSize: "10px",
                              letterSpacing: ".14em",
                              color: S.muted,
                              textTransform: "uppercase",
                              marginBottom: ".5rem",
                            }}
                          >
                            Start Receiving Session
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: ".5rem",
                              alignItems: "center",
                            }}
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
                                padding: ".55rem .7rem",
                                fontFamily: S.mono,
                                fontSize: "12px",
                              }}
                            >
                              <option
                                value=""
                                style={{
                                  background: "#0d1424",
                                  color: "#e2e8f0",
                                }}
                              >
                                Select dock/door
                              </option>
                              {DOCK_DOORS.map((door) => (
                                <option
                                  key={door}
                                  value={door}
                                  style={{
                                    background: "#0d1424",
                                    color: "#e2e8f0",
                                  }}
                                >
                                  {door}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleStartSession}
                              disabled={!dockDoor || startSessionMutation.isPending}
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
                                cursor: !dockDoor || startSessionMutation.isPending
                                  ? "not-allowed"
                                  : "pointer",
                                opacity: !dockDoor || startSessionMutation.isPending
                                  ? 0.55
                                  : 1,
                              }}
                            >
                              Start
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {/* Scan Input */}
                      {activeSessionId || existingOpenSession ? (
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
                                !scanInput.trim() ||
                                receiveParcelMutation.isPending
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
                                  !scanInput.trim() ||
                                  receiveParcelMutation.isPending
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  !scanInput.trim() ||
                                  receiveParcelMutation.isPending
                                    ? 0.55
                                    : 1,
                              }}
                            >
                              Scan
                            </button>
                          </div>
                        </div>
                      ) : null}

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
                          Parcels ({selectedManifest.parcels.length})
                        </div>
                        <div style={{ maxHeight: 400, overflowY: "auto" }}>
                          {selectedManifest.parcels.length === 0 ? (
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
                            selectedManifest.parcels.map((parcel) => {
                              const isReceived =
                                parcel.status !== ParcelStatus.Registered;
                              return (
                                <div
                                  key={parcel.id}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "24px 1fr auto auto auto",
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
                                      color: isReceived
                                        ? S.green
                                        : S.dim,
                                      fontSize: "14px",
                                    }}
                                  >
                                    {isReceived ? "\u2713" : "\u25CB"}
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
                                    {parcel.weight} {parcel.weightUnit.toLowerCase()}
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
                                      color: isReceived
                                        ? S.green
                                        : S.muted,
                                      fontWeight: isReceived ? 600 : 400,
                                    }}
                                  >
                                    {parcel.status === "REGISTERED"
                                      ? "Pending"
                                      : "Received"}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Complete Receiving */}
                      {(activeSessionId || existingOpenSession) && (
                        <button
                          type="button"
                          onClick={() => handleCompleteSession()}
                          disabled={completeSessionMutation.isPending}
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
                            cursor: completeSessionMutation.isPending
                              ? "not-allowed"
                              : "pointer",
                            opacity: completeSessionMutation.isPending
                              ? 0.55
                              : 1,
                          }}
                        >
                          Complete Receiving
                        </button>
                      )}
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
