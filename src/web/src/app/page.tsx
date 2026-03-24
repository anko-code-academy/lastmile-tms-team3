import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  const stats = [
    { label: "PARCELS TODAY",     value: "1,248", delta: "+84",  accent: "#f59e0b", glow: "rgba(245,158,11,.15)" },
    { label: "ACTIVE ROUTES",     value: "17",    delta: "+2",   accent: "#f59e0b", glow: "rgba(245,158,11,.15)" },
    { label: "OUT FOR DELIVERY",  value: "394",   delta: "32%",  accent: "#22c55e", glow: "rgba(34,197,94,.12)"  },
    { label: "DELIVERED",         value: "831",   delta: "67%",  accent: "#22c55e", glow: "rgba(34,197,94,.12)"  },
  ];

  const activity = [
    { time: "14:32", id: "LM-2026-04821", event: "Out for Delivery",   color: "#f59e0b" },
    { time: "14:28", id: "R-031",          event: "Route dispatched",    color: "#22c55e" },
    { time: "14:21", id: "LM-2026-04799", event: "Delivered — POD captured", color: "#22c55e" },
    { time: "14:17", id: "LM-2026-04763", event: "Failed attempt — not home", color: "#ef4444" },
    { time: "14:09", id: "LM-2026-04750", event: "Sorted → Zone North", color: "#3b82f6" },
    { time: "13:58", id: "R-029",          event: "Route completed",     color: "#22c55e" },
  ];

  const routes = [
    { id: "R-031", driver: "M. Petrov",    zone: "NORTH",  stops: 24, done: 6  },
    { id: "R-032", driver: "A. Ivanova",   zone: "SOUTH",  stops: 31, done: 14 },
    { id: "R-033", driver: "D. Kovalev",   zone: "EAST",   stops: 19, done: 19 },
    { id: "R-034", driver: "O. Shevchenko",zone: "CENTRE", stops: 28, done: 9  },
  ];

  const isAdmin = session?.role === "Admin";

  const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "Parcels", href: "#" },
    { label: "Routes", href: "#" },
    { label: "Drivers", href: "#" },
    ...(isAdmin ? [
      { label: "Depot", href: "/admin/depots" },
      { label: "Users", href: "/admin/users" },
    ] : []),
  ];

  return (
    <>
      <style>{`
        @keyframes scanline {
          0%   { top: -4px; }
          100% { top: 110%; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: .3; transform: scale(.85); }
          50%       { opacity: 1; transform: scale(1.15); }
        }
        @keyframes glowKpi {
          0%, 100% { box-shadow: 0 0 0 rgba(245,158,11,0); }
          50%       { box-shadow: 0 0 18px rgba(245,158,11,.12); }
        }
        .scanline {
          position: fixed; left: 0; right: 0; height: 3px; z-index: 5;
          background: linear-gradient(90deg, transparent 0%, rgba(245,158,11,.10) 50%, transparent 100%);
          animation: scanline 8s linear infinite;
          pointer-events: none;
        }
        .fu-0 { animation: fadeUp .5s .05s both ease; }
        .fu-1 { animation: fadeUp .5s .12s both ease; }
        .fu-2 { animation: fadeUp .5s .20s both ease; }
        .fu-3 { animation: fadeUp .5s .28s both ease; }
        .fu-4 { animation: fadeUp .5s .36s both ease; }
        .fu-5 { animation: fadeUp .5s .44s both ease; }
        .fu-6 { animation: fadeUp .5s .52s both ease; }
        .pulse-dot { animation: pulseDot 2.2s ease-in-out infinite; }
        .nav-link {
          font-family: var(--font-geist-mono, monospace);
          font-size: 11px; letter-spacing: .14em;
          color: #3d4f6b; text-decoration: none;
          text-transform: uppercase; padding: .375rem .5rem;
          border-radius: 4px;
          transition: color .15s, background .15s;
        }
        .nav-link:hover { color: #e2e8f0; background: rgba(255,255,255,.04); }
        .nav-link.active { color: #f59e0b; }
        .kpi-card {
          flex: 1; min-width: 0;
          padding: 1.5rem;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 10px;
          transition: border-color .2s, box-shadow .2s;
        }
        .kpi-card:hover {
          border-color: rgba(245,158,11,.2);
          box-shadow: 0 0 20px rgba(245,158,11,.07);
        }
        .panel {
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 10px;
          overflow: hidden;
        }
        .panel-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,.06);
          display: flex; align-items: center; justify-content: space-between;
        }
        .activity-row {
          display: flex; align-items: center; gap: .875rem;
          padding: .75rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,.04);
          transition: background .15s;
        }
        .activity-row:last-child { border-bottom: none; }
        .activity-row:hover { background: rgba(255,255,255,.025); }
        .route-card {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }
        .route-card:last-child { border-bottom: none; }
        .progress-track {
          height: 3px; border-radius: 2px;
          background: rgba(255,255,255,.06);
          overflow: hidden; margin-top: .625rem;
        }
        .signout-btn {
          font-family: var(--font-geist-mono, monospace);
          font-size: 10px; letter-spacing: .14em;
          text-transform: uppercase;
          padding: .375rem .875rem;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 6px; color: #4a5f7a;
          cursor: pointer;
          transition: border-color .15s, color .15s, background .15s;
        }
        .signout-btn:hover {
          border-color: rgba(239,68,68,.3);
          color: #fca5a5;
          background: rgba(239,68,68,.06);
        }
      `}</style>

      {/* Scanline */}
      <div className="scanline" />

      <div style={{
        minHeight: "100vh",
        background: "#080c14",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Grid background */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(30,42,66,.45) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(30,42,66,.45) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          pointerEvents: "none",
        }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ── Navbar ── */}
          <nav className="fu-0" style={{
            display: "flex", alignItems: "center",
            padding: "0 2rem", height: "56px",
            borderBottom: "1px solid rgba(255,255,255,.06)",
            background: "rgba(8,12,20,.85)",
            backdropFilter: "blur(12px)",
            position: "sticky", top: 0, zIndex: 10,
            gap: "2rem",
          }}>
            {/* Logo */}
            <span style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: ".875rem", fontWeight: 800, letterSpacing: "-.01em",
              color: "#e2e8f0", flexShrink: 0,
            }}>
              LAST <span style={{ color: "#f59e0b" }}>MILE</span> TMS
            </span>

            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: ".375rem", flexShrink: 0 }}>
              <span
                className="pulse-dot"
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 6px #22c55e",
                  display: "inline-block",
                }}
              />
              <span style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "9px", color: "#3a9e5c", letterSpacing: ".15em",
              }}>
                LIVE
              </span>
            </div>

            {/* Nav items */}
            <div style={{ display: "flex", gap: ".25rem", flex: 1 }}>
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`nav-link${item.label === "Dashboard" ? " active" : ""}`}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* User + signout */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
              {session?.user?.email && (
                <span style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: "10px", color: "#3d4f6b", letterSpacing: ".08em",
                  maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {session.user.email}
                </span>
              )}
              <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
                <button type="submit" className="signout-btn">Sign out</button>
              </form>
            </div>
          </nav>

          {/* ── Page body ── */}
          <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>

            {/* Page header */}
            <div className="fu-1" style={{ marginBottom: "2rem" }}>
              <p style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "10px", letterSpacing: ".2em",
                color: "#f59e0b", textTransform: "uppercase", marginBottom: ".375rem",
              }}>
                Operations Center
              </p>
              <h1 style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "1.5rem", fontWeight: 800,
                color: "#e2e8f0", letterSpacing: "-.02em", lineHeight: 1,
              }}>
                Dashboard
              </h1>
            </div>

            {/* ── KPI row ── */}
            <div className="fu-2" style={{
              display: "flex", gap: "1rem",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
            }}>
              {stats.map((s) => (
                <div key={s.label} className="kpi-card">
                  <p style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "9px", letterSpacing: ".2em",
                    color: "#3d4f6b", textTransform: "uppercase", marginBottom: ".75rem",
                  }}>
                    {s.label}
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: ".625rem" }}>
                    <span style={{
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-.04em",
                      color: "#e2e8f0", lineHeight: 1,
                    }}>
                      {s.value}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: "11px", color: s.accent,
                      letterSpacing: ".05em",
                    }}>
                      {s.delta}
                    </span>
                  </div>
                  <div style={{
                    marginTop: ".875rem", height: "2px", borderRadius: "1px",
                    background: `linear-gradient(90deg, ${s.accent} 0%, transparent 100%)`,
                    opacity: .35,
                  }} />
                </div>
              ))}
            </div>

            {/* ── Two-column lower section ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}>

              {/* Recent Activity */}
              <div className="fu-3 panel">
                <div className="panel-header">
                  <span style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "10px", letterSpacing: ".18em",
                    color: "#4a5f7a", textTransform: "uppercase",
                  }}>
                    Recent Activity
                  </span>
                  <span style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "9px", color: "#3a526e", letterSpacing: ".1em",
                  }}>
                    AUTO-REFRESH 60s
                  </span>
                </div>
                {activity.map((a) => (
                  <div key={`${a.time}-${a.id}`} className="activity-row">
                    <span style={{
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: "10px", color: "#3a526e", letterSpacing: ".05em",
                      flexShrink: 0, width: "38px",
                    }}>
                      {a.time}
                    </span>
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: a.color,
                      flexShrink: 0, display: "inline-block",
                    }} />
                    <span style={{
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: "10px", color: "#f59e0b", letterSpacing: ".05em",
                      flexShrink: 0,
                    }}>
                      #{a.id}
                    </span>
                    <span style={{
                      fontSize: ".8rem", color: "#4a5f7a",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {a.event}
                    </span>
                  </div>
                ))}
              </div>

              {/* Route Status */}
              <div className="fu-4 panel">
                <div className="panel-header">
                  <span style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "10px", letterSpacing: ".18em",
                    color: "#4a5f7a", textTransform: "uppercase",
                  }}>
                    Route Status
                  </span>
                  <span style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "9px",
                    color: "#3a9e5c",
                    letterSpacing: ".1em",
                    display: "flex", alignItems: "center", gap: ".3rem",
                  }}>
                    <span
                      className="pulse-dot"
                      style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: "#22c55e",
                        display: "inline-block",
                      }}
                    />
                    {routes.filter(r => r.done < r.stops).length} ACTIVE
                  </span>
                </div>
                {routes.map((r) => {
                  const pct = Math.round((r.done / r.stops) * 100);
                  const done = r.done === r.stops;
                  return (
                    <div key={r.id} className="route-card">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".375rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                          <span style={{
                            fontFamily: "var(--font-geist-mono, monospace)",
                            fontSize: "11px", fontWeight: 700,
                            color: "#f59e0b", letterSpacing: ".08em",
                          }}>
                            {r.id}
                          </span>
                          <span style={{
                            fontFamily: "var(--font-geist-mono, monospace)",
                            fontSize: "9px", letterSpacing: ".14em",
                            color: "#3a526e",
                            padding: ".15rem .5rem",
                            border: "1px solid rgba(255,255,255,.06)",
                            borderRadius: "3px",
                          }}>
                            {r.zone}
                          </span>
                        </div>
                        <span style={{
                          fontFamily: "var(--font-geist-mono, monospace)",
                          fontSize: "10px",
                          color: done ? "#22c55e" : "#4a5f7a",
                          letterSpacing: ".05em",
                        }}>
                          {r.done}/{r.stops} stops
                        </span>
                      </div>
                      <div style={{ fontSize: ".8rem", color: "#3d4f6b", marginBottom: ".5rem" }}>
                        {r.driver}
                      </div>
                      <div className="progress-track">
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: done
                            ? "linear-gradient(90deg, #22c55e, #16a34a)"
                            : "linear-gradient(90deg, #f59e0b, #d97706)",
                          borderRadius: "2px",
                          transition: "width .4s ease",
                        }} />
                      </div>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        marginTop: ".375rem",
                      }}>
                        <span style={{
                          fontFamily: "var(--font-geist-mono, monospace)",
                          fontSize: "9px", color: "#3a526e", letterSpacing: ".1em",
                        }}>
                          {pct}% complete
                        </span>
                        <span style={{
                          fontFamily: "var(--font-geist-mono, monospace)",
                          fontSize: "9px",
                          color: done ? "#22c55e" : "#f59e0b",
                          letterSpacing: ".12em",
                        }}>
                          {done ? "COMPLETED" : "IN PROGRESS"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="fu-6" style={{
            padding: "1.5rem 2rem",
            borderTop: "1px solid rgba(255,255,255,.04)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: "9px", color: "#3a526e", letterSpacing: ".15em",
            }}>
              LAST MILE TMS · ANKO SOFTWARE · 2026
            </span>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              {["DEPOT", "DISPATCH", "TRACKING"].map((s) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                  <span
                    className="pulse-dot"
                    style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "#22c55e",
                      display: "inline-block",
                    }}
                  />
                  <span style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "9px", color: "#3a526e", letterSpacing: ".14em",
                  }}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
