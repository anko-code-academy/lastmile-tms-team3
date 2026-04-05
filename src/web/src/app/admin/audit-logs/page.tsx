"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TmNavbar from "@/components/TmNavbar";
import { useSearchAuditLogs } from "@/lib/hooks/useAuditLogs";
import {
  AuditActionType,
  AuditResourceType,
  type AuditLogSortBy,
} from "@/lib/types/auditLog";
import { SortDirection } from "@/lib/types/parcel";

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
  mono: "var(--font-geist-mono, monospace)" as const,
};

const ACTION_OPTIONS = [
  { label: "All actions", value: "" },
  ...Object.values(AuditActionType).map((value) => ({
    label: value.replaceAll("_", " "),
    value,
  })),
];

const RESOURCE_OPTIONS = [
  { label: "All resources", value: "" },
  ...Object.values(AuditResourceType).map((value) => ({
    label: value.replaceAll("_", " "),
    value,
  })),
];

type SortField = AuditLogSortBy;

function getSortIndicator(isActive: boolean, direction: SortDirection) {
  return isActive ? (direction === "ASC" ? "↑" : "↓") : "↕";
}

function formatOccurredAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function shorten(value?: string | null, max = 40) {
  if (!value) {
    return "—";
  }

  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [actorInput, setActorInput] = useState("");
  const [resourceIdInput, setResourceIdInput] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [actionTypeInput, setActionTypeInput] = useState<AuditActionType | "">(
    "",
  );
  const [resourceTypeInput, setResourceTypeInput] = useState<
    AuditResourceType | ""
  >("");

  const [actor, setActor] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [actionType, setActionType] = useState<AuditActionType | null>(null);
  const [resourceType, setResourceType] = useState<AuditResourceType | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<SortField>("OCCURRED_AT");
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    SortDirection.Desc,
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const [pagingDirection, setPagingDirection] = useState<
    "forward" | "backward" | undefined
  >(undefined);

  const { data, isLoading } = useSearchAuditLogs({
    actor,
    actionType,
    resourceType,
    resourceId,
    from,
    to,
    sortBy,
    sortDirection,
    cursor,
    pagingDirection,
    pageSize: 20,
  });

  const result = data ?? {
    items: [],
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    nextCursor: undefined,
    previousCursor: undefined,
  };

  function applyFilters() {
    setActor(actorInput.trim() || null);
    setResourceId(resourceIdInput.trim() || null);
    setFrom(fromInput || null);
    setTo(toInput || null);
    setActionType(actionTypeInput || null);
    setResourceType(resourceTypeInput || null);
    setCursor(null);
    setPagingDirection(undefined);
  }

  function clearFilters() {
    setActorInput("");
    setResourceIdInput("");
    setFromInput("");
    setToInput("");
    setActionTypeInput("");
    setResourceTypeInput("");
    setActor(null);
    setResourceId(null);
    setFrom(null);
    setTo(null);
    setActionType(null);
    setResourceType(null);
    setCursor(null);
    setPagingDirection(undefined);
    setSortBy("OCCURRED_AT");
    setSortDirection(SortDirection.Desc);
  }

  async function handleExport() {
    const params = new URLSearchParams();

    if (actor) params.set("actor", actor);
    if (actionType) params.set("actionType", actionType);
    if (resourceType) params.set("resourceType", resourceType);
    if (resourceId) params.set("resourceId", resourceId);
    const fromValue = toUtcIsoString(from);
    const toValue = toUtcIsoString(to);

    if (fromValue) params.set("from", fromValue);
    if (toValue) params.set("to", toValue);

    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch(
        `/api/audit-logs/export?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition");
      const fileName = getDownloadFileName(disposition);

      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      setExportError("CSV export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  function toggleSort(field: SortField) {
    setCursor(null);
    setPagingDirection(undefined);

    if (sortBy === field) {
      setSortDirection((current) =>
        current === SortDirection.Asc ? SortDirection.Desc : SortDirection.Asc,
      );
      return;
    }

    setSortBy(field);
    setSortDirection(
      field === "OCCURRED_AT" ? SortDirection.Desc : SortDirection.Asc,
    );
  }

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .tm-select { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .5rem .75rem; font-size: .875rem; width: 100%; outline: none; font-family: var(--font-geist-mono,monospace); }
        .tm-select:focus { border-color: rgba(245,158,11,.45); }
        .tm-select option { background: #0f1929; color: #e2e8f0; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
        .tm-btn-secondary:hover { border-color: rgba(255,255,255,.2) !important; color: #e2e8f0 !important; }
        .audit-row:hover { background: rgba(255,255,255,.03); cursor: pointer; }
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
            style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: "2rem",
                gap: "1rem",
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
                  Administration
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
                  Audit Logs
                </h1>
                <p
                  style={{
                    fontFamily: S.mono,
                    fontSize: ".8rem",
                    color: S.muted,
                    marginTop: ".5rem",
                  }}
                >
                  Investigate who changed what, when, and why.
                </p>
              </div>
              <button
                className="tm-btn-primary"
                onClick={handleExport}
                disabled={isExporting}
                style={{
                  fontFamily: S.mono,
                  fontSize: "11px",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  padding: ".45rem .9rem",
                  borderRadius: 6,
                  cursor: isExporting ? "wait" : "pointer",
                  opacity: isExporting ? 0.7 : 1,
                  background: "rgba(245,158,11,.12)",
                  border: "1px solid rgba(245,158,11,.35)",
                  color: S.accent,
                }}
              >
                {isExporting ? "Exporting..." : "Export CSV"}
              </button>
            </div>
            {exportError ? (
              <p
                style={{
                  margin: "-1rem 0 1rem",
                  fontFamily: S.mono,
                  fontSize: ".75rem",
                  color: "#ef4444",
                }}
              >
                {exportError}
              </p>
            ) : null}

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
                  display: "grid",
                  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                  gap: ".75rem",
                }}
              >
                <div>
                  <label style={labelStyle}>Actor</label>
                  <input
                    className="tm-input"
                    value={actorInput}
                    onChange={(e) => setActorInput(e.target.value)}
                    placeholder="Email/name or id"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Action</label>
                  <select
                    className="tm-select"
                    value={actionTypeInput}
                    onChange={(e) =>
                      setActionTypeInput(
                        (e.target.value as AuditActionType) || "",
                      )
                    }
                  >
                    {ACTION_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Resource Type</label>
                  <select
                    className="tm-select"
                    value={resourceTypeInput}
                    onChange={(e) =>
                      setResourceTypeInput(
                        (e.target.value as AuditResourceType) || "",
                      )
                    }
                  >
                    {RESOURCE_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Resource ID</label>
                  <input
                    className="tm-input"
                    value={resourceIdInput}
                    onChange={(e) => setResourceIdInput(e.target.value)}
                    placeholder="Id"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>From</label>
                  <input
                    className="tm-input"
                    type="datetime-local"
                    step={1}
                    value={fromInput}
                    onChange={(e) => setFromInput(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>To</label>
                  <input
                    className="tm-input"
                    type="datetime-local"
                    step={1}
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: ".5rem", marginTop: "1rem" }}>
                <button
                  className="tm-btn-primary"
                  onClick={applyFilters}
                  style={primaryButtonStyle}
                >
                  Apply Filters
                </button>
                <button
                  className="tm-btn-secondary"
                  onClick={clearFilters}
                  style={secondaryButtonStyle}
                >
                  Clear
                </button>
              </div>
            </div>

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
                  padding: "1rem 1.25rem",
                  borderBottom: `1px solid ${S.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: S.mono,
                    fontSize: "11px",
                    letterSpacing: ".14em",
                    color: S.muted,
                    textTransform: "uppercase",
                  }}
                >
                  {result.totalCount} matching events
                </span>
                <span
                  style={{
                    fontFamily: S.mono,
                    fontSize: ".8rem",
                    color: S.dim,
                  }}
                >
                  Default order is newest first.
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontFamily: S.mono,
                    fontSize: ".82rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1px solid ${S.border}`,
                        color: S.muted,
                        textTransform: "uppercase",
                        fontSize: "10px",
                        letterSpacing: ".14em",
                      }}
                    >
                      <HeaderCell onClick={() => toggleSort("OCCURRED_AT")}>
                        When{" "}
                        {getSortIndicator(
                          sortBy === "OCCURRED_AT",
                          sortDirection,
                        )}
                      </HeaderCell>
                      <HeaderCell onClick={() => toggleSort("ACTOR_USER_NAME")}>
                        Actor{" "}
                        {getSortIndicator(
                          sortBy === "ACTOR_USER_NAME",
                          sortDirection,
                        )}
                      </HeaderCell>
                      <HeaderCell onClick={() => toggleSort("ACTION_TYPE")}>
                        Action{" "}
                        {getSortIndicator(
                          sortBy === "ACTION_TYPE",
                          sortDirection,
                        )}
                      </HeaderCell>
                      <HeaderCell onClick={() => toggleSort("RESOURCE_TYPE")}>
                        Resource Type{" "}
                        {getSortIndicator(
                          sortBy === "RESOURCE_TYPE",
                          sortDirection,
                        )}
                      </HeaderCell>
                      <HeaderCell>Summary</HeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} style={emptyCellStyle}>
                          Loading audit log entries...
                        </td>
                      </tr>
                    ) : result.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={emptyCellStyle}>
                          No audit log entries match the current filters.
                        </td>
                      </tr>
                    ) : (
                      result.items.map((item) => (
                        <tr
                          key={item.id}
                          className="audit-row"
                          onClick={() =>
                            router.push(`/admin/audit-logs/${item.id}`)
                          }
                          style={{ borderBottom: `1px solid ${S.border}` }}
                        >
                          <BodyCell>
                            {formatOccurredAt(item.occurredAt)}
                          </BodyCell>
                          <BodyCell>
                            {item.actorUserName ?? item.actorUserId ?? "System"}
                          </BodyCell>
                          <BodyCell>
                            {item.actionType.replaceAll("_", " ")}
                          </BodyCell>
                          <BodyCell>
                            {item.resourceType.replaceAll("_", " ")}
                          </BodyCell>
                          <BodyCell>{shorten(item.summary)}</BodyCell>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "1rem",
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
                {result.items.length} out of {result.totalCount} event
                {result.totalCount !== 1 ? "s" : ""}
              </p>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <button
                  className="tm-btn-secondary"
                  disabled={!result.hasPreviousPage || !result.previousCursor}
                  onClick={() => {
                    setCursor(result.previousCursor ?? null);
                    setPagingDirection("backward");
                  }}
                  style={{
                    ...secondaryButtonStyle,
                    opacity: !result.hasPreviousPage ? 0.5 : 1,
                    cursor: !result.hasPreviousPage ? "not-allowed" : "pointer",
                  }}
                >
                  ← Prev
                </button>
                <button
                  className="tm-btn-secondary"
                  disabled={!result.hasNextPage || !result.nextCursor}
                  onClick={() => {
                    setCursor(result.nextCursor ?? null);
                    setPagingDirection("forward");
                  }}
                  style={{
                    ...secondaryButtonStyle,
                    opacity: !result.hasNextPage ? 0.5 : 1,
                    cursor: !result.hasNextPage ? "not-allowed" : "pointer",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function HeaderCell({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: ".85rem 1rem",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {children}
    </th>
  );
}

function BodyCell({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: ".9rem 1rem", color: S.text }}>{children}</td>;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: S.mono,
  fontSize: "10px",
  letterSpacing: ".14em",
  color: S.muted,
  textTransform: "uppercase",
  marginBottom: ".4rem",
};

const inputStyle: React.CSSProperties = {
  background: S.inputBg,
  border: `1px solid ${S.inputBorder}`,
  color: S.text,
  borderRadius: 6,
  padding: ".5rem .75rem",
  fontSize: ".875rem",
  width: "100%",
  outline: "none",
  fontFamily: S.mono,
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
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
};

const secondaryButtonStyle: React.CSSProperties = {
  fontFamily: S.mono,
  fontSize: "11px",
  letterSpacing: ".1em",
  textTransform: "uppercase",
  padding: ".45rem .9rem",
  borderRadius: 6,
  background: "transparent",
  border: `1px solid ${S.border}`,
  color: S.muted,
};

const emptyCellStyle: React.CSSProperties = {
  padding: "2rem",
  textAlign: "center",
  color: S.muted,
};

function getDownloadFileName(contentDisposition: string | null) {
  const match = contentDisposition?.match(
    /filename\*?=(?:UTF-8''|\")?([^\";]+)/i,
  );

  if (!match) {
    return `audit-logs-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.csv`;
  }

  return decodeURIComponent(match[1].replace(/\"/g, ""));
}

function toUtcIsoString(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
