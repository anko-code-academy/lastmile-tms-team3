"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import TmNavbar from "@/components/TmNavbar";
import { useAuditLog, useRelatedAuditLogs } from "@/lib/hooks/useAuditLogs";
import { AuditResourceType, type AuditLogDetail } from "@/lib/types/auditLog";

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)" as const,
  text: "#e2e8f0" as const,
  muted: "#4a5f7a" as const,
  dim: "#3a526e" as const,
  accent: "#f59e0b" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

const EMPTY_VALUE = "—";

type DiffStatus = "added" | "removed" | "changed" | "unchanged";

interface DiffRow {
  field: string;
  before: string | null;
  after: string | null;
  status: DiffStatus;
}

type PayloadSide = "before" | "after";

function formatOccurredAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(new Date(value));
}

function parseJsonValue(json?: string | null): unknown {
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

function getResourceHref(log: AuditLogDetail) {
  if (log.resourceDetails?.href) {
    return log.resourceDetails.href;
  }

  switch (log.resourceType) {
    case AuditResourceType.Parcel:
      return `/parcels/${log.resourceId}`;
    case AuditResourceType.Vehicle:
      return `/admin/vehicles/${log.resourceId}`;
    case AuditResourceType.Driver:
      return `/admin/drivers/${log.resourceId}`;
    default:
      return null;
  }
}

function flattenJsonValue(
  value: unknown,
  prefix = "",
): Record<string, string | null> {
  if (value === null || value === undefined) {
    return prefix ? { [prefix]: null } : {};
  }

  if (Array.isArray(value)) {
    return prefix
      ? { [prefix]: JSON.stringify(value) }
      : { value: JSON.stringify(value) };
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      return prefix ? { [prefix]: "{}" } : {};
    }

    return entries.reduce<Record<string, string | null>>(
      (result, [key, nestedValue]) => {
        const nextPrefix = prefix ? `${prefix}.${key}` : key;
        return {
          ...result,
          ...flattenJsonValue(nestedValue, nextPrefix),
        };
      },
      {},
    );
  }

  const text = typeof value === "string" ? value : String(value);
  return prefix ? { [prefix]: text } : { value: text };
}

function buildDiffRows(log: AuditLogDetail): DiffRow[] {
  const beforeValues = flattenJsonValue(parseJsonValue(log.beforeValuesJson));
  const afterValues = flattenJsonValue(parseJsonValue(log.afterValuesJson));
  const fields = Array.from(
    new Set([...Object.keys(beforeValues), ...Object.keys(afterValues)]),
  ).sort((left, right) => left.localeCompare(right));

  return fields
    .map((field) => {
      const before = beforeValues[field] ?? null;
      const after = afterValues[field] ?? null;
      const status: DiffStatus =
        before === after
          ? "unchanged"
          : before === null
            ? "added"
            : after === null
              ? "removed"
              : "changed";

      return {
        field,
        before,
        after,
        status,
      };
    })
    .filter((row) => row.status !== "unchanged");
}

function formatDiffValue(value: string | null) {
  return value === null ? EMPTY_VALUE : value;
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\./g, " / ");
}

function formatPayloadValue(value: unknown) {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return EMPTY_VALUE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasNestedChange(path: string, changedPaths: Set<string>) {
  if (!path) {
    return changedPaths.size > 0;
  }

  const nestedPrefix = `${path}.`;
  return Array.from(changedPaths).some((candidate) =>
    candidate.startsWith(nestedPrefix),
  );
}

export default function AuditLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shouldLoadRelated, setShouldLoadRelated] = useState(false);
  const { data: auditLog, isLoading } = useAuditLog(id);
  const { data: relatedLogsData, isLoading: isRelatedLogsLoading } =
    useRelatedAuditLogs(auditLog?.correlationId, shouldLoadRelated);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg }}>
        <TmNavbar />
        <p
          style={{
            padding: "2rem",
            fontFamily: S.mono,
            fontSize: ".875rem",
            color: S.muted,
          }}
        >
          Loading audit log entry...
        </p>
      </div>
    );
  }

  if (!auditLog) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text }}>
        <TmNavbar />
        <div style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
          <p
            style={{ fontFamily: S.mono, color: S.muted, marginBottom: "1rem" }}
          >
            Audit log entry not found.
          </p>
          <button
            onClick={() => router.push("/admin/audit-logs")}
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
            Back to Audit Logs
          </button>
        </div>
      </div>
    );
  }

  const resourceHref = getResourceHref(auditLog);
  const diffRows = buildDiffRows(auditLog);
  const relatedLogs = (relatedLogsData?.items ?? []).filter(
    (item) => item.id !== auditLog.id,
  );
  const beforeSnapshot = parseJsonValue(auditLog.beforeValuesJson);
  const afterSnapshot = parseJsonValue(auditLog.afterValuesJson);
  const changedPathMap = new Map(
    diffRows.map((row) => [row.field, row.status] as const),
  );
  const changedPaths = new Set(changedPathMap.keys());
  const resourceTitle = auditLog.resourceDetails?.title?.trim();
  const showResourceTitle =
    Boolean(resourceTitle) && resourceTitle !== auditLog.resourceId;

  return (
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
        <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
          <Link
            href="/admin/audit-logs"
            style={{
              fontFamily: S.mono,
              fontSize: "11px",
              letterSpacing: ".1em",
              color: S.muted,
              textDecoration: "none",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: ".4rem",
              marginBottom: "1.5rem",
            }}
          >
            ← All Audit Logs
          </Link>

          <div style={{ marginBottom: "2rem" }}>
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
              Audit Details
            </p>
            <h1
              style={{
                fontFamily: S.mono,
                fontSize: "1.4rem",
                fontWeight: 800,
                color: S.text,
                letterSpacing: "-.02em",
                lineHeight: 1.2,
              }}
            >
              {auditLog.summary ??
                `${auditLog.resourceType} ${auditLog.actionType}`}
            </h1>
            <p
              style={{
                fontFamily: S.mono,
                fontSize: ".85rem",
                color: S.muted,
                marginTop: ".5rem",
              }}
            >
              {formatOccurredAt(auditLog.occurredAt)}
            </p>
            <p
              style={{
                fontFamily: S.mono,
                fontSize: ".78rem",
                color: S.dim,
                marginTop: ".4rem",
                wordBreak: "break-word",
              }}
            >
              Log ID: {auditLog.id}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <section style={detailCardStyle}>
              <SectionTitle>Resource</SectionTitle>
              <MetaRow
                label="Action"
                value={auditLog.actionType.replaceAll("_", " ")}
              />
              <MetaRow
                label="Type"
                value={auditLog.resourceType.replaceAll("_", " ")}
              />
              {showResourceTitle ? (
                <MetaRow label="Name" value={resourceTitle ?? ""} />
              ) : null}
              <MetaRow label="Resource ID" value={auditLog.resourceId} mono />
              {resourceHref ? (
                <ContextLink href={resourceHref}>Open Resource</ContextLink>
              ) : null}
            </section>
            <section style={detailCardStyle}>
              <SectionTitle>Actor</SectionTitle>
              <MetaRow
                label="Name"
                value={
                  auditLog.actorDetails?.fullName ??
                  auditLog.actorUserName ??
                  "System"
                }
              />
              <MetaRow
                label="User ID"
                value={auditLog.actorUserId ?? EMPTY_VALUE}
              />
              {auditLog.actorDetails ? (
                <>
                  <MetaRow label="Email" value={auditLog.actorDetails.email} />
                  <MetaRow label="Role" value={auditLog.actorDetails.role} />
                  <MetaRow
                    label="Status"
                    value={
                      auditLog.actorDetails.isActive ? "Active" : "Inactive"
                    }
                  />
                </>
              ) : null}
              {auditLog.actorDetails?.href ? (
                <ContextLink href={auditLog.actorDetails.href}>
                  Open users directory
                </ContextLink>
              ) : null}
            </section>
          </div>

          <div
            style={{
              ...panelStyle,
            }}
          >
            <SectionTitle>Field Changes</SectionTitle>
            <DiffTable rows={diffRows} />
          </div>

          <section style={{ ...panelStyle, marginTop: "1rem" }}>
            <SectionTitle>Recorded Payloads</SectionTitle>
            <p
              style={{
                margin: "0 0 1rem",
                fontFamily: S.mono,
                fontSize: ".78rem",
                color: S.muted,
                lineHeight: 1.6,
              }}
            >
              These payloads show the values recorded at the time of the audit
              event. Nested related data is not included here. If you need the
              full current resource, open the resource page.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              <SnapshotPanel
                label="Before"
                value={beforeSnapshot}
                side="before"
                changedPathMap={changedPathMap}
                changedPaths={changedPaths}
              />
              <SnapshotPanel
                label="After"
                value={afterSnapshot}
                side="after"
                changedPathMap={changedPathMap}
                changedPaths={changedPaths}
              />
            </div>
          </section>

          <section style={{ ...panelStyle, marginTop: "1rem" }}>
            <SectionTitle>Correlation</SectionTitle>
            <MetaRow
              label="Correlation ID"
              value={auditLog.correlationId ?? EMPTY_VALUE}
              mono
            />
            {auditLog.correlationId ? (
              <div style={{ marginTop: ".9rem" }}>
                <button
                  onClick={() => setShouldLoadRelated(true)}
                  disabled={shouldLoadRelated && isRelatedLogsLoading}
                  style={{
                    fontFamily: S.mono,
                    fontSize: "11px",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    padding: ".45rem .9rem",
                    borderRadius: 6,
                    cursor:
                      shouldLoadRelated && isRelatedLogsLoading
                        ? "wait"
                        : "pointer",
                    opacity:
                      shouldLoadRelated && isRelatedLogsLoading ? 0.7 : 1,
                    background: "rgba(245,158,11,.12)",
                    border: "1px solid rgba(245,158,11,.35)",
                    color: S.accent,
                  }}
                >
                  {shouldLoadRelated
                    ? isRelatedLogsLoading
                      ? "Loading Related Logs..."
                      : "Reload Related Logs"
                    : "Load Related Logs"}
                </button>
              </div>
            ) : null}
            {shouldLoadRelated ? (
              <div style={{ marginTop: "1rem" }}>
                <RelatedLogsTable
                  rows={relatedLogs}
                  isLoading={isRelatedLogsLoading}
                  onOpen={(auditLogId) =>
                    router.push(`/admin/audit-logs/${auditLogId}`)
                  }
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontFamily: S.mono,
        fontSize: "10px",
        letterSpacing: ".18em",
        color: S.muted,
        textTransform: "uppercase",
        marginBottom: ".9rem",
      }}
    >
      {children}
    </p>
  );
}

function ContextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginTop: "auto", paddingTop: ".75rem" }}>
      <Link
        href={href}
        style={{
          fontFamily: S.mono,
          fontSize: "11px",
          letterSpacing: ".1em",
          color: S.accent,
          textDecoration: "none",
          textTransform: "uppercase",
        }}
      >
        {children}
      </Link>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: ".75rem",
        marginBottom: ".65rem",
      }}
    >
      <span
        style={{
          fontFamily: S.mono,
          fontSize: "11px",
          letterSpacing: ".08em",
          color: S.dim,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? S.mono : undefined,
          fontSize: ".9rem",
          color: S.text,
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DiffTable({ rows }: { rows: DiffRow[] }) {
  if (rows.length === 0) {
    return (
      <p
        style={{
          fontFamily: S.mono,
          fontSize: ".85rem",
          color: S.muted,
          margin: 0,
        }}
      >
        No changed fields were captured for this event.
      </p>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: ".75rem",
      }}
    >
      {rows.map((row) => (
        <div
          key={row.field}
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            background: "rgba(3,8,15,.65)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              alignItems: "center",
              padding: ".8rem 1rem",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            <span
              style={{
                fontFamily: S.mono,
                fontSize: ".8rem",
                color: S.text,
                wordBreak: "break-word",
              }}
            >
              {formatLabel(row.field)}
            </span>
            <StatusBadge status={row.status} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            <DiffCell label="Before" value={formatDiffValue(row.before)} />
            <DiffCell label="After" value={formatDiffValue(row.after)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SnapshotPanel({
  label,
  value,
  side,
  changedPathMap,
  changedPaths,
}: {
  label: string;
  value: unknown;
  side: PayloadSide;
  changedPathMap: ReadonlyMap<string, DiffStatus>;
  changedPaths: Set<string>;
}) {
  return (
    <div
      style={{
        border: `1px solid ${S.border}`,
        borderRadius: 8,
        background: "rgba(3,8,15,.65)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: ".8rem 1rem",
          borderBottom: `1px solid ${S.border}`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: S.mono,
            fontSize: "10px",
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: S.muted,
          }}
        >
          {label}
        </p>
      </div>
      <div
        style={{
          padding: ".65rem .8rem",
          fontFamily: S.mono,
          fontSize: ".73rem",
          lineHeight: 1.45,
          color: S.text,
          maxHeight: "260px",
          overflow: "auto",
        }}
      >
        <PayloadTree
          value={value}
          side={side}
          path=""
          depth={0}
          changedPathMap={changedPathMap}
          changedPaths={changedPaths}
        />
      </div>
    </div>
  );
}

function PayloadTree({
  value,
  side,
  path,
  depth,
  changedPathMap,
  changedPaths,
}: {
  value: unknown;
  side: PayloadSide;
  path: string;
  depth: number;
  changedPathMap: ReadonlyMap<string, DiffStatus>;
  changedPaths: Set<string>;
}) {
  if (value === null || value === undefined) {
    return <PayloadLeaf value={EMPTY_VALUE} depth={depth} />;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <PayloadLeaf value="[]" depth={depth} />;
    }

    return (
      <div>
        {value.map((item, index) => {
          const nextPath = path ? `${path}.${index}` : String(index);
          return (
            <PayloadEntry
              key={nextPath}
              label={`[${index}]`}
              side={side}
              path={nextPath}
              depth={depth}
              changedPathMap={changedPathMap}
              changedPaths={changedPaths}
            >
              <PayloadTree
                value={item}
                side={side}
                path={nextPath}
                depth={depth + 1}
                changedPathMap={changedPathMap}
                changedPaths={changedPaths}
              />
            </PayloadEntry>
          );
        })}
      </div>
    );
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return <PayloadLeaf value="{}" depth={depth} />;
    }

    return (
      <div>
        {entries.map(([key, nestedValue]) => {
          const nextPath = path ? `${path}.${key}` : key;
          return (
            <PayloadEntry
              key={nextPath}
              label={key}
              side={side}
              path={nextPath}
              depth={depth}
              changedPathMap={changedPathMap}
              changedPaths={changedPaths}
            >
              <PayloadTree
                value={nestedValue}
                side={side}
                path={nextPath}
                depth={depth + 1}
                changedPathMap={changedPathMap}
                changedPaths={changedPaths}
              />
            </PayloadEntry>
          );
        })}
      </div>
    );
  }

  return <PayloadLeaf value={formatPayloadValue(value)} depth={depth} />;
}

function PayloadEntry({
  label,
  side,
  path,
  depth,
  children,
  changedPathMap,
  changedPaths,
}: {
  label: string;
  side: PayloadSide;
  path: string;
  depth: number;
  children: ReactNode;
  changedPathMap: ReadonlyMap<string, DiffStatus>;
  changedPaths: Set<string>;
}) {
  const status = changedPathMap.get(path);
  const hasNestedChanges = hasNestedChange(path, changedPaths);
  const isChanged = Boolean(status || hasNestedChanges);
  const accentColor =
    status === "added"
      ? "#22c55e"
      : status === "removed"
        ? "#ef4444"
        : status === "changed"
          ? "#f59e0b"
          : "rgba(245,158,11,.35)";
  const backgroundColor = isChanged
    ? side === "before"
      ? "rgba(239,68,68,.08)"
      : "rgba(34,197,94,.08)"
    : "transparent";

  return (
    <div
      style={{
        marginLeft: depth * 12,
        borderLeft: `2px solid ${isChanged ? accentColor : "transparent"}`,
        background: backgroundColor,
        borderRadius: 4,
        padding: "1px 0 1px .5rem",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(96px, max-content) 1fr",
          gap: ".6rem",
          alignItems: "start",
        }}
      >
        <span
          style={{
            color: isChanged ? S.text : S.muted,
            wordBreak: "break-word",
          }}
        >
          {label}
        </span>
        <div>{children}</div>
      </div>
    </div>
  );
}

function PayloadLeaf({ value, depth }: { value: string; depth: number }) {
  return (
    <div
      style={{
        marginLeft: depth === 0 ? 0 : 2,
        color: S.dim,
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
      }}
    >
      {value}
    </div>
  );
}

function RelatedLogsTable({
  rows,
  isLoading,
  onOpen,
}: {
  rows: Array<{
    id: string;
    occurredAt: string;
    actorUserId?: string;
    actorUserName?: string;
    actionType: string;
    resourceType: string;
    summary?: string;
  }>;
  isLoading: boolean;
  onOpen: (auditLogId: string) => void;
}) {
  if (isLoading) {
    return (
      <p
        style={{
          fontFamily: S.mono,
          fontSize: ".85rem",
          color: S.muted,
          margin: 0,
        }}
      >
        Loading related audit logs...
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p
        style={{
          fontFamily: S.mono,
          fontSize: ".85rem",
          color: S.muted,
          margin: 0,
        }}
      >
        No other audit logs share this correlation ID.
      </p>
    );
  }

  return (
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
            <th style={relatedHeaderCellStyle}>When</th>
            <th style={relatedHeaderCellStyle}>Actor</th>
            <th style={relatedHeaderCellStyle}>Action</th>
            <th style={relatedHeaderCellStyle}>Resource</th>
            <th style={relatedHeaderCellStyle}>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onOpen(row.id)}
              style={{
                borderBottom: `1px solid ${S.border}`,
                cursor: "pointer",
              }}
            >
              <td style={relatedBodyCellStyle}>
                {formatOccurredAt(row.occurredAt)}
              </td>
              <td style={relatedBodyCellStyle}>
                {row.actorUserName ?? row.actorUserId ?? "System"}
              </td>
              <td style={relatedBodyCellStyle}>
                {row.actionType.replaceAll("_", " ")}
              </td>
              <td style={relatedBodyCellStyle}>
                {row.resourceType.replaceAll("_", " ")}
              </td>
              <td style={relatedBodyCellStyle}>{row.summary ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "1rem", borderRight: `1px solid ${S.border}` }}>
      <p
        style={{
          margin: "0 0 .45rem",
          fontFamily: S.mono,
          fontSize: "10px",
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: S.dim,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: S.mono,
          fontSize: ".8rem",
          color: S.text,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: DiffStatus }) {
  const colors: Record<DiffStatus, string> = {
    added: "#22c55e",
    removed: "#ef4444",
    changed: "#f59e0b",
    unchanged: S.muted,
  };

  return (
    <span
      style={{
        fontFamily: S.mono,
        fontSize: "10px",
        letterSpacing: ".14em",
        textTransform: "uppercase",
        color: colors[status],
      }}
    >
      {status}
    </span>
  );
}

const panelStyle: CSSProperties = {
  background: S.panel,
  border: `1px solid ${S.border}`,
  borderRadius: 10,
  padding: "1.25rem 1.5rem",
};

const detailCardStyle: CSSProperties = {
  ...panelStyle,
  display: "flex",
  flexDirection: "column",
};

const relatedHeaderCellStyle: CSSProperties = {
  padding: ".85rem 1rem",
  textAlign: "left",
};

const relatedBodyCellStyle: CSSProperties = {
  padding: ".9rem 1rem",
  color: S.text,
  verticalAlign: "top",
};
