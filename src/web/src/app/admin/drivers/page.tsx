"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TmNavbar from "@/components/TmNavbar";
import { getDriversAction } from "@/lib/actions/drivers";
import type { DriverListItem, PagedDriversResult } from "@/lib/types/driver";

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

type SortField = "fullName" | "email" | "depotName" | "createdAt";
type SortDir = "asc" | "desc";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const COLS: { label: string; field: SortField | null }[] = [
  { label: "Name", field: "fullName" },
  { label: "Email", field: "email" },
  { label: "License", field: null },
  { label: "Depot", field: "depotName" },
  { label: "Status", field: null },
  { label: "Created", field: "createdAt" },
];

export default function DriversPage() {
  const router = useRouter();
  const [result, setResult] = useState<PagedDriversResult>({ items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const isActive = statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE";

  useEffect(() => {
    setLoading(true);
    getDriversAction(undefined, isActive, page, PAGE_SIZE)
      .then(setResult)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const drivers: DriverListItem[] = result.items;

  const filtered = drivers
    .filter((d) => {
      const q = search.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.licenseNumber.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "fullName") cmp = a.fullName.localeCompare(b.fullName);
      else if (sortField === "email") cmp = a.email.localeCompare(b.email);
      else if (sortField === "depotName") cmp = (a.depotName ?? "").localeCompare(b.depotName ?? "");
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  function handleStatusFilter(f: StatusFilter) {
    setStatusFilter(f);
    setPage(1);
  }

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .dr-row:hover { background: rgba(255,255,255,.03); cursor: pointer; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
      `}</style>
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />
          <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
              <div>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>Management</p>
                <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>Drivers</h1>
              </div>
              <button
                className="tm-btn-primary"
                onClick={() => router.push("/admin/drivers/new")}
                style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: "pointer", background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent }}
              >
                + Add Driver
              </button>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
              <input
                className="tm-input"
                placeholder="Search by name, email or license..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", width: "300px", outline: "none", fontFamily: S.mono }}
              />
              <div style={{ display: "flex", gap: ".4rem" }}>
                {(["ALL", "ACTIVE", "INACTIVE"] as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => handleStatusFilter(f)}
                    style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".3rem .75rem", borderRadius: 4, cursor: "pointer", border: `1px solid ${statusFilter === f ? "rgba(245,158,11,.4)" : S.border}`, background: statusFilter === f ? "rgba(245,158,11,.1)" : "transparent", color: statusFilter === f ? S.accent : S.muted }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <p style={{ fontFamily: S.mono, fontSize: ".875rem", color: S.muted }}>Loading...</p>
            ) : (
              <>
                <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${S.border}`, background: "rgba(255,255,255,.02)" }}>
                        {COLS.map(({ label, field }) => (
                          <th
                            key={label}
                            onClick={field ? () => toggleSort(field) : undefined}
                            style={{ padding: ".75rem 1rem", textAlign: "left", fontFamily: S.mono, fontSize: "9px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", fontWeight: 600, cursor: field ? "pointer" : "default", userSelect: "none" }}
                          >
                            {label}{field && sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: "3rem", textAlign: "center", fontFamily: S.mono, fontSize: ".875rem", color: S.dim }}>
                            {search || statusFilter !== "ALL" ? "No drivers match your filters." : "No drivers yet. Add one to get started."}
                          </td>
                        </tr>
                      ) : filtered.map((d) => (
                        <tr
                          key={d.id}
                          className="dr-row"
                          onClick={() => router.push(`/admin/drivers/${d.id}`)}
                          style={{ borderBottom: `1px solid rgba(255,255,255,.04)`, transition: "background .15s" }}
                        >
                          <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontWeight: 700, color: S.text }}>{d.fullName}</td>
                          <td style={{ padding: ".75rem 1rem", fontSize: ".875rem", color: S.muted }}>{d.email}</td>
                          <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>{d.licenseNumber}</td>
                          <td style={{ padding: ".75rem 1rem", fontSize: ".875rem", color: S.muted }}>{d.depotName ?? "—"}</td>
                          <td style={{ padding: ".75rem 1rem" }}>
                            <span style={{ fontFamily: S.mono, fontSize: "9px", letterSpacing: ".1em", padding: ".2rem .5rem", borderRadius: 4, border: `1px solid ${d.isActive ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`, color: d.isActive ? S.green : S.red, textTransform: "uppercase" }}>
                              {d.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={{ padding: ".75rem 1rem", fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: ".75rem" }}>
                  <p style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, letterSpacing: ".06em" }}>
                    {search ? `Showing ${filtered.length} of ${result.totalCount} drivers` : `${result.totalCount} drivers total`}
                  </p>
                  {result.totalPages > 1 && (
                    <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{ fontFamily: S.mono, fontSize: "10px", padding: ".3rem .6rem", borderRadius: 4, cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? .4 : 1, background: "transparent", border: `1px solid ${S.border}`, color: S.muted }}
                      >
                        ←
                      </button>
                      <span style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, minWidth: "60px", textAlign: "center" }}>
                        {page} / {result.totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
                        disabled={page === result.totalPages}
                        style={{ fontFamily: S.mono, fontSize: "10px", padding: ".3rem .6rem", borderRadius: 4, cursor: page === result.totalPages ? "default" : "pointer", opacity: page === result.totalPages ? .4 : 1, background: "transparent", border: `1px solid ${S.border}`, color: S.muted }}
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
