"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function TmNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "Admin";
  const isAdminOrOm = isAdmin || session?.user?.role === "OperationsManager";

  const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "Parcels", href: "#" },
    { label: "Routes", href: "#" },
    ...(isAdminOrOm ? [{ label: "Depots", href: "/admin/depots" }] : []),
    ...(isAdmin ? [{ label: "Zones", href: "/admin/zones" }] : []),
    ...(isAdminOrOm ? [
      { label: "Drivers", href: "/admin/drivers" },
      { label: "Vehicles", href: "/admin/vehicles" },
    ] : []),
    ...(isAdmin ? [{ label: "Users", href: "/admin/users" }] : []),
  ];

  const mono = "var(--font-geist-mono, monospace)";

  return (
    <>
      <style>{`
        .tm-nav-link {
          font-family: var(--font-geist-mono, monospace);
          font-size: 11px; letter-spacing: .14em;
          text-decoration: none; text-transform: uppercase;
          padding: .375rem .5rem; border-radius: 4px;
          color: #3d4f6b;
          transition: color .15s, background .15s;
        }
        .tm-nav-link:hover { color: #e2e8f0; background: rgba(255,255,255,.04); }
        .tm-nav-link.tm-active { color: #f59e0b; }
      `}</style>
      <nav style={{
        display: "flex", alignItems: "center",
        padding: "0 2rem", height: "56px",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        background: "rgba(8,12,20,.85)",
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 10,
        gap: "2rem",
      }}>
        <span style={{
          fontFamily: mono, fontSize: ".875rem", fontWeight: 800,
          letterSpacing: "-.01em", color: "#e2e8f0", flexShrink: 0,
        }}>
          LAST <span style={{ color: "#f59e0b" }}>MILE</span> TMS
        </span>
        <div style={{ display: "flex", gap: ".25rem", flex: 1 }}>
          {navItems.map((item) => {
            const isActive =
              item.href !== "#" &&
              (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
            return (
              <a
                key={item.label}
                href={item.href}
                className={`tm-nav-link${isActive ? " tm-active" : ""}`}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
