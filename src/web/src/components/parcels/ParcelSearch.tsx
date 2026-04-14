"use client";

import React, { useState, useEffect } from "react";
import type {
  ParcelListItem,
  ParcelSortBy,
  PagedResult,
  SearchParcelInput,
} from "@/lib/types/parcel";
import {
  ParcelStatus,
  ParcelSortBy as SortByEnum,
  SortDirection as SortDirEnum,
} from "@/lib/types/parcel";
import { ParcelTable } from "@/components/parcels/ParcelTable";
import { searchParcelsAction } from "@/lib/actions/parcels";
import { getZones } from "@/lib/api/zones";
import type { ZoneDto } from "@/lib/types/zone";

const S = {
  panel:       "rgba(255,255,255,.025)" as const,
  border:      "rgba(255,255,255,.07)"  as const,
  text:        "#e2e8f0"                as const,
  muted:       "#647a96"                as const,
  dim:         "#4e6480"                as const,
  accent:      "#f59e0b"                as const,
  inputBg:     "rgba(255,255,255,.05)"  as const,
  inputBorder: "rgba(255,255,255,.1)"   as const,
  mono:        "var(--font-geist-mono, monospace)" as const,
};

type SortableParcelColumn = "trackingNumber" | "status" | "createdAt";

const STATUS_OPTIONS: { label: string; value: ParcelStatus }[] = [
  { label: "Registered",       value: ParcelStatus.Registered      },
  { label: "Received",         value: ParcelStatus.ReceivedAtDepot  },
  { label: "Sorted",           value: ParcelStatus.Sorted           },
  { label: "Staged",           value: ParcelStatus.Staged           },
  { label: "Loaded",           value: ParcelStatus.Loaded           },
  { label: "Out for Delivery", value: ParcelStatus.OutForDelivery   },
  { label: "Delivered",        value: ParcelStatus.Delivered        },
  { label: "Failed Attempt",   value: ParcelStatus.FailedAttempt    },
  { label: "Returned",         value: ParcelStatus.ReturnedToDepot  },
  { label: "Cancelled",        value: ParcelStatus.Cancelled        },
  { label: "Exception",        value: ParcelStatus.Exception        },
];

const SORT_BY_OPTIONS: { label: string; value: ParcelSortBy }[] = [
  { label: "Created At",       value: SortByEnum.CreatedAt      },
  { label: "Tracking Number",  value: SortByEnum.TrackingNumber },
  { label: "Status",           value: SortByEnum.Status         },
];

const PAGE_SIZE = 20;

function defaultInput(): SearchParcelInput {
  return {
    search: null,
    status: null,
    dateFrom: null,
    dateTo: null,
    zoneIds: null,
    parcelType: null,
    sortBy: SortByEnum.CreatedAt,
    sortDirection: SortDirEnum.Desc,
    cursor: null,
    pagingDirection: "forward",
    pageSize: PAGE_SIZE,
  };
}

interface ParcelSearchProps {
  initialResult: PagedResult<ParcelListItem>;
  initialInput?: SearchParcelInput;
}

export function ParcelSearch({
  initialResult,
  initialInput,
}: ParcelSearchProps) {
  const seededInput = initialInput ?? defaultInput();
  const [searchParams, setSearchParams] =
    useState<SearchParcelInput>(seededInput);
  const [searchInput, setSearchInput] =
    useState<SearchParcelInput>(seededInput);
  const [result, setResult] =
    useState<PagedResult<ParcelListItem>>(initialResult);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<ParcelStatus[]>(
    seededInput.status ?? [],
  );
  const [zones, setZones] = useState<ZoneDto[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>(
    seededInput.zoneIds ?? [],
  );

  useEffect(() => {
    getZones(undefined, false).then(setZones).catch(() => {});
  }, []);

  async function handleSearch() {
    setIsLoading(true);
    try {
      const input: SearchParcelInput = {
        ...searchInput,
        status: selectedStatuses.length > 0 ? selectedStatuses : null,
        zoneIds: selectedZoneIds.length > 0 ? selectedZoneIds : null,
        pageSize: PAGE_SIZE,
        cursor: null,
        pagingDirection: "forward",
      };
      setSearchParams(input);
      const data = await searchParcelsAction(input);
      setResult(data);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePrev() {
    if (!result.hasPreviousPage || !result.previousCursor) return;
    setIsLoading(true);
    try {
      const input: SearchParcelInput = { ...searchParams, cursor: result.previousCursor, pagingDirection: "backward" };
      const data = await searchParcelsAction(input);
      setResult(data);
      setSearchInput(searchParams);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNext() {
    if (!result.hasNextPage || !result.nextCursor) return;
    setIsLoading(true);
    try {
      const input: SearchParcelInput = { ...searchParams, cursor: result.nextCursor, pagingDirection: "forward" };
      const data = await searchParcelsAction(input);
      setResult(data);
      setSearchInput(searchParams);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTableSort(column: SortableParcelColumn) {
    setIsLoading(true);
    try {
      const sortBy = mapColumnToSortBy(column);
      const sortDirection =
        searchParams.sortBy === sortBy && searchParams.sortDirection === SortDirEnum.Asc
          ? SortDirEnum.Desc
          : SortDirEnum.Asc;
      const input: SearchParcelInput = { ...searchParams, sortBy, sortDirection, cursor: null, pagingDirection: "forward" };
      setSearchParams(input);
      setSearchInput((c) => ({ ...c, sortBy, sortDirection }));
      const data = await searchParcelsAction(input);
      setResult(data);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleStatus(status: ParcelStatus) {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  function toggleZone(zoneId: string) {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  }

  const pagBtn = (disabled: boolean): React.CSSProperties => ({
    fontFamily: S.mono,
    fontSize: "10px",
    padding: ".3rem .6rem",
    borderRadius: 4,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    background: "transparent",
    border: `1px solid ${S.border}`,
    color: S.muted,
  });

  const filterToggle = (active: boolean): React.CSSProperties => ({
    fontFamily: S.mono,
    fontSize: "10px",
    letterSpacing: ".1em",
    padding: ".25rem .6rem",
    borderRadius: 4,
    cursor: "pointer",
    background: active ? "rgba(245,158,11,.15)" : "rgba(255,255,255,.03)",
    border: `1px solid ${active ? "rgba(245,158,11,.4)" : "rgba(255,255,255,.08)"}`,
    color: active ? S.accent : S.muted,
    textTransform: "uppercase" as const,
    transition: "all .15s",
  });

  return (
    <>
      <style>{`
        .ps-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); outline: none; }
        .ps-input::placeholder { color: #3a526e; }
        .ps-btn:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
        .ps-select { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .45rem .75rem; font-size: .8rem; outline: none; font-family: var(--font-geist-mono,monospace); }
        .ps-select:focus { border-color: rgba(245,158,11,.45); }
        .ps-select option { background: #0f1929; color: #e2e8f0; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* ── Filter panel ── */}
        <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.25rem 1.5rem" }}>

          {/* Search + Date filters row */}
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1rem" }}>
            <div style={{ flex: "2 1 240px" }}>
              <label style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".4rem" }}>
                Search
              </label>
              <input
                className="ps-input"
                placeholder="Tracking number, recipient, address…"
                value={searchInput.search ?? ""}
                onChange={(e) => setSearchInput((p) => ({ ...p, search: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".45rem .75rem", fontSize: ".875rem", width: "100%", fontFamily: S.mono, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".4rem" }}>
                Date From
              </label>
              <input
                className="ps-input"
                type="date"
                value={searchInput.dateFrom ?? ""}
                onChange={(e) => setSearchInput((p) => ({ ...p, dateFrom: e.target.value || null }))}
                style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".45rem .75rem", fontSize: ".8rem", fontFamily: S.mono }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".4rem" }}>
                Date To
              </label>
              <input
                className="ps-input"
                type="date"
                value={searchInput.dateTo ?? ""}
                onChange={(e) => setSearchInput((p) => ({ ...p, dateTo: e.target.value || null }))}
                style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".45rem .75rem", fontSize: ".8rem", fontFamily: S.mono }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".4rem" }}>
                Parcel Type
              </label>
              <input
                className="ps-input"
                placeholder="e.g. Standard"
                value={searchInput.parcelType ?? ""}
                onChange={(e) => setSearchInput((p) => ({ ...p, parcelType: e.target.value || null }))}
                style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".45rem .75rem", fontSize: ".8rem", fontFamily: S.mono, width: "120px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".4rem" }}>
                Sort By
              </label>
              <select
                className="ps-select"
                value={searchInput.sortBy}
                onChange={(e) => setSearchInput((p) => ({ ...p, sortBy: e.target.value as ParcelSortBy }))}
              >
                {SORT_BY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".4rem" }}>
                Dir
              </label>
              <div style={{ display: "flex", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
                {[{ label: "↑ Asc", val: SortDirEnum.Asc }, { label: "↓ Desc", val: SortDirEnum.Desc }].map(({ label, val }) => {
                  const active = searchInput.sortDirection === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSearchInput((p) => ({ ...p, sortDirection: val }))}
                      style={{
                        fontFamily: S.mono, fontSize: "10px", padding: ".45rem .6rem",
                        background: active ? "rgba(245,158,11,.15)" : "transparent",
                        color: active ? S.accent : S.muted,
                        border: "none", cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Status filter */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".5rem" }}>
              Status
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".375rem" }}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleStatus(opt.value)}
                  style={filterToggle(selectedStatuses.includes(opt.value))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zone filter */}
          {zones.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".5rem" }}>
                Zone
              </label>
              <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                {Object.entries(
                  zones.reduce<Record<string, typeof zones>>((acc, zone) => {
                    const depot = zone.name.split(" — ")[0] ?? zone.name;
                    (acc[depot] ??= []).push(zone);
                    return acc;
                  }, {}),
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([depot, depotZones], i) => (
                    <React.Fragment key={depot}>
                      {i > 0 && <div style={{ width: 1, alignSelf: "stretch", background: S.border }} />}
                      <div style={{ display: "flex", flexDirection: "column", gap: ".375rem" }}>
                        <p style={{ fontFamily: S.mono, fontSize: "9px", color: S.dim, letterSpacing: ".1em" }}>{depot}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: ".375rem" }}>
                          {depotZones
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((zone) => (
                              <button
                                key={zone.id}
                                type="button"
                                onClick={() => toggleZone(zone.id)}
                                style={filterToggle(selectedZoneIds.includes(zone.id))}
                              >
                                {zone.name.split(" — ")[1] ?? zone.name}
                              </button>
                            ))}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
              </div>
            </div>
          )}

          {/* Search button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="ps-btn"
              onClick={handleSearch}
              disabled={isLoading}
              style={{
                fontFamily: S.mono,
                fontSize: "11px",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                padding: ".45rem .9rem",
                borderRadius: 6,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                background: "rgba(245,158,11,.12)",
                border: "1px solid rgba(245,158,11,.35)",
                color: S.accent,
              }}
            >
              {isLoading ? "Loading…" : "Search"}
            </button>
          </div>
        </div>

        {/* Results bar + pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, letterSpacing: ".06em" }}>
            {result.totalCount === 0
              ? "No results"
              : `${result.items.length} of ${result.totalCount} parcels`}
          </p>
          <div style={{ display: "flex", gap: ".4rem" }}>
            <button onClick={handlePrev} disabled={!result.hasPreviousPage || isLoading} style={pagBtn(!result.hasPreviousPage || isLoading)}>← Prev</button>
            <button onClick={handleNext} disabled={!result.hasNextPage || isLoading}    style={pagBtn(!result.hasNextPage || isLoading)}>Next →</button>
          </div>
        </div>

        {/* Table */}
        <ParcelTable
          items={result.items}
          sortField={mapSortByToColumn(searchParams.sortBy)}
          sortDir={searchParams.sortDirection === SortDirEnum.Desc ? "desc" : "asc"}
          onSort={handleTableSort}
        />

        {/* Bottom pagination */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: ".4rem" }}>
          <button onClick={handlePrev} disabled={!result.hasPreviousPage || isLoading} style={pagBtn(!result.hasPreviousPage || isLoading)}>← Prev</button>
          <button onClick={handleNext} disabled={!result.hasNextPage || isLoading}    style={pagBtn(!result.hasNextPage || isLoading)}>Next →</button>
        </div>

      </div>
    </>
  );
}

function mapColumnToSortBy(column: SortableParcelColumn): ParcelSortBy {
  switch (column) {
    case "trackingNumber": return SortByEnum.TrackingNumber;
    case "status":         return SortByEnum.Status;
    case "createdAt":
    default:               return SortByEnum.CreatedAt;
  }
}

function mapSortByToColumn(sortBy: ParcelSortBy): SortableParcelColumn {
  switch (sortBy) {
    case SortByEnum.TrackingNumber: return "trackingNumber";
    case SortByEnum.Status:         return "status";
    case SortByEnum.CreatedAt:
    default:                        return "createdAt";
  }
}
