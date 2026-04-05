"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TmNavbar from "@/components/TmNavbar";
import { useSearchDrivers } from "@/lib/hooks/useDrivers";
import type { DriverListItem, SearchDriversResult } from "@/lib/types/driver";

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

type SortField = "fullName" | "email" | "licenseNumber" | "createdAt";
type SortDir = "asc" | "desc";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

function getSortIndicator(isActive: boolean, direction: SortDir) {
  return isActive ? (direction === "asc" ? "↑" : "↓") : "↕";
}

const COLS: { label: string; field: SortField | null }[] = [
  { label: "Name", field: "fullName" },
  { label: "Email", field: "email" },
  { label: "License", field: "licenseNumber" },
  { label: "Depot", field: null },
  { label: "Status", field: null },
  { label: "Created", field: "createdAt" },
];

export default function DriversPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusInput, setStatusInput] = useState<StatusFilter>("ALL");
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>("ALL");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [after, setAfter] = useState<string | undefined>(undefined);
  const [before, setBefore] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<
    "forward" | "backward" | undefined
  >(undefined);

  const isActive =
    appliedStatus === "ALL" ? undefined : appliedStatus === "ACTIVE";

  const { data, isLoading: loading } = useSearchDrivers({
    isActive,
    search: appliedSearch || undefined,
    sortField,
    sortDirection: sortDir.toUpperCase() as "ASC" | "DESC",
    first: direction === "backward" ? undefined : 20,
    after: direction === "forward" ? after : undefined,
    last: direction === "backward" ? 20 : undefined,
    before: direction === "backward" ? before : undefined,
  });

  const result: SearchDriversResult = data ?? {
    items: [],
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  };

  function handleSearch() {
    setAppliedSearch(searchInput);
    setAppliedStatus(statusInput);
    setAfter(undefined);
    setBefore(undefined);
    setDirection(undefined);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  const drivers: DriverListItem[] = result.items;
  const hasNext = result.hasNextPage;
  const hasPrev = result.hasPreviousPage;

  function toggleSort(field: SortField) {
    setAfter(undefined);
    setBefore(undefined);
    setDirection(undefined);

    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .dr-row:hover { background: rgba(255,255,255,.03); cursor: pointer; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
        .tm-select { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .5rem .75rem; font-size: .875rem; width: 100%; outline: none; font-family: var(--font-geist-mono,monospace); }
        .tm-select:focus { border-color: rgba(245,158,11,.45); }
        .tm-select option { background: #0f1929; color: #e2e8f0; }
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
            style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: "2rem",
              }}
            >
              <div>
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
                  Management
                </p>
                <h1
                  style={{
                    fontFamily: S.mono,
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: S.text,
                    letterSpacing: "-.02em",
                    lineHeight: 1,
                  }}
                >
                  Drivers
                </h1>
              </div>
              <button
                className="tm-btn-primary"
                onClick={() => router.push("/admin/drivers/new")}
                style={{
                  fontFamily: S.mono,
                  fontSize: "11px",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  padding: ".45rem .9rem",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: "rgba(245,158,11,.12)",
                  border: "1px solid rgba(245,158,11,.35)",
                  color: S.accent,
                }}
              >
                + Add Driver
              </button>
            </div>

            {/* Filter bar */}
            <div
              style={{
                background: S.panel,
                border: `1px solid ${S.border}`,
                borderRadius: 10,
                padding: "1.25rem 1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: ".75rem",
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <label
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
                    Search
                  </label>
                  <input
                    className="tm-input"
                    placeholder="Name, email or license..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    style={{
                      background: S.inputBg,
                      border: `1px solid ${S.inputBorder}`,
                      color: S.text,
                      borderRadius: 6,
                      padding: ".5rem .75rem",
                      fontSize: ".875rem",
                      width: "280px",
                      outline: "none",
                      fontFamily: S.mono,
                    }}
                  />
                </div>
                <div>
                  <label
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
                    Status
                  </label>
                  <select
                    className="tm-select"
                    value={statusInput}
                    onChange={(e) =>
                      setStatusInput(e.target.value as StatusFilter)
                    }
                    style={{ width: "150px" }}
                  >
                    <option value="ALL">All</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div style={{ flex: 1 }} />
                <button
                  className="tm-btn-primary"
                  onClick={handleSearch}
                  style={{
                    fontFamily: S.mono,
                    fontSize: "11px",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    padding: ".45rem .9rem",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: "rgba(245,158,11,.12)",
                    border: "1px solid rgba(245,158,11,.35)",
                    color: S.accent,
                  }}
                >
                  Search
                </button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <p
                style={{
                  fontFamily: S.mono,
                  fontSize: ".875rem",
                  color: S.muted,
                }}
              >
                Loading...
              </p>
            ) : (
              <>
                <div
                  style={{
                    background: S.panel,
                    border: `1px solid ${S.border}`,
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: `1px solid ${S.border}`,
                          background: "rgba(255,255,255,.02)",
                        }}
                      >
                        {COLS.map(({ label, field }) => (
                          <th
                            key={label}
                            onClick={
                              field ? () => toggleSort(field) : undefined
                            }
                            style={{
                              padding: ".75rem 1rem",
                              textAlign: "left",
                              fontFamily: S.mono,
                              fontSize: "9px",
                              letterSpacing: ".14em",
                              color:
                                field && sortField === field
                                  ? S.accent
                                  : S.muted,
                              textTransform: "uppercase",
                              fontWeight: 600,
                              cursor: field ? "pointer" : "default",
                              userSelect: "none",
                            }}
                          >
                            {label}
                            {field
                              ? ` ${getSortIndicator(sortField === field, sortDir)}`
                              : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              padding: "3rem",
                              textAlign: "center",
                              fontFamily: S.mono,
                              fontSize: ".875rem",
                              color: S.dim,
                            }}
                          >
                            {appliedSearch || appliedStatus !== "ALL"
                              ? "No drivers match your filters."
                              : "No drivers yet. Add one to get started."}
                          </td>
                        </tr>
                      ) : (
                        drivers.map((d) => (
                          <tr
                            key={d.id}
                            className="dr-row"
                            onClick={() =>
                              router.push(`/admin/drivers/${d.id}`)
                            }
                            style={{
                              borderBottom: `1px solid rgba(255,255,255,.04)`,
                              transition: "background .15s",
                            }}
                          >
                            <td
                              style={{
                                padding: ".75rem 1rem",
                                fontFamily: S.mono,
                                fontWeight: 700,
                                color: S.text,
                              }}
                            >
                              {d.fullName}
                            </td>
                            <td
                              style={{
                                padding: ".75rem 1rem",
                                fontSize: ".875rem",
                                color: S.muted,
                              }}
                            >
                              {d.email}
                            </td>
                            <td
                              style={{
                                padding: ".75rem 1rem",
                                fontFamily: S.mono,
                                fontSize: ".8rem",
                                color: S.dim,
                              }}
                            >
                              {d.licenseNumber}
                            </td>
                            <td
                              style={{
                                padding: ".75rem 1rem",
                                fontSize: ".875rem",
                                color: S.muted,
                              }}
                            >
                              {d.depot?.name ?? "—"}
                            </td>
                            <td style={{ padding: ".75rem 1rem" }}>
                              <span
                                style={{
                                  fontFamily: S.mono,
                                  fontSize: "9px",
                                  letterSpacing: ".1em",
                                  padding: ".2rem .5rem",
                                  borderRadius: 4,
                                  border: `1px solid ${d.isActive ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`,
                                  color: d.isActive ? S.green : S.red,
                                  textTransform: "uppercase",
                                }}
                              >
                                {d.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: ".75rem 1rem",
                                fontFamily: S.mono,
                                fontSize: ".8rem",
                                color: S.dim,
                              }}
                            >
                              {new Date(d.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: ".75rem",
                  }}
                >
                  <p
                    style={{
                      fontFamily: S.mono,
                      fontSize: "10px",
                      color: S.dim,
                      letterSpacing: ".06em",
                    }}
                  >
                    {result.items.length} out of {result.totalCount} driver
                    {result.totalCount !== 1 ? "s" : ""}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: ".4rem",
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={() => {
                        if (!hasPrev) return;
                        setAfter(undefined);
                        setBefore(result.startCursor ?? undefined);
                        setDirection("backward");
                      }}
                      disabled={!hasPrev}
                      style={{
                        fontFamily: S.mono,
                        fontSize: "10px",
                        padding: ".3rem .6rem",
                        borderRadius: 4,
                        cursor: hasPrev ? "pointer" : "not-allowed",
                        opacity: hasPrev ? 1 : 0.4,
                        background: "transparent",
                        border: `1px solid ${S.border}`,
                        color: S.muted,
                      }}
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => {
                        if (!hasNext) return;
                        setBefore(undefined);
                        setAfter(result.endCursor ?? undefined);
                        setDirection("forward");
                      }}
                      disabled={!hasNext}
                      style={{
                        fontFamily: S.mono,
                        fontSize: "10px",
                        padding: ".3rem .6rem",
                        borderRadius: 4,
                        cursor: hasNext ? "pointer" : "not-allowed",
                        opacity: hasNext ? 1 : 0.4,
                        background: "transparent",
                        border: `1px solid ${S.border}`,
                        color: S.muted,
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
