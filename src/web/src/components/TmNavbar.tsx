"use client";

import { useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
}

export default function TmNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "Admin";
  const isWarehouseManager = session?.user?.role === "WarehouseManager";
  const isAdminOrOm = isAdmin || session?.user?.role === "OperationsManager";
  const isDepotOperator =
    isAdmin ||
    isAdminOrOm ||
    session?.user?.role === "DepotOperator" ||
    session?.user?.role === "WarehouseOperator";
  const canManageBins = isAdmin || isWarehouseManager;

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/" },
    { label: "Parcels", href: "/parcels" },
    ...(isDepotOperator
      ? [
          {
            label: "Warehouse",
            children: [
              { label: "Receive", href: "/depot/receiving" },
              { label: "Sort", href: "/depot/sort" },
              { label: "Load Out", href: "/load-out" },
            ],
          },
        ]
      : []),
    ...(isAdminOrOm
      ? [{ label: "Depot Dashboard", href: "/admin/depot-dashboard" }]
      : []),
    ...(isAdminOrOm ? [{ label: "Depots", href: "/admin/depots" }] : []),
    ...(isAdmin ? [{ label: "Zones", href: "/admin/zones" }] : []),
    ...(canManageBins ? [{ label: "Bins", href: "/warehouse" }] : []),
    ...(isAdminOrOm
      ? [
          { label: "Drivers", href: "/admin/drivers" },
          { label: "Vehicles", href: "/admin/vehicles" },
        ]
      : []),
    ...(isAdmin ? [{ label: "Users", href: "/admin/users" }] : []),
    ...(isAdmin
      ? [{ label: "Audit Logs", href: "/admin/audit-logs" }]
      : []),
  ];

  const mono = "var(--font-geist-mono, monospace)";

  function handleMouseEnter(label: string) {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setOpenDropdown(label);
  }

  function handleMouseLeave() {
    closeTimeout.current = setTimeout(() => setOpenDropdown(null), 150);
  }

  function isActiveHref(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  function isAnyChildActive(item: NavItem) {
    return item.children?.some((c) => isActiveHref(c.href)) ?? false;
  }

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
          white-space: nowrap;
        }
        .tm-nav-link:hover { color: #e2e8f0; background: rgba(255,255,255,.04); }
        .tm-nav-link.tm-active { color: #f59e0b; }
        .tm-dropdown {
          position: absolute; top: 100%; left: 0; margin-top: 4px;
          background: #0d1424; border: 1px solid rgba(255,255,255,.07);
          border-radius: 8px; padding: .375rem 0; min-width: 160px;
          box-shadow: 0 8px 24px rgba(0,0,0,.4);
        }
        .tm-dropdown a {
          display: block; padding: .45rem .85rem;
          font-family: var(--font-geist-mono, monospace);
          font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
          color: #4a5f7a; text-decoration: none;
          transition: color .12s, background .12s;
        }
        .tm-dropdown a:hover { color: #e2e8f0; background: rgba(255,255,255,.04); }
        .tm-dropdown a.tm-active { color: #f59e0b; }
        .tm-signout {
          font-family: var(--font-geist-mono, monospace);
          font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
          padding: .375rem .875rem;
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
          border-radius: 6px; color: #4a5f7a; cursor: pointer;
          transition: border-color .15s, color .15s, background .15s;
        }
        .tm-signout:hover { border-color: rgba(239,68,68,.3); color: #fca5a5; background: rgba(239,68,68,.06); }
      `}</style>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 2rem",
          height: "56px",
          borderBottom: "1px solid rgba(255,255,255,.06)",
          background: "rgba(8,12,20,.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          gap: ".25rem",
        }}
      >
        <span
          style={{
            fontFamily: mono,
            fontSize: ".875rem",
            fontWeight: 800,
            letterSpacing: "-.01em",
            color: "#e2e8f0",
            flexShrink: 0,
            marginRight: "1.75rem",
          }}
        >
          LAST <span style={{ color: "#f59e0b" }}>MILE</span> TMS
        </span>
        <div style={{ display: "flex", gap: ".25rem", flex: 1 }}>
          {navItems.map((item) => {
            if (item.children) {
              const isDropdownOpen = openDropdown === item.label;
              const parentActive = isAnyChildActive(item);
              return (
                <div
                  key={item.label}
                  style={{ position: "relative" }}
                  onMouseEnter={() => handleMouseEnter(item.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <a
                    className={`tm-nav-link${parentActive ? " tm-active" : ""}`}
                    href={item.children[0].href}
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenDropdown(
                        isDropdownOpen ? null : item.label,
                      );
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {item.label}{" "}
                    <span style={{ fontSize: "8px", verticalAlign: "middle" }}>
                      &#9662;
                    </span>
                  </a>
                  {isDropdownOpen && (
                    <div className="tm-dropdown">
                      {item.children.map((child) => (
                        <a
                          key={child.label}
                          href={child.href}
                          className={
                            isActiveHref(child.href) ? "tm-active" : ""
                          }
                          onClick={() => setOpenDropdown(null)}
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const isActive =
              item.href && item.href !== "#" && isActiveHref(item.href);
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
        {/* User + sign out */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexShrink: 0,
          }}
        >
          {session?.user?.email && (
            <span
              style={{
                fontFamily: mono,
                fontSize: "10px",
                color: "#3d4f6b",
                letterSpacing: ".08em",
                maxWidth: "200px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session.user.email}
            </span>
          )}
          <button
            type="button"
            className="tm-signout"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </button>
        </div>
      </nav>
    </>
  );
}
