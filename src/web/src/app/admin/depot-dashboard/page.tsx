"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TmNavbar from "@/components/TmNavbar";
import { useDepotDashboards } from "@/lib/hooks/useDepotDashboard";
import { ParcelStatus } from "@/lib/types/parcel";

const STATUS_ORDER = [
  ParcelStatus.ReceivedAtDepot,
  ParcelStatus.Sorted,
  ParcelStatus.Staged,
  ParcelStatus.Loaded,
  ParcelStatus.Exception,
];

const STATUS_LABELS: Record<ParcelStatus, string> = {
  [ParcelStatus.Registered]: "Registered",
  [ParcelStatus.ReceivedAtDepot]: "Received",
  [ParcelStatus.Sorted]: "Sorted",
  [ParcelStatus.Staged]: "Staged",
  [ParcelStatus.Loaded]: "Loaded",
  [ParcelStatus.OutForDelivery]: "Out for Delivery",
  [ParcelStatus.Delivered]: "Delivered",
  [ParcelStatus.FailedAttempt]: "Failed Attempt",
  [ParcelStatus.ReturnedToDepot]: "Returned",
  [ParcelStatus.Cancelled]: "Cancelled",
  [ParcelStatus.Exception]: "Exception",
};

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  panelStrong: "rgba(255,255,255,.04)" as const,
  border: "rgba(255,255,255,.08)" as const,
  text: "#e2e8f0" as const,
  muted: "#4a5f7a" as const,
  accent: "#f59e0b" as const,
  danger: "#ef4444" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

export default function DepotDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDepotId = searchParams.get("depotId");
  const thresholdHours = parseThresholdHours(
    searchParams.get("thresholdHours"),
  );
  const {
    data: depots = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useDepotDashboards(thresholdHours);

  const visibleDepots = selectedDepotId
    ? depots.filter((depot) => depot.id === selectedDepotId)
    : depots;

  const lastUpdatedAt = visibleDepots[0]?.parcelDashboard.lastUpdatedAt;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text }}>
      <TmNavbar />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1.5rem",
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
                marginBottom: ".35rem",
              }}
            >
              Operations
            </p>
            <h1
              style={{
                fontFamily: S.mono,
                fontSize: "1.6rem",
                fontWeight: 800,
                margin: 0,
              }}
            >
              Depot Dashboard
            </h1>
            <p
              style={{
                margin: ".6rem 0 0",
                fontFamily: S.mono,
                fontSize: "11px",
                letterSpacing: ".06em",
                color: S.muted,
              }}
            >
              Real-time parcel throughput by depot status, zone, and age.
              Refreshes every 60 seconds.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: ".75rem",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".35rem",
                minWidth: 240,
              }}
            >
              <span
                style={{
                  fontFamily: S.mono,
                  fontSize: "10px",
                  letterSpacing: ".15em",
                  textTransform: "uppercase",
                  color: S.muted,
                }}
              >
                Depot
              </span>
              <select
                value={selectedDepotId ?? ""}
                onChange={(event) =>
                  replaceParams(router, searchParams, {
                    depotId: event.target.value || null,
                    thresholdHours: String(thresholdHours),
                  })
                }
                disabled={depots.length === 0}
                style={selectStyle}
              >
                <option value="" style={optionStyle}>
                  All depots
                </option>
                {depots.map((depotOption) => (
                  <option
                    key={depotOption.id}
                    value={depotOption.id}
                    style={optionStyle}
                  >
                    {depotOption.name}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".35rem",
                minWidth: 180,
              }}
            >
              <span
                style={{
                  fontFamily: S.mono,
                  fontSize: "10px",
                  letterSpacing: ".15em",
                  textTransform: "uppercase",
                  color: S.muted,
                }}
              >
                Aging Threshold
              </span>
              <select
                value={String(thresholdHours)}
                onChange={(event) =>
                  replaceParams(router, searchParams, {
                    depotId: selectedDepotId,
                    thresholdHours: event.target.value,
                  })
                }
                style={selectStyle}
              >
                <option value="24" style={optionStyle}>
                  24 hours
                </option>
                <option value="48" style={optionStyle}>
                  48 hours
                </option>
                <option value="72" style={optionStyle}>
                  72 hours
                </option>
              </select>
            </label>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".35rem",
                minWidth: 120,
              }}
            >
              <span style={controlLabelSpacerStyle}>Actions</span>
              <button
                type="button"
                onClick={() => void refetch()}
                style={buttonStyle}
                disabled={depots.length === 0 || isFetching}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            marginBottom: "1rem",
            fontFamily: S.mono,
            fontSize: "11px",
            color: S.muted,
          }}
        >
          {lastUpdatedAt
            ? `Last updated ${new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(lastUpdatedAt))}`
            : "Waiting for dashboard data"}
        </div>

        {error ? (
          <div style={errorPanelStyle}>{(error as Error).message}</div>
        ) : null}

        <div style={{ display: "grid", gap: "1rem" }}>
          {visibleDepots.map((depot) => {
            const statusCounts = STATUS_ORDER.map((status) => {
              const match = depot.parcelDashboard.statusCounts.find(
                (item) => item.status === status,
              );
              return { status, count: match?.count ?? 0 };
            });

            const agingCreatedBefore = depot.parcelDashboard.lastUpdatedAt
              ? new Date(
                  new Date(depot.parcelDashboard.lastUpdatedAt).getTime() -
                    thresholdHours * 60 * 60 * 1000,
                ).toISOString()
              : undefined;

            return (
              <section key={depot.id} style={panelStyle}>
                <div style={panelHeaderStyle}>
                  <div>
                    <p style={panelEyebrowStyle}>Depot Overview</p>
                    <h2 style={panelTitleStyle}>{depot.name}</h2>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                    gap: ".85rem",
                    padding: "1rem",
                    borderBottom: `1px solid ${S.border}`,
                  }}
                >
                  <div style={statusSectionHeaderStyle}>Parcels by Status</div>
                  <div style={statusGridStyle}>
                    {statusCounts.map((item) => (
                      <div key={item.status} style={cardStyle}>
                        <p style={cardLabelStyle}>
                          {STATUS_LABELS[item.status]}
                        </p>
                        <p style={cardValueStyle}>
                          {isLoading ? "..." : item.count}
                        </p>
                        <div style={cardFooterStyle}>
                          <Link
                            href={buildParcelListHref({
                              depotId: depot.id,
                              statuses: [item.status],
                            })}
                            style={cardArrowLinkStyle}
                            aria-label={`Go to parcels for ${STATUS_LABELS[item.status]} in ${depot.name}`}
                            title="Go to parcels"
                          >
                            -&gt;
                          </Link>
                        </div>
                      </div>
                    ))}

                    <div
                      style={{
                        ...cardStyle,
                        borderColor: "rgba(239,68,68,.25)",
                      }}
                    >
                      <p style={{ ...cardLabelStyle, color: S.danger }}>
                        Aging Alerts
                      </p>
                      <p style={cardValueStyle}>
                        {isLoading
                          ? "..."
                          : depot.parcelDashboard.agingAlerts.totalCount}
                      </p>
                      <p style={cardSubtextStyle}>
                        Older than {thresholdHours} hours
                      </p>
                      <div style={cardFooterStyle}>
                        <Link
                          href={buildParcelListHref({
                            depotId: depot.id,
                            statuses: STATUS_ORDER,
                            createdBefore: agingCreatedBefore,
                          })}
                          style={cardArrowLinkStyle}
                          aria-label={`Go to aging parcels for ${depot.name}`}
                          title="Go to parcels"
                        >
                          -&gt;
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "0 1rem 1rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={tableHeadStyle}>Zone</th>
                        <th style={{ ...tableHeadStyle, textAlign: "right" }}>
                          Total
                        </th>
                        {STATUS_ORDER.map((status) => (
                          <th
                            key={status}
                            style={{ ...tableHeadStyle, textAlign: "right" }}
                          >
                            {STATUS_LABELS[status]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(depot.parcelDashboard.zoneBreakdown ?? []).map(
                        (zone) => (
                          <tr key={zone.zoneId}>
                            <td style={tableCellStyle}>{zone.zoneName}</td>
                            <td
                              style={{ ...tableCellStyle, textAlign: "right" }}
                            >
                              <span style={tableValueWrapStyle}>
                                <span>{zone.count}</span>
                                <Link
                                  href={buildParcelListHref({
                                    depotId: depot.id,
                                    zoneId: zone.zoneId,
                                  })}
                                  style={inlineArrowLinkStyle}
                                  aria-label={`Go to parcels for ${zone.zoneName} in ${depot.name}`}
                                  title="Go to parcels"
                                >
                                  -&gt;
                                </Link>
                              </span>
                            </td>
                            {STATUS_ORDER.map((status) => {
                              const count =
                                zone.statusCounts.find(
                                  (item) => item.status === status,
                                )?.count ?? 0;
                              return (
                                <td
                                  key={`${zone.zoneId}-${status}`}
                                  style={{
                                    ...tableCellStyle,
                                    textAlign: "right",
                                  }}
                                >
                                  <span style={tableValueWrapStyle}>
                                    <span>{count}</span>
                                    <Link
                                      href={buildParcelListHref({
                                        depotId: depot.id,
                                        zoneId: zone.zoneId,
                                        statuses: [status],
                                      })}
                                      style={inlineArrowLinkStyle}
                                      aria-label={`Go to parcels for ${STATUS_LABELS[status]} in ${zone.zoneName}, ${depot.name}`}
                                      title="Go to parcels"
                                    >
                                      -&gt;
                                    </Link>
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ),
                      )}
                      {!isLoading &&
                      (depot.parcelDashboard.zoneBreakdown.length ?? 0) ===
                        0 ? (
                        <tr>
                          <td
                            colSpan={2 + STATUS_ORDER.length}
                            style={emptyCellStyle}
                          >
                            No parcel activity for this depot.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          {!isLoading && visibleDepots.length === 0 ? (
            <div style={emptyPanelStyle}>
              No depots matched the current filter.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function parseThresholdHours(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24;
  }

  return parsed;
}

function replaceParams(
  router: ReturnType<typeof useRouter>,
  currentParams: ReturnType<typeof useSearchParams>,
  nextValues: Record<string, string | null | undefined>,
) {
  const params = new URLSearchParams(currentParams.toString());

  Object.entries(nextValues).forEach(([key, value]) => {
    if (!value) {
      params.delete(key);
      return;
    }

    params.set(key, value);
  });

  router.replace(`/admin/depot-dashboard?${params.toString()}`);
}

function buildParcelListHref({
  depotId,
  statuses,
  zoneId,
  createdBefore,
}: {
  depotId: string;
  statuses?: ParcelStatus[];
  zoneId?: string;
  createdBefore?: string;
}) {
  const params = new URLSearchParams();
  params.set("depotId", depotId);

  if (statuses && statuses.length > 0) {
    params.set("status", statuses.join(","));
  }

  if (zoneId) {
    params.set("zoneId", zoneId);
  }

  if (createdBefore) {
    params.set("createdBefore", createdBefore);
  }

  return `/parcels?${params.toString()}`;
}

const selectStyle: React.CSSProperties = {
  background: "#0f1929",
  border: `1px solid ${S.border}`,
  color: S.text,
  borderRadius: 8,
  padding: ".65rem .75rem",
  minHeight: 40,
  fontFamily: S.mono,
  fontSize: "12px",
};

const optionStyle: React.CSSProperties = {
  background: "#0f1929",
  color: S.text,
};

const buttonStyle: React.CSSProperties = {
  background: "rgba(245,158,11,.12)",
  border: "1px solid rgba(245,158,11,.35)",
  color: S.accent,
  borderRadius: 8,
  padding: ".65rem 1rem",
  minHeight: 40,
  fontFamily: S.mono,
  fontSize: "11px",
  letterSpacing: ".12em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const controlLabelSpacerStyle: React.CSSProperties = {
  fontFamily: S.mono,
  fontSize: "10px",
  letterSpacing: ".15em",
  textTransform: "uppercase",
  color: "transparent",
  userSelect: "none",
};

const panelStyle: React.CSSProperties = {
  background: S.panel,
  border: `1px solid ${S.border}`,
  borderRadius: 12,
  overflow: "hidden",
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "1rem",
  borderBottom: `1px solid ${S.border}`,
};

const panelEyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: S.mono,
  fontSize: "10px",
  letterSpacing: ".16em",
  color: S.accent,
  textTransform: "uppercase",
};

const panelTitleStyle: React.CSSProperties = {
  margin: ".4rem 0 0",
  fontFamily: S.mono,
  fontSize: "1rem",
};

const cardStyle: React.CSSProperties = {
  background: S.panelStrong,
  border: `1px solid ${S.border}`,
  borderRadius: 12,
  padding: "1rem",
  minHeight: 124,
  display: "flex",
  flexDirection: "column",
};

const statusSectionHeaderStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  marginBottom: ".2rem",
  fontFamily: S.mono,
  fontSize: "10px",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: S.muted,
};

const statusGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: ".85rem",
  gridColumn: "1 / -1",
};

const cardLabelStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: S.mono,
  fontSize: "10px",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: S.muted,
};

const cardValueStyle: React.CSSProperties = {
  margin: ".85rem 0 0",
  fontFamily: S.mono,
  fontSize: "2rem",
  fontWeight: 800,
  color: S.text,
};

const cardSubtextStyle: React.CSSProperties = {
  margin: ".45rem 0 0",
  fontFamily: S.mono,
  fontSize: "10px",
  color: S.muted,
  minHeight: 16,
};

const cardFooterStyle: React.CSSProperties = {
  marginTop: "auto",
  display: "flex",
  justifyContent: "flex-end",
  paddingTop: ".8rem",
};

const cardArrowLinkStyle: React.CSSProperties = {
  fontFamily: S.mono,
  fontSize: "12px",
  letterSpacing: ".12em",
  color: S.accent,
  textDecoration: "none",
  padding: ".15rem .35rem",
  borderRadius: 6,
  border: "1px solid rgba(245,158,11,.25)",
  lineHeight: 1,
};

const tableHeadStyle: React.CSSProperties = {
  padding: ".85rem 0",
  borderBottom: `1px solid ${S.border}`,
  fontFamily: S.mono,
  fontSize: "10px",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: S.muted,
  textAlign: "left",
};

const tableCellStyle: React.CSSProperties = {
  padding: ".9rem 0",
  borderBottom: `1px solid rgba(255,255,255,.04)`,
  fontFamily: S.mono,
  fontSize: "12px",
  color: S.text,
};

const emptyCellStyle: React.CSSProperties = {
  ...tableCellStyle,
  textAlign: "center",
  color: S.muted,
};

const tableValueWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: ".45rem",
};

const inlineArrowLinkStyle: React.CSSProperties = {
  color: S.accent,
  textDecoration: "none",
  fontFamily: S.mono,
  fontSize: "11px",
  lineHeight: 1,
};

const emptyPanelStyle: React.CSSProperties = {
  padding: "1rem",
  borderRadius: 10,
  border: `1px solid ${S.border}`,
  background: S.panel,
  color: S.muted,
  fontFamily: S.mono,
  fontSize: "12px",
};

const errorPanelStyle: React.CSSProperties = {
  marginBottom: "1rem",
  padding: "1rem",
  borderRadius: 10,
  border: "1px solid rgba(239,68,68,.3)",
  background: "rgba(239,68,68,.08)",
  color: "#fecaca",
  fontFamily: S.mono,
  fontSize: "12px",
};
