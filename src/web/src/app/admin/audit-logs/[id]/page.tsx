"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import TmNavbar from "@/components/TmNavbar";
import { useAuditLog } from "@/lib/hooks/useAuditLogs";
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

type DiffStatus = "added" | "removed" | "changed" | "unchanged";

interface DiffRow {
  field: string;
  before: string | null;
  after: string | null;
  status: DiffStatus;
}

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

  return fields.map((field) => {
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
  });
}

function formatDiffValue(value: string | null) {
  return value === null ? "Not captured" : value;
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\./g, " / ");
}

export default function AuditLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: auditLog, isLoading } = useAuditLog(id);

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
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <section style={panelStyle}>
              <SectionTitle>Actor</SectionTitle>
              <MetaRow
                label="Name"
                value={
                  auditLog.actorDetails?.fullName ??
                  auditLog.actorUserName ??
                  "System"
                }
              />
              <MetaRow label="User ID" value={auditLog.actorUserId ?? "—"} />
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
              <MetaRow
                label="Correlation ID"
                value={auditLog.correlationId ?? "—"}
                mono
              />
              {auditLog.actorDetails?.href ? (
                <ContextLink href={auditLog.actorDetails.href}>
                  Open users directory
                </ContextLink>
              ) : null}
            </section>
            <section style={panelStyle}>
              <SectionTitle>Resource</SectionTitle>
              <MetaRow
                label="Action"
                value={auditLog.actionType.replaceAll("_", " ")}
              />
              <MetaRow
                label="Type"
                value={auditLog.resourceType.replaceAll("_", " ")}
              />
              {auditLog.resourceDetails ? (
                <>
                  <MetaRow
                    label="Title"
                    value={auditLog.resourceDetails.title}
                  />
                  {auditLog.resourceDetails.subtitle ? (
                    <MetaRow
                      label="Context"
                      value={auditLog.resourceDetails.subtitle}
                    />
                  ) : null}
                </>
              ) : null}
              <MetaRow label="Resource ID" value={auditLog.resourceId} mono />
              {resourceHref ? (
                <ContextLink href={resourceHref}>
                  Open related resource
                </ContextLink>
              ) : null}
            </section>
          </div>

          <section style={{ ...panelStyle, marginBottom: "1rem" }}>
            <SectionTitle>Summary</SectionTitle>
            <p
              style={{
                fontFamily: S.mono,
                fontSize: ".9rem",
                color: S.text,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {auditLog.summary ?? "No summary recorded for this event."}
            </p>
          </section>

          <div
            style={{
              ...panelStyle,
            }}
          >
            <SectionTitle>Field Changes</SectionTitle>
            <DiffTable rows={diffRows} />
          </div>
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
    <div style={{ marginTop: ".75rem" }}>
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
        No field-level values were captured for this event.
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
