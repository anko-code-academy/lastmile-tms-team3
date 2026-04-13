"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TmNavbar from "@/components/TmNavbar";
import { useDepotDashboards } from "@/lib/hooks/useDepotDashboard";
import type { DepotDashboardViewModel } from "@/lib/types/depotDashboard";
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

  const showAllDepotsOverview = !selectedDepotId && depots.length > 1;
  const overallOverview = showAllDepotsOverview
    ? aggregateDepotOverview(visibleDepots)
    : null;

  const lastUpdatedAt = visibleDepots.reduce<string | null>((latest, depot) => {
    if (!latest) {
      return depot.parcelDashboard.lastUpdatedAt;
    }

    return new Date(depot.parcelDashboard.lastUpdatedAt) > new Date(latest)
      ? depot.parcelDashboard.lastUpdatedAt
      : latest;
  }, null);

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
      <style>{`
        @keyframes depotDashboardPulseDot {
          0%, 100% { opacity: .35; transform: scale(.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
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
                display: "flex",
                alignItems: "center",
                gap: ".45rem",
                flexWrap: "wrap",
                fontFamily: S.mono,
                fontSize: "11px",
                letterSpacing: ".06em",
                color: S.muted,
              }}
            >
              <span style={liveDotStyle} aria-hidden="true" />
              <span>
                Real-time parcel throughput by depot status, zone, and age.
              </span>
              <span>Refreshes every 60 seconds.</span>
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
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            fontFamily: S.mono,
            fontSize: "11px",
            color: S.muted,
          }}
        >
          <span>
            {lastUpdatedAt
              ? `Last updated ${new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(lastUpdatedAt))}`
              : "Waiting for dashboard data"}
          </span>
          <span style={thresholdBadgeStyle}>
            Alert threshold: older than {thresholdHours} hours in current status
          </span>
        </div>

        {error ? (
          <div style={errorPanelStyle}>{(error as Error).message}</div>
        ) : null}

        {overallOverview ? (
          <section style={{ ...panelStyle, marginBottom: "1rem" }}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={panelEyebrowStyle}>Network Overview</p>
                <h2 style={panelTitleStyle}>Parcels in All Depots Combined</h2>
              </div>
              <div style={panelSummaryStyle}>
                <span style={panelSummaryMetricStyle}>
                  Depots {overallOverview.depotCount}
                </span>
                <span style={panelSummaryMetricStyle}>
                  Total {isLoading ? "..." : overallOverview.totalCount}
                </span>
                <span
                  style={{
                    ...panelSummaryMetricStyle,
                    color: S.danger,
                  }}
                >
                  Alerted {isLoading ? "..." : overallOverview.alertedCount}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                gap: ".85rem",
                padding: "1rem",
              }}
            >
              <div style={statusSectionHeaderStyle}>Parcels in All Depots by Status</div>
              <div style={statusGridStyle}>
                <div style={cardStyle}>
                  <p style={allStatusesCardLabelStyle}>All Statuses</p>
                  <div style={cardMetricGridStyle}>
                    <p style={cardMetricLabelStyle}>Total</p>
                    <p style={{ ...cardMetricLabelStyle, color: S.danger }}>
                      Alerted
                    </p>
                    <p style={cardCountValueStyle}>
                      {isLoading ? "..." : overallOverview.totalCount}
                    </p>
                    <p style={cardAlertCountValueStyle}>
                      {isLoading ? "..." : overallOverview.alertedCount}
                    </p>
                    <Link
                      href={buildParcelListHref({
                        statuses: STATUS_ORDER,
                      })}
                      style={cardArrowLinkStyle}
                      aria-label="Go to all dashboard parcels across all depots"
                      title="Go to parcels"
                    >
                      -&gt;
                    </Link>
                    <Link
                      href={buildParcelListHref({
                        statuses: STATUS_ORDER,
                        currentStatusChangedBefore:
                          overallOverview.agingStatusChangedBefore,
                      })}
                      style={alertArrowLinkStyle}
                      aria-label="Go to alerted dashboard parcels across all depots"
                      title="Go to alerted parcels"
                    >
                      -&gt;
                    </Link>
                  </div>
                </div>

                {overallOverview.statusCounts.map((item) => {
                  const statusAlertCount =
                    overallOverview.agingStatusCounts.find(
                      (agingItem) => agingItem.status === item.status,
                    )?.count ?? 0;

                  return (
                    <div key={item.status} style={cardStyle}>
                      <p style={cardLabelStyle}>{STATUS_LABELS[item.status]}</p>
                      <div style={cardMetricGridStyle}>
                        <p style={cardMetricLabelStyle}>Total</p>
                        <p
                          style={{
                            ...cardMetricLabelStyle,
                            color: S.danger,
                          }}
                        >
                          Alerted
                        </p>
                        <p style={cardCountValueStyle}>
                          {isLoading ? "..." : item.count}
                        </p>
                        <p style={cardAlertCountValueStyle}>
                          {isLoading ? "..." : statusAlertCount}
                        </p>
                        <Link
                          href={buildParcelListHref({
                            statuses: [item.status],
                          })}
                          style={cardArrowLinkStyle}
                          aria-label={`Go to all ${STATUS_LABELS[item.status]} parcels across all depots`}
                          title="Go to parcels"
                        >
                          -&gt;
                        </Link>
                        <Link
                          href={buildParcelListHref({
                            statuses: [item.status],
                            currentStatusChangedBefore:
                              overallOverview.agingStatusChangedBefore,
                          })}
                          style={alertArrowLinkStyle}
                          aria-label={`Go to alerted ${STATUS_LABELS[item.status]} parcels across all depots`}
                          title="Go to alerted parcels"
                        >
                          -&gt;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <div style={{ display: "grid", gap: "1rem" }}>
          {visibleDepots.map((depot) => {
            const statusCounts = STATUS_ORDER.map((status) => {
              const match = depot.parcelDashboard.statusCounts.find(
                (item) => item.status === status,
              );
              return { status, count: match?.count ?? 0 };
            });

            const agingStatusCounts = STATUS_ORDER.map((status) => {
              const match = depot.parcelDashboard.agingAlerts.statusCounts.find(
                (item) => item.status === status,
              );
              return { status, count: match?.count ?? 0 };
            });

            const totalCount = statusCounts.reduce(
              (sum, item) => sum + item.count,
              0,
            );
            const alertedCount = depot.parcelDashboard.agingAlerts.totalCount;

            const agingStatusChangedBefore = depot.parcelDashboard.lastUpdatedAt
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
                  <div style={panelSummaryStyle}>
                    <span style={panelSummaryMetricStyle}>
                      Total {isLoading ? "..." : totalCount}
                    </span>
                    <span
                      style={{
                        ...panelSummaryMetricStyle,
                        color: S.danger,
                      }}
                    >
                      Alerted {isLoading ? "..." : alertedCount}
                    </span>
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
                    <div style={cardStyle}>
                      <p style={allStatusesCardLabelStyle}>All Statuses</p>
                      <div style={cardMetricGridStyle}>
                        <p style={cardMetricLabelStyle}>Total</p>
                        <p style={{ ...cardMetricLabelStyle, color: S.danger }}>
                          Alerted
                        </p>
                        <p style={cardCountValueStyle}>
                          {isLoading ? "..." : totalCount}
                        </p>
                        <p style={cardAlertCountValueStyle}>
                          {isLoading ? "..." : alertedCount}
                        </p>
                        <Link
                          href={buildParcelListHref({
                            depotId: depot.id,
                            statuses: STATUS_ORDER,
                          })}
                          style={cardArrowLinkStyle}
                          aria-label={`Go to all dashboard parcels in ${depot.name}`}
                          title="Go to parcels"
                        >
                          -&gt;
                        </Link>
                        <Link
                          href={buildParcelListHref({
                            depotId: depot.id,
                            statuses: STATUS_ORDER,
                            currentStatusChangedBefore:
                              agingStatusChangedBefore,
                          })}
                          style={alertArrowLinkStyle}
                          aria-label={`Go to alerted dashboard parcels in ${depot.name}`}
                          title="Go to alerted parcels"
                        >
                          -&gt;
                        </Link>
                      </div>
                    </div>

                    {statusCounts.map((item) => {
                      const statusAlertCount =
                        agingStatusCounts.find(
                          (agingItem) => agingItem.status === item.status,
                        )?.count ?? 0;

                      return (
                        <div key={item.status} style={cardStyle}>
                          <p style={cardLabelStyle}>
                            {STATUS_LABELS[item.status]}
                          </p>
                          <div style={cardMetricGridStyle}>
                            <p style={cardMetricLabelStyle}>Total</p>
                            <p
                              style={{
                                ...cardMetricLabelStyle,
                                color: S.danger,
                              }}
                            >
                              Alerted
                            </p>
                            <p style={cardCountValueStyle}>
                              {isLoading ? "..." : item.count}
                            </p>
                            <p style={cardAlertCountValueStyle}>
                              {isLoading ? "..." : statusAlertCount}
                            </p>
                            <Link
                              href={buildParcelListHref({
                                depotId: depot.id,
                                statuses: [item.status],
                              })}
                              style={cardArrowLinkStyle}
                              aria-label={`Go to all ${STATUS_LABELS[item.status]} parcels in ${depot.name}`}
                              title="Go to parcels"
                            >
                              -&gt;
                            </Link>
                            <Link
                              href={buildParcelListHref({
                                depotId: depot.id,
                                statuses: [item.status],
                                currentStatusChangedBefore:
                                  agingStatusChangedBefore,
                              })}
                              style={alertArrowLinkStyle}
                              aria-label={`Go to alerted ${STATUS_LABELS[item.status]} parcels in ${depot.name}`}
                              title="Go to alerted parcels"
                            >
                              -&gt;
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ padding: "0 1rem 1rem" }}>
                  <table style={zoneTableStyle}>
                    <colgroup>
                      <col style={{ width: "22%" }} />
                      {Array.from({ length: 1 + STATUS_ORDER.length }).map(
                        (_, index) => (
                          <col
                            key={index}
                            style={{
                              width: `${78 / (1 + STATUS_ORDER.length)}%`,
                            }}
                          />
                        ),
                      )}
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={tableHeadStyle}>Zone</th>
                        <th style={allStatusesHeadStyle}>All Statuses</th>
                        {STATUS_ORDER.map((status) => (
                          <th key={status} style={statusColumnHeadStyle}>
                            {STATUS_LABELS[status]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(depot.parcelDashboard.zoneBreakdown ?? []).map(
                        (zone) => {
                          const zoneAlertedCount =
                            zone.agingStatusCounts.reduce(
                              (sum, item) => sum + item.count,
                              0,
                            );

                          return (
                            <tr key={zone.zoneId}>
                              <td style={tableCellStyle}>{zone.zoneName}</td>
                              <td
                                style={{
                                  ...tableMetricCellStyle,
                                }}
                              >
                                <div style={metricCellStyle}>
                                  <span>{zone.count}</span>
                                  <span style={zoneAlertValueStyle}>
                                    {zoneAlertedCount}
                                  </span>
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
                                  <Link
                                    href={buildParcelListHref({
                                      depotId: depot.id,
                                      zoneId: zone.zoneId,
                                      currentStatusChangedBefore:
                                        agingStatusChangedBefore,
                                      statuses: STATUS_ORDER,
                                    })}
                                    style={zoneAlertArrowLinkStyle}
                                    aria-label={`Go to alerted parcels for ${zone.zoneName} in ${depot.name}`}
                                    title="Go to alerted parcels"
                                  >
                                    -&gt;
                                  </Link>
                                </div>
                              </td>
                              {STATUS_ORDER.map((status) => {
                                const count =
                                  zone.statusCounts.find(
                                    (item) => item.status === status,
                                  )?.count ?? 0;
                                const agingCount =
                                  zone.agingStatusCounts.find(
                                    (item) => item.status === status,
                                  )?.count ?? 0;
                                return (
                                  <td
                                    key={`${zone.zoneId}-${status}`}
                                    style={statusColumnCellStyle}
                                  >
                                    <div style={metricCellStyle}>
                                      <span>{count}</span>
                                      <span style={zoneAlertValueStyle}>
                                        {agingCount}
                                      </span>
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
                                      <Link
                                        href={buildParcelListHref({
                                          depotId: depot.id,
                                          zoneId: zone.zoneId,
                                          statuses: [status],
                                          currentStatusChangedBefore:
                                            agingStatusChangedBefore,
                                        })}
                                        style={zoneAlertArrowLinkStyle}
                                        aria-label={`Go to alerted ${STATUS_LABELS[status]} parcels in ${zone.zoneName}, ${depot.name}`}
                                        title="Go to alerted parcels"
                                      >
                                        -&gt;
                                      </Link>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        },
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
  currentStatusChangedBefore,
}: {
  depotId?: string;
  statuses?: ParcelStatus[];
  zoneId?: string;
  currentStatusChangedBefore?: string;
}) {
  const params = new URLSearchParams();

  if (depotId) {
    params.set("depotId", depotId);
  }

  if (statuses && statuses.length > 0) {
    params.set("status", statuses.join(","));
  }

  if (zoneId) {
    params.set("zoneId", zoneId);
  }

  if (currentStatusChangedBefore) {
    params.set("currentStatusChangedBefore", currentStatusChangedBefore);
  }

  return `/parcels?${params.toString()}`;
}

function aggregateDepotOverview(depots: DepotDashboardViewModel[]) {
  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: depots.reduce((sum, depot) => {
      const item = depot.parcelDashboard.statusCounts.find(
        (statusCount) => statusCount.status === status,
      );
      return sum + (item?.count ?? 0);
    }, 0),
  }));

  const agingStatusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: depots.reduce((sum, depot) => {
      const item = depot.parcelDashboard.agingAlerts.statusCounts.find(
        (statusCount) => statusCount.status === status,
      );
      return sum + (item?.count ?? 0);
    }, 0),
  }));

  const totalCount = statusCounts.reduce((sum, item) => sum + item.count, 0);
  const alertedCount = agingStatusCounts.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const lastUpdatedAt = depots.reduce<string | null>((latest, depot) => {
    if (!latest) {
      return depot.parcelDashboard.lastUpdatedAt;
    }

    return new Date(depot.parcelDashboard.lastUpdatedAt) > new Date(latest)
      ? depot.parcelDashboard.lastUpdatedAt
      : latest;
  }, null);

  const agingStatusChangedBefore = lastUpdatedAt
    ? new Date(lastUpdatedAt).toISOString()
    : undefined;

  return {
    depotCount: depots.length,
    statusCounts,
    agingStatusCounts,
    totalCount,
    alertedCount,
    agingStatusChangedBefore,
  };
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

const thresholdBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: ".35rem .6rem",
  borderRadius: 999,
  border: `1px solid ${S.border}`,
  background: S.panelStrong,
  color: S.text,
  whiteSpace: "nowrap",
};

const liveDotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#22c55e",
  boxShadow: "0 0 6px #22c55e",
  display: "inline-block",
  animation: "depotDashboardPulseDot 2.2s ease-in-out infinite",
  flexShrink: 0,
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
  gap: "1rem",
  flexWrap: "wrap",
  padding: "1rem",
  borderBottom: `1px solid ${S.border}`,
};

const panelSummaryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: ".75rem",
  flexWrap: "wrap",
  fontFamily: S.mono,
  fontSize: "11px",
};

const panelSummaryMetricStyle: React.CSSProperties = {
  color: S.text,
  whiteSpace: "nowrap",
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
  minHeight: 132,
  display: "flex",
  flexDirection: "column",
};

const cardMetricGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  columnGap: ".9rem",
  rowGap: ".35rem",
  marginTop: ".85rem",
  alignItems: "end",
};

const cardMetricLabelStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: S.mono,
  fontSize: "10px",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: S.muted,
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

const allStatusesCardLabelStyle: React.CSSProperties = {
  ...cardLabelStyle,
  color: S.accent,
  fontWeight: 800,
};

const cardCountValueStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: S.mono,
  fontSize: "1.9rem",
  fontWeight: 800,
  color: S.text,
  lineHeight: 1,
  alignSelf: "baseline",
};

const cardAlertCountValueStyle: React.CSSProperties = {
  ...cardCountValueStyle,
  fontSize: "1.4rem",
  color: S.danger,
};

const alertArrowLinkStyle: React.CSSProperties = {
  color: S.danger,
  textDecoration: "none",
  fontFamily: S.mono,
  fontSize: "11px",
  lineHeight: 1,
};

const cardArrowLinkStyle: React.CSSProperties = {
  color: S.accent,
  textDecoration: "none",
  fontFamily: S.mono,
  fontSize: "11px",
  lineHeight: 1,
};

const zoneTableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
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

const allStatusesHeadStyle: React.CSSProperties = {
  ...tableHeadStyle,
  textAlign: "center",
  color: S.accent,
  fontWeight: 800,
};

const statusColumnHeadStyle: React.CSSProperties = {
  ...tableHeadStyle,
  textAlign: "center",
  borderLeft: `1px solid rgba(255,255,255,.06)`,
};

const tableCellStyle: React.CSSProperties = {
  padding: ".9rem 0",
  borderBottom: `1px solid rgba(255,255,255,.04)`,
  fontFamily: S.mono,
  fontSize: "12px",
  color: S.text,
};

const tableMetricCellStyle: React.CSSProperties = {
  ...tableCellStyle,
  textAlign: "center",
  verticalAlign: "top",
};

const statusColumnCellStyle: React.CSSProperties = {
  ...tableMetricCellStyle,
  borderLeft: `1px solid rgba(255,255,255,.05)`,
};

const emptyCellStyle: React.CSSProperties = {
  ...tableCellStyle,
  textAlign: "center",
  color: S.muted,
};

const inlineArrowLinkStyle: React.CSSProperties = {
  color: S.accent,
  textDecoration: "none",
  fontFamily: S.mono,
  fontSize: "11px",
  lineHeight: 1,
};

const metricCellStyle: React.CSSProperties = {
  display: "grid",
  width: "100%",
  gridTemplateColumns: "repeat(2, minmax(2.2rem, auto))",
  justifyItems: "center",
  alignItems: "center",
  justifyContent: "center",
  columnGap: ".45rem",
  rowGap: ".3rem",
  fontVariantNumeric: "tabular-nums",
  textAlign: "center",
};

const zoneAlertValueStyle: React.CSSProperties = {
  color: S.danger,
};

const zoneAlertArrowLinkStyle: React.CSSProperties = {
  color: S.danger,
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
