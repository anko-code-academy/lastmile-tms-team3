"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import TmNavbar from "@/components/TmNavbar";
import { getVehicleAction, updateVehicleAction, setVehicleStatusAction } from "@/lib/actions/vehicles";
import { getDepotsAction } from "@/lib/actions/depots";
import type { DepotOption } from "@/lib/actions/depots";
import { VehicleStatus } from "@/lib/types/vehicle";
import type { Vehicle, UpdateVehicleInput } from "@/lib/types/vehicle";

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)" as const,
  text: "#e2e8f0" as const,
  muted: "#4a5f7a" as const,
  dim: "#3a526e" as const,
  accent: "#f59e0b" as const,
  inputBg: "rgba(255,255,255,.05)" as const,
  inputBorder: "rgba(255,255,255,.1)" as const,
  red: "#ef4444" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

const STATUS_BADGE: Record<VehicleStatus, { label: string; border: string; color: string }> = {
  [VehicleStatus.Available]: { label: "Available", border: "rgba(34,197,94,.3)", color: "#22c55e" },
  [VehicleStatus.InUse]: { label: "In Use", border: "rgba(245,158,11,.3)", color: "#f59e0b" },
  [VehicleStatus.Maintenance]: { label: "Maintenance", border: "rgba(239,68,68,.3)", color: "#ef4444" },
  [VehicleStatus.Retired]: { label: "Retired", border: "rgba(74,95,122,.4)", color: "#4a5f7a" },
};

const STATUS_OPTIONS: { label: string; value: VehicleStatus }[] = [
  { label: "Available", value: VehicleStatus.Available },
  { label: "In Use", value: VehicleStatus.InUse },
  { label: "Maintenance", value: VehicleStatus.Maintenance },
  { label: "Retired", value: VehicleStatus.Retired },
];

const inputStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? "rgba(255,255,255,.02)" : S.inputBg,
  border: `1px solid ${disabled ? "rgba(255,255,255,.05)" : S.inputBorder}`,
  color: disabled ? S.muted : S.text,
  borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem",
  width: "100%", outline: "none", fontFamily: S.mono, boxSizing: "border-box",
  cursor: disabled ? "default" : "text",
});

function TmLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".4rem" }}>
      {children}
    </label>
  );
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [depots, setDepots] = useState<DepotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<VehicleStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ registrationPlate: "", depotId: "", parcelCapacity: "1", weightCapacity: "1" });

  useEffect(() => {
    Promise.all([getVehicleAction(id), getDepotsAction()]).then(([v, deps]) => {
      if (!v) { router.replace("/admin/vehicles"); return; }
      setVehicle(v);
      setDepots(deps);
      setForm({ registrationPlate: v.registrationPlate, depotId: v.depotId ?? "", parcelCapacity: String(v.parcelCapacity), weightCapacity: String(v.weightCapacity) });
    }).finally(() => setLoading(false));
  }, [id, router]);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleCancelEdit() {
    if (!vehicle) return;
    setForm({ registrationPlate: vehicle.registrationPlate, depotId: vehicle.depotId ?? "", parcelCapacity: String(vehicle.parcelCapacity), weightCapacity: String(vehicle.weightCapacity) });
    setEditing(false);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicle) return;
    setSaving(true);
    setError(null);
    const input: UpdateVehicleInput = {
      registrationPlate: form.registrationPlate,
      depotId: form.depotId,
      parcelCapacity: parseInt(form.parcelCapacity, 10),
      weightCapacity: parseFloat(form.weightCapacity),
    };
    const result = await updateVehicleAction(vehicle.id, input);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setVehicle((v) => v ? { ...v, ...input } : v);
      setEditing(false);
    }
  }

  async function handleSaveStatus() {
    if (!vehicle || !pendingStatus || pendingStatus === vehicle.status) return;
    setStatusSaving(true);
    const result = await setVehicleStatusAction(vehicle.id, pendingStatus);
    setStatusSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setVehicle((v) => v ? { ...v, status: pendingStatus } : v);
      setPendingStatus(null);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg }}>
        <TmNavbar />
        <p style={{ padding: "2rem", fontFamily: S.mono, fontSize: ".875rem", color: S.muted }}>Loading...</p>
      </div>
    );
  }

  if (!vehicle) return null;

  const currentStatus = pendingStatus ?? vehicle.status;
  const badge = STATUS_BADGE[vehicle.status];

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .tm-select { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .5rem .75rem; font-size: .875rem; width: 100%; outline: none; font-family: var(--font-geist-mono,monospace); }
        .tm-select:focus { border-color: rgba(245,158,11,.45); }
        .tm-select option { background: #0f1929; color: #e2e8f0; }
        .tm-select:disabled { background: rgba(255,255,255,.02); border-color: rgba(255,255,255,.05); color: #4a5f7a; cursor: default; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
        .tm-btn-secondary:hover { border-color: rgba(255,255,255,.2) !important; color: #e2e8f0 !important; }
      `}</style>
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />
          <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>

            {/* Back */}
            <a href="/admin/vehicles" style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", color: S.muted, textDecoration: "none", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: ".4rem", marginBottom: "1.5rem" }}>
              ← All Vehicles
            </a>

            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
              <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>Fleet Management</p>
              <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>{vehicle.registrationPlate}</h1>
                <span style={{ fontFamily: S.mono, fontSize: "9px", letterSpacing: ".12em", padding: ".2rem .5rem", borderRadius: 4, border: `1px solid ${badge.border}`, color: badge.color, textTransform: "uppercase" }}>
                  {badge.label}
                </span>
              </div>
              <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.muted, marginTop: ".375rem" }}>
                {vehicle.type} · {vehicle.depot?.name ?? "No depot assigned"}
              </p>
            </div>

            {/* Status selector */}
            <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.25rem 1.5rem", marginBottom: "1rem" }}>
              <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase", marginBottom: ".875rem" }}>Status</p>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
                {STATUS_OPTIONS.map(({ label, value }) => {
                  const b = STATUS_BADGE[value];
                  const isSelected = currentStatus === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setPendingStatus(value === vehicle.status ? null : value)}
                      style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".4rem .9rem", borderRadius: 6, cursor: "pointer", border: `1px solid ${isSelected ? b.border : S.border}`, background: isSelected ? `${b.color}18` : "transparent", color: isSelected ? b.color : S.muted, transition: "all .15s" }}
                    >
                      {label}
                    </button>
                  );
                })}
                {pendingStatus && pendingStatus !== vehicle.status && (
                  <>
                    <button
                      onClick={handleSaveStatus}
                      disabled={statusSaving}
                      className="tm-btn-primary"
                      style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".4rem .9rem", borderRadius: 6, cursor: statusSaving ? "not-allowed" : "pointer", opacity: statusSaving ? .5 : 1, background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent }}
                    >
                      {statusSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setPendingStatus(null)}
                      className="tm-btn-secondary"
                      style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".4rem .9rem", borderRadius: 6, cursor: "pointer", background: "transparent", border: `1px solid ${S.border}`, color: S.muted }}
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
              {error && <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.red, marginTop: ".75rem" }}>{error}</p>}
            </div>

            {/* Details form */}
            <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase" }}>Vehicle Details</p>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="tm-btn-secondary"
                    style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".35rem .75rem", borderRadius: 5, cursor: "pointer", background: "rgba(255,255,255,.04)", border: `1px solid ${S.inputBorder}`, color: S.muted }}
                  >
                    Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSave}>
                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="registrationPlate">Registration Plate</TmLabel>
                  <input id="registrationPlate" className={editing ? "tm-input" : undefined} disabled={!editing} value={form.registrationPlate} onChange={set("registrationPlate")} style={inputStyle(!editing)} />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="depotId">Depot</TmLabel>
                  <select id="depotId" className="tm-select" disabled={!editing} value={form.depotId} onChange={set("depotId")}>
                    <option value="">No depot</option>
                    {depots.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel>Vehicle Type</TmLabel>
                  <input disabled value={vehicle.type} style={inputStyle(true)} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: editing ? "1.5rem" : 0 }}>
                  <div>
                    <TmLabel htmlFor="parcelCapacity">Parcel Capacity</TmLabel>
                    <input id="parcelCapacity" type="number" min={1} className={editing ? "tm-input" : undefined} disabled={!editing} value={form.parcelCapacity} onChange={set("parcelCapacity")} style={inputStyle(!editing)} />
                  </div>
                  <div>
                    <TmLabel htmlFor="weightCapacity">Weight Capacity ({vehicle.weightUnit.toLowerCase()})</TmLabel>
                    <input id="weightCapacity" type="number" min={1} step="0.1" className={editing ? "tm-input" : undefined} disabled={!editing} value={form.weightCapacity} onChange={set("weightCapacity")} style={inputStyle(!editing)} />
                  </div>
                </div>

                {editing && (
                  <div style={{ display: "flex", gap: ".75rem", paddingTop: "1.25rem", borderTop: `1px solid ${S.border}` }}>
                    <button
                      type="submit"
                      disabled={saving}
                      className="tm-btn-primary"
                      style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .5 : 1, background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent }}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="tm-btn-secondary"
                      style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: "pointer", background: "rgba(255,255,255,.04)", border: `1px solid ${S.inputBorder}`, color: S.muted }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
