"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { graphql } from "@/lib/api/graphql";

const mono = "var(--font-geist-mono, monospace)";

// ─── Role helpers ──────────────────────────────────────────────────────────────
const DEPOT_ROLES = new Set(["Admin", "OperationsManager", "DepotOperator", "WarehouseOperator"]);
const ADMIN_OR_OM  = new Set(["Admin", "OperationsManager"]);
const ADMIN_ONLY   = new Set(["Admin"]);
const WH_MGR       = new Set(["Admin", "WarehouseManager"]);
const DISPATCHER   = new Set(["Admin", "OperationsManager", "Dispatcher"]);

function can(role: string | undefined, set: Set<string>) {
  return set.has(role ?? "");
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const SZ = 28;
const iconProps = { width: SZ, height: SZ, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Icons = {
  parcels:   <svg {...iconProps}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  newParcel: <svg {...iconProps}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  import:    <svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  receive:   <svg {...iconProps}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  sort:      <svg {...iconProps}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  stage:     <svg {...iconProps}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  loadout:   <svg {...iconProps}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  routes:    <svg {...iconProps}><circle cx="3" cy="6" r="3"/><circle cx="21" cy="18" r="3"/><path d="M6 6h4l6 12h4"/></svg>,
  newRoute:  <svg {...iconProps}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  dashboard: <svg {...iconProps}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  depots:    <svg {...iconProps}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  drivers:   <svg {...iconProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  vehicles:  <svg {...iconProps}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  zones:     <svg {...iconProps}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
  users:     <svg {...iconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  bins:      <svg {...iconProps}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  auditLogs: <svg {...iconProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
};

// ─── Nav card data ──────────────────────────────────────────────────────────────
interface NavCard { href: string; label: string; sub: string; icon: React.ReactNode; }
interface NavGroup { title: string; cards: NavCard[]; show: boolean; }

// ─── Dashboard stats query ──────────────────────────────────────────────────────
const STATS_QUERY = `
  query HomeDashboard {
    delivered:       parcels(first: 1, where: { status: { eq: DELIVERED }         }) { totalCount }
    outForDelivery:  parcels(first: 1, where: { status: { eq: OUT_FOR_DELIVERY }   }) { totalCount }
    sorted:          parcels(first: 1, where: { status: { eq: SORTED }             }) { totalCount }
    registered:      parcels(first: 1, where: { status: { eq: REGISTERED }         }) { totalCount }
  }
`;

const ROUTES_STATS_QUERY = `
  query HomeRoutes {
    activeRoutes: deliveryRoutes(first: 1, where: { status: { eq: DRAFT } }) { totalCount }
    dispatchedRoutes: deliveryRoutes(first: 1, where: { status: { eq: DISPATCHED } }) { totalCount }
  }
`;

interface StatsData {
  delivered:      { totalCount: number };
  outForDelivery: { totalCount: number };
  sorted:         { totalCount: number };
  registered:     { totalCount: number };
}

interface RoutesData {
  activeRoutes:     { totalCount: number };
  dispatchedRoutes: { totalCount: number };
}

// ─── KPI Card component ─────────────────────────────────────────────────────────
function KpiCard({ label, value, accent, loading }: {
  label: string; value: number | string; accent: string; loading: boolean;
}) {
  return (
    <div style={{
      flex: "1 1 160px",
      minWidth: 0,
      padding: "1.25rem 1.5rem",
      background: "rgba(255,255,255,.03)",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: 10,
    }}>
      <p style={{ fontFamily: mono, fontSize: "10px", letterSpacing: ".18em", color: "#647a96", textTransform: "uppercase", marginBottom: ".625rem" }}>
        {label}
      </p>
      <p style={{ fontFamily: mono, fontSize: "2rem", fontWeight: 800, letterSpacing: "-.04em", color: loading ? "#2a3f57" : "#e2e8f0", lineHeight: 1 }}>
        {loading ? "—" : value}
      </p>
      <div style={{ marginTop: ".75rem", height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${accent} 0%, transparent 100%)`, opacity: .4 }} />
    </div>
  );
}

// ─── NavCard component ──────────────────────────────────────────────────────────
function NavCardItem({ href, label, sub, icon }: NavCard) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div className="tm-nav-card">
        <div style={{ color: "#f59e0b", marginBottom: ".75rem" }}>{icon}</div>
        <p style={{ fontFamily: mono, fontSize: "12px", fontWeight: 700, color: "#e2e8f0", letterSpacing: ".02em", marginBottom: ".25rem" }}>
          {label}
        </p>
        <p style={{ fontFamily: mono, fontSize: "10px", color: "#647a96", letterSpacing: ".04em", lineHeight: 1.4 }}>
          {sub}
        </p>
      </div>
    </Link>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────
export default function Home() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const name = session?.user?.name ?? session?.user?.email ?? "User";

  const isDepotOp   = can(role, DEPOT_ROLES);
  const isAdminOrOm = can(role, ADMIN_OR_OM);
  const isAdmin     = can(role, ADMIN_ONLY);
  const isWhMgr     = can(role, WH_MGR);
  const isDispatch  = can(role, DISPATCHER);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["home-stats"],
    queryFn: () => graphql<StatsData>(STATS_QUERY),
    refetchInterval: 60_000,
    retry: false,
  });

  const { data: routeStats, isLoading: routesLoading } = useQuery({
    queryKey: ["home-route-stats"],
    queryFn: () => graphql<RoutesData>(ROUTES_STATS_QUERY),
    refetchInterval: 60_000,
    retry: false,
    enabled: isDepotOp,
  });

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const groups: NavGroup[] = [
    {
      title: "Parcels",
      show: true,
      cards: [
        { href: "/parcels",       label: "All Parcels",   sub: "Browse & track",   icon: Icons.parcels   },
        { href: "/parcels/new",   label: "New Parcel",    sub: "Register parcel",  icon: Icons.newParcel },
        { href: "/parcels/import",label: "Import",        sub: "Bulk CSV / XLSX",  icon: Icons.import    },
      ],
    },
    {
      title: "Warehouse operations",
      show: isDepotOp,
      cards: [
        { href: "/depot/receiving", label: "Receive",   sub: "Inbound manifests", icon: Icons.receive },
        { href: "/depot/sort",      label: "Sort",       sub: "Bin assignment",    icon: Icons.sort    },
        { href: "/depot/stage",     label: "Stage",      sub: "Route staging",     icon: Icons.stage   },
        { href: "/load-out",        label: "Load Out",   sub: "Scan onto vehicle", icon: Icons.loadout },
      ],
    },
    {
      title: "Dispatch",
      show: isDispatch,
      cards: [
        { href: "/routes",     label: "Routes",     sub: "All delivery routes", icon: Icons.routes   },
        { href: "/routes/new", label: "New Route",  sub: "Plan a route",        icon: Icons.newRoute },
      ],
    },
    {
      title: "Administration",
      show: isAdminOrOm || isWhMgr,
      cards: [
        ...(isAdminOrOm ? [{ href: "/admin/depot-dashboard", label: "Depot Dashboard", sub: "Live parcel stats",  icon: Icons.dashboard }] : []),
        ...(isAdminOrOm ? [{ href: "/admin/depots",          label: "Depots",           sub: "Manage depots",      icon: Icons.depots    }] : []),
        ...(isAdminOrOm ? [{ href: "/admin/drivers",         label: "Drivers",          sub: "Driver registry",    icon: Icons.drivers   }] : []),
        ...(isAdminOrOm ? [{ href: "/admin/vehicles",        label: "Vehicles",         sub: "Fleet registry",     icon: Icons.vehicles  }] : []),
        ...(isAdmin     ? [{ href: "/admin/zones",           label: "Zones",            sub: "Delivery zones",     icon: Icons.zones     }] : []),
        ...(isAdmin     ? [{ href: "/admin/users",           label: "Users",            sub: "User accounts",      icon: Icons.users     }] : []),
        ...(isWhMgr     ? [{ href: "/warehouse",             label: "Bins",             sub: "Warehouse layout",   icon: Icons.bins      }] : []),
        ...(isAdmin     ? [{ href: "/admin/audit-logs",      label: "Audit Logs",       sub: "Activity history",   icon: Icons.auditLogs }] : []),
      ],
    },
  ];

  const activeRoutes   = (routeStats?.activeRoutes.totalCount ?? 0) + (routeStats?.dispatchedRoutes.totalCount ?? 0);
  const kpis = [
    { label: "Registered",      value: stats?.registered.totalCount      ?? 0, accent: "#f59e0b" },
    { label: "Sorted",           value: stats?.sorted.totalCount           ?? 0, accent: "#38bdf8" },
    { label: "Out for Delivery", value: stats?.outForDelivery.totalCount   ?? 0, accent: "#f59e0b" },
    { label: "Delivered",        value: stats?.delivered.totalCount        ?? 0, accent: "#22c55e" },
    ...(isDepotOp ? [{ label: "Active Routes", value: activeRoutes, accent: "#f59e0b" }] : []),
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scanline { 0% { top:-4px; } 100% { top:110%; } }
        @keyframes pulseDot { 0%,100% { opacity:.3; transform:scale(.85); } 50% { opacity:1; transform:scale(1.15); } }
        .fu { animation: fadeUp .45s both ease; }
        .fu-1 { animation-delay:.05s; }
        .fu-2 { animation-delay:.12s; }
        .fu-3 { animation-delay:.20s; }
        .fu-4 { animation-delay:.28s; }
        .scanline {
          position:fixed; left:0; right:0; height:3px; z-index:5; pointer-events:none;
          background:linear-gradient(90deg,transparent 0%,rgba(245,158,11,.08) 50%,transparent 100%);
          animation:scanline 10s linear infinite;
        }
        .pulse-dot { animation: pulseDot 2.2s ease-in-out infinite; }
        .tm-nav-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 1.25rem;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          cursor: pointer;
          transition: border-color .15s, background .15s, transform .15s;
          height: 100%;
          box-sizing: border-box;
        }
        .tm-nav-card:hover {
          border-color: rgba(245,158,11,.35);
          background: rgba(245,158,11,.04);
          transform: translateY(-2px);
        }
        .tm-group-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: .75rem;
        }
      `}</style>

      <div className="scanline" />

      <div style={{ minHeight: "100vh", background: "#080c14", color: "#e2e8f0", position: "relative" }}>
        {/* Grid bg */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(30,42,66,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.4) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* ── Top bar ─────────────────────────────────────────── */}
          <header style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 2rem", height: 56,
            borderBottom: "1px solid rgba(255,255,255,.06)",
            background: "rgba(8,12,20,.85)",
            backdropFilter: "blur(12px)",
            position: "sticky", top: 0, zIndex: 10,
          }}>
            <span style={{ fontFamily: mono, fontSize: ".875rem", fontWeight: 800, letterSpacing: "-.01em", color: "#e2e8f0" }}>
              LAST <span style={{ color: "#f59e0b" }}>MILE</span> TMS
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              {session?.user?.email && (
                <span style={{ fontFamily: mono, fontSize: "11px", color: "#647a96", letterSpacing: ".06em" }}>
                  {session.user.email}
                </span>
              )}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  fontFamily: mono, fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase",
                  padding: ".375rem .875rem",
                  background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 6, color: "#647a96", cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </header>

          {/* ── Page body ────────────────────────────────────────── */}
          <div style={{ padding: "2rem", maxWidth: 1400, margin: "0 auto" }}>

            {/* Header */}
            <div className="fu fu-1" style={{ marginBottom: "2rem" }}>
              <p style={{ fontFamily: mono, fontSize: "10px", letterSpacing: ".2em", color: "#f59e0b", textTransform: "uppercase", marginBottom: ".375rem" }}>
                {today}
              </p>
              <h1 style={{ fontFamily: mono, fontSize: "1.5rem", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-.02em", lineHeight: 1, marginBottom: ".375rem" }}>
                Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {name.split(" ")[0]}.
              </h1>
              <p style={{ fontFamily: mono, fontSize: "11px", color: "#647a96", letterSpacing: ".06em" }}>
                {role ?? "User"} · Last Mile TMS Operations Center
              </p>
            </div>

            {/* ── KPI stats ──────────────────────────────────────── */}
            <div className="fu fu-2" style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
              {kpis.map((k) => (
                <KpiCard key={k.label} label={k.label} value={k.value} accent={k.accent} loading={statsLoading || (k.label === "Active Routes" && routesLoading)} />
              ))}
            </div>

            {/* ── Navigation card groups ──────────────────────────── */}
            {(() => {
              const visible = groups.filter(g => g.show && g.cards.length > 0);
              const left  = visible.filter(g => ["Parcels","Dispatch"].includes(g.title));
              const right = visible.filter(g => ["Warehouse operations","Administration"].includes(g.title));
              const hasTwo = left.length > 0 && right.length > 0;
              return (
                <div className="fu fu-3" style={{ display: hasTwo ? "grid" : "block", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  {/* Left column */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {(hasTwo ? left : visible).map((g) => (
                      <div key={g.title}>
                        <p style={{ fontFamily: mono, fontSize: "10px", letterSpacing: ".2em", color: "#647a96", textTransform: "uppercase", marginBottom: ".625rem" }}>
                          {g.title}
                        </p>
                        <div className="tm-group-grid">
                          {g.cards.map((c) => <NavCardItem key={c.href} {...c} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Right column */}
                  {hasTwo && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                      {right.map((g) => (
                        <div key={g.title}>
                          <p style={{ fontFamily: mono, fontSize: "10px", letterSpacing: ".2em", color: "#647a96", textTransform: "uppercase", marginBottom: ".625rem" }}>
                            {g.title}
                          </p>
                          <div className="tm-group-grid">
                            {g.cards.map((c) => <NavCardItem key={c.href} {...c} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── Footer ──────────────────────────────────────────── */}
          <div className="fu fu-4" style={{
            padding: "1.5rem 2rem",
            borderTop: "1px solid rgba(255,255,255,.04)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: "3rem",
          }}>
            <span style={{ fontFamily: mono, fontSize: "10px", color: "#4e6480", letterSpacing: ".15em" }}>
              LAST MILE TMS · 2026
            </span>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              {["DEPOT", "DISPATCH", "TRACKING"].map((s) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                  <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  <span style={{ fontFamily: mono, fontSize: "10px", color: "#4e6480", letterSpacing: ".14em" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
