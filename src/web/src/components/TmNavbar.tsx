"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export default function TmNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Breadcrumb: convert "/admin/drivers" → ["Admin", "Drivers"]
  const crumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "));

  const mono = "var(--font-geist-mono, monospace)";

  return (
    <>
      <style>{`
        .tm-home-btn {
          display: flex; align-items: center; gap: .4rem;
          font-family: var(--font-geist-mono, monospace);
          font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
          padding: .35rem .7rem;
          background: rgba(245,158,11,.08);
          border: 1px solid rgba(245,158,11,.25);
          border-radius: 6px;
          color: #f59e0b;
          text-decoration: none;
          transition: background .15s, border-color .15s;
          flex-shrink: 0;
        }
        .tm-home-btn:hover {
          background: rgba(245,158,11,.15);
          border-color: rgba(245,158,11,.45);
        }
        .tm-signout {
          font-family: var(--font-geist-mono, monospace);
          font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
          padding: .35rem .8rem;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 6px; color: #647a96; cursor: pointer;
          transition: border-color .15s, color .15s, background .15s;
          flex-shrink: 0;
        }
        .tm-signout:hover {
          border-color: rgba(239,68,68,.3);
          color: #fca5a5;
          background: rgba(239,68,68,.06);
        }
      `}</style>

      <nav style={{
        display: "flex",
        alignItems: "center",
        padding: "0 2rem",
        height: "52px",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        background: "rgba(8,12,20,.9)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        gap: "1rem",
      }}>
        {/* Logo */}
        <span style={{ fontFamily: mono, fontSize: ".875rem", fontWeight: 800, letterSpacing: "-.01em", color: "#e2e8f0", flexShrink: 0, marginRight: ".5rem" }}>
          LAST <span style={{ color: "#f59e0b" }}>MILE</span>
        </span>

        {/* Home button */}
        <Link href="/" className="tm-home-btn">
          <HomeIcon />
          Home
        </Link>

        {/* Breadcrumb */}
        {crumbs.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", flex: 1, overflow: "hidden" }}>
            <span style={{ color: "rgba(255,255,255,.15)", fontSize: "14px" }}>/</span>
            {crumbs.map((c, i) => (
              <span key={i} style={{ fontFamily: mono, fontSize: "11px", color: i === crumbs.length - 1 ? "#c0cfe0" : "#4e6480", letterSpacing: ".08em", whiteSpace: "nowrap" }}>
                {c}{i < crumbs.length - 1 && <span style={{ marginLeft: ".4rem", color: "rgba(255,255,255,.15)" }}>/</span>}
              </span>
            ))}
          </div>
        )}

        {/* Right: user + sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: ".875rem", marginLeft: "auto", flexShrink: 0 }}>
          {session?.user?.email && (
            <span style={{ fontFamily: mono, fontSize: "10px", color: "#4e6480", letterSpacing: ".06em", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session.user.email}
            </span>
          )}
          <button type="button" className="tm-signout" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      </nav>
    </>
  );
}
