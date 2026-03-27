"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import TmNavbar from "@/components/TmNavbar";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole =
  | "ADMIN"
  | "OPERATIONS_MANAGER"
  | "DISPATCHER"
  | "WAREHOUSE_OPERATOR"
  | "DRIVER";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

// ─── Role metadata ────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Admin",
  OPERATIONS_MANAGER: "Ops Manager",
  DISPATCHER: "Dispatcher",
  WAREHOUSE_OPERATOR: "Warehouse",
  DRIVER: "Driver",
};

const ROLE_COLOR: Record<UserRole, string> = {
  ADMIN: "#f59e0b",
  OPERATIONS_MANAGER: "#3b82f6",
  DISPATCHER: "#a855f7",
  WAREHOUSE_OPERATOR: "#22c55e",
  DRIVER: "#f97316",
};

const ROLE_BG: Record<UserRole, string> = {
  ADMIN: "rgba(245,158,11,.12)",
  OPERATIONS_MANAGER: "rgba(59,130,246,.12)",
  DISPATCHER: "rgba(168,85,247,.12)",
  WAREHOUSE_OPERATOR: "rgba(34,197,94,.12)",
  DRIVER: "rgba(249,115,22,.12)",
};

const ALL_ROLES: UserRole[] = [
  "ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "WAREHOUSE_OPERATOR",
  "DRIVER",
];

// ─── GraphQL helper ───────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function gqlFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string
): Promise<T> {
  const res = await fetch(`${API_BASE}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) {
    const err = json.errors[0];
    const msg =
      err.extensions?.message ??
      err.extensions?.details ??
      err.message ??
      "GraphQL error";
    throw new Error(msg);
  }
  return json.data as T;
}

// ─── Validation schema ────────────────────────────────────────────────────────

const createSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  role: z.enum([
    "ADMIN",
    "OPERATIONS_MANAGER",
    "DISPATCHER",
    "WAREHOUSE_OPERATOR",
    "DRIVER",
  ] as const),
  initialPassword: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a digit")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
  assignedDepotId: z
    .string()
    .uuid("Must be a valid UUID")
    .optional()
    .or(z.literal("")),
});

type CreateFormValues = z.infer<typeof createSchema>;

// ─── GraphQL documents ────────────────────────────────────────────────────────

const GET_USERS = `
  query GetUsers($search: String, $role: UserRole) {
    users(search: $search, role: $role) {
      id firstName lastName email phone role isActive createdAt
    }
  }
`;

const CREATE_USER = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input)
  }
`;

const DEACTIVATE_USER = `
  mutation DeactivateUser($id: UUID!) {
    deactivateUser(id: $id)
  }
`;

const SEND_RESET = `
  mutation SendPasswordReset($id: UUID!) {
    sendPasswordReset(id: $id)
  }
`;


// ─── Component ────────────────────────────────────────────────────────────────

export default function UsersClient() {
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? "";
  const qc = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);

  // Debounce search input → query param
  useEffect(() => {
    const t = setTimeout(
      () => setSearch(searchInput.trim() || undefined),
      350
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Queries ──
  const {
    data: users = [],
    isLoading,
    isError,
    error,
  } = useQuery<User[]>({
    queryKey: ["users", search, roleFilter],
    queryFn: async () => {
      const data = await gqlFetch<{ users: User[] }>(
        GET_USERS,
        { search: search ?? null, role: roleFilter || null },
        token
      );
      return data.users;
    },
    retry: false,
    enabled: !!token,
  });

  // ── Mutations ──
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "DRIVER",
      initialPassword: "",
      assignedDepotId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateFormValues) => {
      await gqlFetch(
        CREATE_USER,
        {
          input: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone || null,
            role: input.role,
            assignedZoneId: null,
            assignedDepotId: input.assignedDepotId || null,
            initialPassword: input.initialPassword,
          },
        },
        token
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
      setModalOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await gqlFetch(DEACTIVATE_USER, { id }, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated");
      setConfirmDeactivate(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: async (id: string) => {
      await gqlFetch(SEND_RESET, { id }, token);
    },
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (e) => toast.error(e.message),
  });

  // ── Derived stats ──
  const total = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = total - activeCount;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#080c14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-geist-mono, monospace)",
            color: "#3d4f6b",
            fontSize: "12px",
            letterSpacing: ".2em",
          }}
        >
          LOADING…
        </span>
      </div>
    );
  }

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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
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

        .signout-btn {
          font-family: var(--font-geist-mono, monospace);
          font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
          padding: .375rem .875rem;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 6px; color: #4a5f7a; cursor: pointer;
          transition: border-color .15s, color .15s, background .15s;
        }
        .signout-btn:hover {
          border-color: rgba(239,68,68,.3);
          color: #fca5a5; background: rgba(239,68,68,.06);
        }

        .panel {
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 10px; overflow: hidden;
        }
        .panel-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,.06);
          display: flex; align-items: center; justify-content: space-between;
        }

        .stat-card {
          flex: 1; min-width: 0;
          padding: 1.25rem 1.5rem;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 10px;
          transition: border-color .2s, box-shadow .2s;
        }
        .stat-card:hover {
          border-color: rgba(245,158,11,.2);
          box-shadow: 0 0 18px rgba(245,158,11,.06);
        }

        .user-row {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) 120px 90px 110px 160px;
          gap: 1rem; align-items: center;
          padding: .875rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,.04);
          transition: background .15s;
        }
        .user-row:last-child { border-bottom: none; }
        .user-row:hover { background: rgba(255,255,255,.02); }

        .col-header {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) 120px 90px 110px 160px;
          gap: 1rem;
          padding: .5rem 1.25rem .625rem;
          border-bottom: 1px solid rgba(255,255,255,.04);
        }

        .search-field {
          padding: .625rem 1rem .625rem 2.5rem;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px; color: #e2e8f0;
          font-size: .875rem; font-family: var(--font-geist-sans, system-ui);
          transition: border-color .2s; outline: none; width: 100%;
        }
        .search-field::placeholder { color: #3d4f6b; }
        .search-field:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245,158,11,.08);
        }

        .role-select {
          padding: .625rem 1rem;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px; color: #e2e8f0;
          font-size: .8rem; font-family: var(--font-geist-mono, monospace);
          transition: border-color .2s; outline: none; cursor: pointer;
          letter-spacing: .06em;
        }
        .role-select:focus { border-color: #f59e0b; }
        .role-select option { background: #0f1623; color: #e2e8f0; }

        .new-btn {
          padding: .625rem 1.25rem;
          background: #f59e0b; color: #0b0f1a;
          border: none; border-radius: 8px; cursor: pointer;
          font-weight: 700; font-size: .8rem; letter-spacing: .1em;
          font-family: var(--font-geist-mono, monospace); text-transform: uppercase;
          display: flex; align-items: center; gap: .5rem;
          transition: background .15s, transform .1s; flex-shrink: 0;
        }
        .new-btn:hover { background: #fbbf24; transform: translateY(-1px); }
        .new-btn:active { transform: translateY(0); }

        .action-btn {
          padding: .3rem .65rem;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 5px; background: transparent; color: #4a5f7a;
          font-size: .7rem; font-family: var(--font-geist-mono, monospace);
          letter-spacing: .08em; cursor: pointer; white-space: nowrap;
          text-transform: uppercase;
          transition: border-color .15s, color .15s, background .15s;
        }
        .action-btn:hover {
          border-color: rgba(245,158,11,.3);
          color: #f59e0b; background: rgba(245,158,11,.05);
        }
        .action-btn.danger:hover {
          border-color: rgba(239,68,68,.3);
          color: #fca5a5; background: rgba(239,68,68,.06);
        }
        .action-btn:disabled { opacity: .35; cursor: not-allowed; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,.78);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: fadeUp .2s ease both;
        }
        .modal-card {
          background: #0d1424;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 14px; padding: 2rem;
          width: 100%; max-width: 520px;
          max-height: 90vh; overflow-y: auto;
        }

        .form-field {
          width: 100%; padding: .65rem 1rem;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px; color: #e2e8f0;
          font-size: .875rem; font-family: var(--font-geist-sans, system-ui);
          transition: border-color .2s; outline: none; box-sizing: border-box;
        }
        .form-field::placeholder { color: #3d4f6b; }
        .form-field:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245,158,11,.08);
        }
        .form-field[aria-invalid="true"] { border-color: rgba(239,68,68,.5); }

        .form-label {
          font-family: var(--font-geist-mono, monospace);
          font-size: 10px; letter-spacing: .15em;
          color: #4a5f7a; text-transform: uppercase;
          display: block; margin-bottom: .375rem;
        }
        .form-error {
          font-family: var(--font-geist-mono, monospace);
          font-size: 11px; color: #ef4444; margin-top: .25rem;
        }

        .submit-btn {
          width: 100%; padding: .875rem;
          background: #f59e0b; color: #0b0f1a;
          border: none; border-radius: 8px; cursor: pointer;
          font-weight: 700; font-size: .875rem; letter-spacing: .08em;
          font-family: var(--font-geist-mono, monospace);
          display: flex; align-items: center; justify-content: center; gap: .5rem;
          transition: background .15s;
        }
        .submit-btn:hover:not(:disabled) { background: #fbbf24; }
        .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

        .cancel-btn {
          width: 100%; padding: .875rem;
          background: transparent; color: #4a5f7a;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px; cursor: pointer;
          font-size: .875rem; letter-spacing: .08em;
          font-family: var(--font-geist-mono, monospace);
          transition: border-color .15s, color .15s;
        }
        .cancel-btn:hover { border-color: rgba(255,255,255,.15); color: #94a3b8; }
      `}</style>

      <div className="scanline" />

      <div
        style={{
          minHeight: "100vh",
          background: "#080c14",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            backgroundImage:
              "linear-gradient(rgba(30,42,66,.45) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(30,42,66,.45) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />

          {/* ── Page body ── */}
          <div
            style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}
          >
            {/* Header */}
            <div className="fu-1" style={{ marginBottom: "2rem" }}>
              <p
                style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: "10px",
                  letterSpacing: ".2em",
                  color: "#f59e0b",
                  textTransform: "uppercase",
                  marginBottom: ".375rem",
                }}
              >
                Administration
              </p>
              <h1
                style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#e2e8f0",
                  letterSpacing: "-.02em",
                  lineHeight: 1,
                }}
              >
                User Management
              </h1>
            </div>

            {/* Stats row */}
            <div
              className="fu-2"
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
              }}
            >
              {[
                { label: "Total Users", value: total, color: "#f59e0b" },
                { label: "Active", value: activeCount, color: "#22c55e" },
                { label: "Inactive", value: inactiveCount, color: "#ef4444" },
                { label: "Admins", value: adminCount, color: "#f59e0b" },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <p
                    style={{
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: "9px",
                      letterSpacing: ".2em",
                      color: "#3d4f6b",
                      textTransform: "uppercase",
                      marginBottom: ".625rem",
                    }}
                  >
                    {s.label}
                  </p>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: isLoading ? "#1e2d42" : s.color,
                      letterSpacing: "-.04em",
                    }}
                  >
                    {isLoading ? "—" : s.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div
              className="fu-3"
              style={{
                display: "flex",
                gap: ".75rem",
                alignItems: "center",
                marginBottom: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  minWidth: "220px",
                  maxWidth: "400px",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  style={{
                    position: "absolute",
                    left: ".875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#3d4f6b",
                    pointerEvents: "none",
                  }}
                >
                  <circle
                    cx="6"
                    cy="6"
                    r="4.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M9.5 9.5L12 12"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  className="search-field"
                  placeholder="Search by name or email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              <select
                className="role-select"
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as UserRole | "")
                }
              >
                <option value="">All Roles</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>

              <div style={{ flex: 1 }} />

              <button className="new-btn" onClick={() => setModalOpen(true)}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M6 1v10M1 6h10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                New User
              </button>
            </div>

            {/* Users panel */}
            <div className="fu-4 panel">
              <div className="panel-header">
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "10px",
                    letterSpacing: ".18em",
                    color: "#4a5f7a",
                    textTransform: "uppercase",
                  }}
                >
                  Users
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "9px",
                    color: "#1e2d42",
                    letterSpacing: ".1em",
                  }}
                >
                  {isLoading
                    ? "LOADING…"
                    : `${users.length} RECORD${users.length !== 1 ? "S" : ""}`}
                </span>
              </div>

              {/* Column headers */}
              <div className="col-header">
                {["User", "Email", "Role", "Status", "Created", "Actions"].map(
                  (h) => (
                    <span
                      key={h}
                      style={{
                        fontFamily: "var(--font-geist-mono, monospace)",
                        fontSize: "9px",
                        letterSpacing: ".18em",
                        color: "#1e2d42",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </span>
                  )
                )}
              </div>

              {/* Loading */}
              {isLoading && (
                <div
                  style={{
                    padding: "3.5rem",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    style={{
                      animation: "spin .8s linear infinite",
                      color: "#f59e0b",
                    }}
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="36"
                      strokeDashoffset="12"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}

              {/* Error */}
              {isError && (
                <div
                  style={{
                    padding: "2rem 1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: ".625rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: "11px",
                      color: "#ef4444",
                      letterSpacing: ".08em",
                    }}
                  >
                    FAILED TO LOAD USERS
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: "10px",
                      color: "#7f1d1d",
                      letterSpacing: ".04em",
                      maxWidth: "600px",
                      textAlign: "center",
                      wordBreak: "break-all",
                    }}
                  >
                    {error instanceof Error ? error.message : String(error)}
                  </span>
                </div>
              )}

              {/* Empty */}
              {!isLoading && !isError && users.length === 0 && (
                <div
                  style={{
                    padding: "3.5rem 1.25rem",
                    textAlign: "center",
                    color: "#3d4f6b",
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "12px",
                    letterSpacing: ".14em",
                  }}
                >
                  NO USERS FOUND
                </div>
              )}

              {/* Rows */}
              {!isLoading &&
                users.map((user) => {
                  const initials =
                    `${user.firstName[0] ?? "?"}${user.lastName[0] ?? "?"}`.toUpperCase();
                  const rc = ROLE_COLOR[user.role];
                  const rb = ROLE_BG[user.role];
                  const created = new Date(user.createdAt).toLocaleDateString(
                    "en-GB",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }
                  );

                  return (
                    <div key={user.id} className="user-row">
                      {/* Name + avatar */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: ".75rem",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${rc}22, ${rc}44)`,
                            border: `1px solid ${rc}33`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily:
                                "var(--font-geist-mono, monospace)",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: rc,
                            }}
                          >
                            {initials}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: ".875rem",
                            color: "#e2e8f0",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {user.firstName} {user.lastName}
                        </span>
                      </div>

                      {/* Email */}
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono, monospace)",
                          fontSize: ".72rem",
                          color: "#4a5f7a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.email}
                      </span>

                      {/* Role badge */}
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono, monospace)",
                          fontSize: "9px",
                          letterSpacing: ".1em",
                          color: rc,
                          background: rb,
                          border: `1px solid ${rc}33`,
                          padding: ".25rem .6rem",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          display: "inline-block",
                          justifySelf: "start",
                        }}
                      >
                        {ROLE_LABEL[user.role]}
                      </span>

                      {/* Status badge */}
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono, monospace)",
                          fontSize: "9px",
                          letterSpacing: ".1em",
                          color: user.isActive ? "#22c55e" : "#ef4444",
                          background: user.isActive
                            ? "rgba(34,197,94,.1)"
                            : "rgba(239,68,68,.1)",
                          border: `1px solid ${user.isActive ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}`,
                          padding: ".25rem .6rem",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                          display: "inline-block",
                          justifySelf: "start",
                        }}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>

                      {/* Created */}
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono, monospace)",
                          fontSize: ".7rem",
                          color: "#1e2d42",
                          whiteSpace: "nowrap",
                          justifySelf: "start",
                        }}
                      >
                        {created}
                      </span>

                      {/* Actions */}
                      <div
                        style={{
                          display: "flex",
                          gap: ".4rem",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          className="action-btn"
                          disabled={resetMutation.isPending}
                          onClick={() => resetMutation.mutate(user.id)}
                          title="Send password reset email"
                        >
                          Reset
                        </button>
                        {user.isActive &&
                          user.email !== session?.user?.email && (
                          <button
                            className="action-btn danger"
                            disabled={deactivateMutation.isPending}
                            onClick={() => setConfirmDeactivate(user)}
                            title="Deactivate user"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "1.5rem 2rem",
              borderTop: "1px solid rgba(255,255,255,.04)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "9px",
                color: "#1a2535",
                letterSpacing: ".15em",
              }}
            >
              LAST MILE TMS · ANKO SOFTWARE · 2026
            </span>
          </div>
        </div>
      </div>

      {/* ── Create User Modal ── */}
      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false);
              form.reset();
            }
          }}
        >
          <div className="modal-card">
            <div style={{ marginBottom: "1.75rem" }}>
              <p
                style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: "10px",
                  letterSpacing: ".2em",
                  color: "#f59e0b",
                  textTransform: "uppercase",
                  marginBottom: ".375rem",
                }}
              >
                Administration
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#e2e8f0",
                  letterSpacing: "-.02em",
                }}
              >
                New User
              </h2>
            </div>

            <form
              onSubmit={form.handleSubmit((data) =>
                createMutation.mutate(data)
              )}
              noValidate
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* First + Last Name */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label className="form-label">First Name</label>
                  <input
                    className="form-field"
                    placeholder="John"
                    aria-invalid={!!form.formState.errors.firstName}
                    {...form.register("firstName")}
                  />
                  {form.formState.errors.firstName && (
                    <p className="form-error">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="form-label">Last Name</label>
                  <input
                    className="form-field"
                    placeholder="Smith"
                    aria-invalid={!!form.formState.errors.lastName}
                    {...form.register("lastName")}
                  />
                  {form.formState.errors.lastName && (
                    <p className="form-error">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="form-label">Email Address</label>
                <input
                  className="form-field"
                  type="email"
                  placeholder="user@depot.local"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="form-error">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Phone + Role */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label className="form-label">Phone (optional)</label>
                  <input
                    className="form-field"
                    placeholder="+1 555 000 0000"
                    {...form.register("phone")}
                  />
                </div>
                <div>
                  <label className="form-label">Role</label>
                  <select
                    className="form-field role-select"
                    style={{ cursor: "pointer" }}
                    aria-invalid={!!form.formState.errors.role}
                    {...form.register("role")}
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="form-label">Initial Password</label>
                <input
                  className="form-field"
                  type="password"
                  placeholder="Min 8 chars, A-Z, 0-9, symbol"
                  aria-invalid={!!form.formState.errors.initialPassword}
                  {...form.register("initialPassword")}
                />
                {form.formState.errors.initialPassword && (
                  <p className="form-error">
                    {form.formState.errors.initialPassword.message}
                  </p>
                )}
              </div>

              {/* Depot ID */}
              <div>
                <label className="form-label">Depot ID (optional)</label>
                <input
                  className="form-field"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  {...form.register("assignedDepotId")}
                />
                {form.formState.errors.assignedDepotId && (
                  <p className="form-error">
                    {form.formState.errors.assignedDepotId.message}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: ".75rem",
                  marginTop: ".5rem",
                }}
              >
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="submit-btn"
                >
                  {createMutation.isPending ? (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: "spin .8s linear infinite" }}
                      >
                        <circle
                          cx="7"
                          cy="7"
                          r="5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray="22"
                          strokeDashoffset="8"
                          strokeLinecap="round"
                        />
                      </svg>
                      CREATING…
                    </>
                  ) : (
                    "CREATE USER"
                  )}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setModalOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Deactivate Modal ── */}
      {confirmDeactivate && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDeactivate(null);
          }}
        >
          <div className="modal-card" style={{ maxWidth: "400px" }}>
            <div
              style={{
                textAlign: "center",
                marginBottom: "1.75rem",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(239,68,68,.1)",
                  border: "1px solid rgba(239,68,68,.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path
                    d="M11 7v6M11 15v.5"
                    stroke="#ef4444"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="11"
                    cy="11"
                    r="9.5"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#e2e8f0",
                  marginBottom: ".625rem",
                }}
              >
                Deactivate User?
              </h2>
              <p
                style={{
                  color: "#4a5f7a",
                  fontSize: ".875rem",
                  lineHeight: 1.65,
                }}
              >
                <strong style={{ color: "#e2e8f0" }}>
                  {confirmDeactivate.firstName} {confirmDeactivate.lastName}
                </strong>{" "}
                will lose access immediately. Their data is preserved.
              </p>
            </div>

            <div style={{ display: "flex", gap: ".75rem" }}>
              <button
                className="cancel-btn"
                style={{ flex: 1 }}
                onClick={() => setConfirmDeactivate(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  flex: 1,
                  padding: ".875rem",
                  background: "rgba(239,68,68,.12)",
                  color: "#fca5a5",
                  border: "1px solid rgba(239,68,68,.3)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: ".8rem",
                  letterSpacing: ".1em",
                  transition: "background .15s",
                }}
                disabled={deactivateMutation.isPending}
                onClick={() =>
                  deactivateMutation.mutate(confirmDeactivate.id)
                }
              >
                {deactivateMutation.isPending
                  ? "DEACTIVATING…"
                  : "DEACTIVATE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
