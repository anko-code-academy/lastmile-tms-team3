"use client";

import React, {
  useRef,
  useState,
  useTransition,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import TmNavbar from "@/components/TmNavbar";
import { sortParcelAction, SortParcelResult } from "@/lib/actions/sortParcel";
import { searchParcelsAction } from "@/lib/actions/parcels";
import {
  ParcelStatus,
  ParcelSortBy,
  SortDirection,
  type ParcelListItem,
  type PagedResult,
} from "@/lib/types/parcel";

type ScanOutcome = "sorted" | "missort" | "exception" | "error";

interface ScanRecord {
  id: string;
  trackingNumber: string;
  outcome: ScanOutcome;
  zoneName: string | null;
  binCode: string | null;
  errorMessage?: string;
  scannedAt: Date;
}

const PICK_LIST_PAGE_SIZE = 8;

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

export default function SortScanPage() {
  // ── Scan state ──────────────────────────────────────────────────────────
  const [trackingInput, setTrackingInput] = useState("");
  const [lastResult, setLastResult] = useState<SortParcelResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [isPending, startTransition] = useTransition();
  const trackingRef = useRef<HTMLInputElement>(null);

  // ── Parcel pick-list state ───────────────────────────────────────────────
  const [listSearch, setListSearch] = useState("");
  const [listSearchDebounced, setListSearchDebounced] = useState("");
  // pageHistory[i] = the "after" cursor used to fetch page i+1
  // pageHistory[0] is always null (first page, no cursor)
  const [pageHistory, setPageHistory] = useState<(string | null)[]>([null]);
  const [listResult, setListResult] = useState<PagedResult<ParcelListItem> | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  // Debounce list search
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

  // Fetch parcel pick-list
  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    searchParcelsAction({
      search: listSearchDebounced || null,
      status: [ParcelStatus.ReceivedAtDepot],
      dateFrom: null,
      dateTo: null,
      zoneIds: null,
      parcelType: null,
      sortBy: ParcelSortBy.TrackingNumber,
      sortDirection: SortDirection.Asc,
      cursor: currentCursor,
      pagingDirection: "forward",
      pageSize: PICK_LIST_PAGE_SIZE,
    })
      .then((r) => { if (!cancelled) setListResult(r); })
      .catch(() => { if (!cancelled) setListResult(null); })
      .finally(() => { if (!cancelled) setListLoading(false); });
    return () => { cancelled = true; };
  }, [listSearchDebounced, currentCursor, listRefreshKey]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleScan = useCallback((tracking: string) => {
    const trackingValue = tracking.trim();
    if (!trackingValue) return;

    setLastResult(null);
    setLastError(null);

    startTransition(async () => {
      try {
        const result = await sortParcelAction({
          trackingNumber: trackingValue,
          scannedZoneId: null,
          operatorName: null,
          locationCity: null,
          locationState: null,
          locationCountryCode: null,
        });

        setLastResult(result);
        setTrackingInput("");

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
            binCode: result.binCode,
            scannedAt: new Date(),
          },
          ...prev.slice(0, 49),
        ]);

        // Refresh pick-list so sorted parcel disappears
        setPageHistory([null]);
        setListRefreshKey((k) => k + 1);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setLastError(msg);
        setScanHistory((prev) => [
          {
            id: crypto.randomUUID(),
            trackingNumber: trackingValue,
            outcome: "error",
            zoneName: null,
            binCode: null,
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
    if (e.key === "Enter" && trackingInput.trim()) {
      handleScan(trackingInput);
    }
  };

  const handleSelectParcel = useCallback((trackingNumber: string) => {
    setTrackingInput(trackingNumber);
    trackingRef.current?.focus();
  }, []);

  const handleListNext = useCallback(() => {
    if (!listResult?.hasNextPage || !listResult.nextCursor) return;
    setPageHistory((prev) => [...prev, listResult.nextCursor!]);
  }, [listResult]);

  const handleListPrev = useCallback(() => {
    if (pageHistory.length <= 1) return;
    setPageHistory((prev) => prev.slice(0, -1));
  }, [pageHistory]);

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
      `}</style>
    <div
      style={{
        minHeight: "100vh",
        background: "#080c14",
        color: "#e2e8f0",
        fontFamily: mono,
      }}
    >
      <TmNavbar />

      <div
        style={{ padding: "2rem", maxWidth: 1360, margin: "0 auto" }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p
            style={{
              fontFamily: mono,
              fontSize: "10px",
              letterSpacing: ".2em",
              color: "#f59e0b",
              textTransform: "uppercase",
              marginBottom: ".375rem",
            }}
          >
            Depot Operations
          </p>
          <h1
            style={{
              fontFamily: mono,
              fontSize: "1.5rem",
              fontWeight: 800,
              margin: 0,
            }}
          >
            Sort &amp; Bin Assignment
          </h1>
          <p
            style={{
              margin: ".55rem 0 0",
              fontFamily: mono,
              fontSize: "11px",
              letterSpacing: ".06em",
              color: "#4a5f7a",
            }}
          >
            Scan parcels to assign bins for storage based on zone.
          </p>
        </div>

        <div
          style={{
            fontSize: "10px",
            letterSpacing: ".14em",
            color: "#475569",
            textTransform: "uppercase",
            marginBottom: ".5rem",
          }}
        >
          Parcels
          {listResult && (
            <span style={{ color: "#334155", marginLeft: ".5rem" }}>
              ({listResult.totalCount})
            </span>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px 1fr",
            gap: "1.25rem",
            alignItems: "start",
          }}
        >
            {/* ── Left: Parcel Pick-List ─────────────────────────── */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".5rem",
              }}
            >
              {/* Search */}
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search tracking number"
                className="tm-input"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 6,
                  color: "#e2e8f0",
                  fontFamily: mono,
                  fontSize: "12px",
                  padding: ".55rem .7rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* List */}
              <div
                style={{
                  maxHeight: 480,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: ".35rem",
                }}
              >
                {listLoading && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#334155",
                      textAlign: "center",
                      padding: "2rem 0",
                    }}
                  >
                    Loading…
                  </p>
                )}
                {!listLoading &&
                  listResult &&
                  listResult.items.length === 0 && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#334155",
                        textAlign: "center",
                        padding: "2rem 0",
                      }}
                    >
                      No parcels awaiting sort.
                    </p>
                  )}
                {!listLoading &&
                  listResult?.items.map((item) => (
                    <ParcelPickRow
                      key={item.id}
                      item={item}
                      isActive={item.trackingNumber === trackingInput}
                      onSelect={handleSelectParcel}
                    />
                  ))}
              </div>

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
                  onClick={handleListPrev}
                  disabled={pageHistory.length <= 1 || listLoading}
                  style={paginationBtn(pageHistory.length <= 1 || listLoading)}
                >
                  ← Prev
                </button>
                <span
                  style={{ fontSize: "10px", color: "#334155", fontFamily: mono }}
                >
                  Page {pageHistory.length}
                </span>
                <button
                  onClick={handleListNext}
                  disabled={!listResult?.hasNextPage || listLoading}
                  style={paginationBtn(!listResult?.hasNextPage || listLoading)}
                >
                  Next →
                </button>
              </div>

              {/* Scan history — below parcel list */}
              {scanHistory.length > 0 && (
                <div style={{ marginTop: ".5rem" }}>
                  <p
                    style={{
                      fontSize: "10px",
                      letterSpacing: ".16em",
                      color: "#475569",
                      textTransform: "uppercase",
                      marginBottom: ".25rem",
                    }}
                  >
                    Recent Scans
                  </p>
                  <div
                    style={{
                      background: "rgba(255,255,255,.03)",
                      border: "1px solid rgba(255,255,255,.06)",
                      borderRadius: "12px",
                      padding: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: ".5rem",
                        maxHeight: "250px",
                        overflowY: "auto",
                      }}
                    >
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
                            <p
                              style={{
                                fontSize: "12px",
                                color: "#cbd5e1",
                                marginBottom: "2px",
                              }}
                            >
                              {scan.trackingNumber}
                            </p>
                            <p style={{ fontSize: "10px", color: "#475569" }}>
                              {scan.zoneName
                                ? scan.binCode
                                  ? `${scan.zoneName} → ${scan.binCode}`
                                  : scan.zoneName
                                : scan.errorMessage ?? "—"}
                            </p>
                          </div>
                          <span
                            style={{
                              fontSize: "9px",
                              letterSpacing: ".12em",
                              color: outcomeColor[scan.outcome],
                              textTransform: "uppercase",
                            }}
                          >
                            {outcomeLabel[scan.outcome]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Scan Panel ───────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Scan input */}
              <div
                style={{
                  background: "rgba(255,255,255,.025)",
                  border: "1px solid rgba(255,255,255,.07)",
                  borderRadius: 12,
                  padding: "1.5rem",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    letterSpacing: ".16em",
                    color: "#4a5f7a",
                    textTransform: "uppercase",
                    marginBottom: ".5rem",
                  }}
                >
                  Scan Tracking Number
                </label>
                <div style={{ display: "flex", gap: ".5rem" }}>
                  <input
                    ref={trackingRef}
                    autoFocus
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    onKeyDown={handleTrackingKeyDown}
                    disabled={isPending}
                    placeholder="Scan or enter parcel tracking number"
                    className="tm-input"
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,.05)",
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 8,
                      padding: ".625rem 1rem",
                      color: "#e2e8f0",
                      fontFamily: mono,
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleScan(trackingInput)}
                    disabled={isPending || !trackingInput.trim()}
                    style={{
                      padding: ".5rem 1.25rem",
                      background:
                        isPending || !trackingInput.trim()
                          ? "#1e293b"
                          : "#f59e0b",
                      color:
                        isPending || !trackingInput.trim()
                          ? "#3a526e"
                          : "#000",
                      border: "none",
                      borderRadius: 6,
                      fontFamily: mono,
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      cursor:
                        isPending || !trackingInput.trim()
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {isPending ? "Processing..." : "Sort"}
                  </button>
                </div>
              </div>

              {/* Result Card */}
              {(lastResult || lastError) && (
                <ResultCard result={lastResult} error={lastError} />
              )}
            </div>
          </div>
        </div>
    </div>
    </>
  );
}

function paginationBtn(disabled: boolean): React.CSSProperties {
  return {
    fontFamily: mono,
    fontSize: "10px",
    padding: ".3rem .6rem",
    borderRadius: 4,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 1,
    background: "transparent",
    border: "1px solid rgba(255,255,255,.1)",
    color: "#4a5f7a",
  };
}

function ParcelPickRow({
  item,
  isActive,
  onSelect,
}: {
  item: ParcelListItem;
  isActive: boolean;
  onSelect: (trackingNumber: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(item.trackingNumber)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        width: "100%",
        padding: ".5rem .75rem",
        background: isActive
          ? "rgba(245,158,11,.12)"
          : "rgba(255,255,255,.03)",
        border: `1px solid ${isActive ? "rgba(245,158,11,.35)" : "rgba(255,255,255,.07)"}`,
        borderRadius: "6px",
        cursor: "pointer",
        textAlign: "left",
        transition: "background .12s, border-color .12s",
        fontFamily: mono,
      }}
    >
      <span
        style={{
          fontSize: "13px",
          color: isActive ? "#fcd34d" : "#cbd5e1",
          fontWeight: isActive ? 700 : 400,
          letterSpacing: ".02em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
        }}
      >
        {item.trackingNumber}
      </span>
      {item.zoneName && (
        <span
          style={{
            fontSize: "10px",
            color: "#475569",
            letterSpacing: ".06em",
            textTransform: "uppercase",
            marginTop: "2px",
          }}
        >
          {item.zoneName}
        </span>
      )}
    </button>
  );
}

function ResultCard({
  result,
  error,
}: {
  result: SortParcelResult | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div
        style={{
          background: "rgba(239,68,68,.08)",
          border: "1px solid rgba(239,68,68,.3)",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            letterSpacing: ".16em",
            color: "#ef4444",
            textTransform: "uppercase",
            marginBottom: ".5rem",
          }}
        >
          Error
        </p>
        <p style={{ fontSize: "14px", color: "#fca5a5", fontFamily: mono }}>
          {error}
        </p>
      </div>
    );
  }

  if (!result) return null;

  if (result.isUnsortable) {
    return (
      <div
        style={{
          background: "rgba(245,158,11,.08)",
          border: "1px solid rgba(245,158,11,.35)",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            letterSpacing: ".16em",
            color: "#f59e0b",
            textTransform: "uppercase",
            marginBottom: ".5rem",
          }}
        >
          ⚠ Unsortable — Route to Exception Area
        </p>
        <p
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#fcd34d",
            marginBottom: ".5rem",
          }}
        >
          {result.trackingNumber}
        </p>
        <p style={{ fontSize: "12px", color: "#92400e" }}>
          No zone assigned. Parcel moved to Exception status. Place in exception
          bin for manual review.
        </p>
      </div>
    );
  }

  if (result.isMissort) {
    return (
      <div
        style={{
          background: "rgba(239,68,68,.08)",
          border: "1px solid rgba(239,68,68,.35)",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            letterSpacing: ".16em",
            color: "#ef4444",
            textTransform: "uppercase",
            marginBottom: ".5rem",
          }}
        >
          ✗ Mis-Sort Alert
        </p>
        <p
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#fca5a5",
            marginBottom: ".75rem",
          }}
        >
          {result.trackingNumber}
        </p>
        <div
          style={{
            background: "rgba(255,255,255,.04)",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: ".12em",
              marginBottom: ".25rem",
            }}
          >
            Correct Zone
          </p>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "#10b981" }}>
            {result.zoneName ?? "Unknown"}
          </p>
        </div>
        <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: ".75rem" }}>
          Move parcel to the correct bin above. Parcel was NOT sorted — scan
          again after moving.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(16,185,129,.08)",
        border: "1px solid rgba(16,185,129,.3)",
        borderRadius: "12px",
        padding: "1.5rem",
      }}
    >
      <p
        style={{
          fontSize: "10px",
          letterSpacing: ".16em",
          color: "#10b981",
          textTransform: "uppercase",
          marginBottom: ".5rem",
        }}
      >
        ✓ Sorted
      </p>
      <p
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "#6ee7b7",
          marginBottom: ".75rem",
        }}
      >
        {result.trackingNumber}
      </p>
      <div
        style={{
          background: "rgba(255,255,255,.04)",
          borderRadius: "8px",
          padding: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "10px",
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: ".12em",
              marginBottom: ".25rem",
            }}
          >
            {result.binCode ? "Place in Bin" : "Place in Zone"}
          </p>
          <p
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: "#e2e8f0",
              letterSpacing: "-.02em",
            }}
          >
            {result.binCode
              ? `${result.zoneName ?? "—"} → ${result.binCode}`
              : (result.zoneName ?? "—")}
          </p>
        </div>
      </div>
    </div>
  );
}
