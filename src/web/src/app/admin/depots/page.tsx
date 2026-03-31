"use client";

import { useState } from "react";
import TmNavbar from "@/components/TmNavbar";
import { useDepots, useCreateDepot, useUpdateDepot, useDeleteDepot } from "@/lib/hooks/useDepots";
import { DepotDto, CreateDepotDto, DayOffDto } from "@/lib/types/depot";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Convert "HH:mm" → "HH:mm:ss" for HotChocolate LocalTime scalar
function toTimeOnly(time: string): string {
  if (!time) return "";
  return `${time}:00`;
}

// Convert "HH:mm:ss" → "HH:mm" for <input type="time">
function fromTimeOnly(time: string): string {
  if (!time) return "";
  return time.substring(0, 5);
}

const defaultSchedule = DAYS_OF_WEEK.map((day) => ({
  dayOfWeek: day,
  startTime: "09:00",
  endTime: "17:00",
}));

const emptyOperatingHours = { schedule: defaultSchedule, daysOff: [] as DayOffDto[] };

const emptyAddress = {
  street1: "", street2: "", city: "", state: "",
  postalCode: "", countryCode: "US", isResidential: false,
};

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
  green: "#22c55e" as const,
  red: "#ef4444" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

function TmLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{
      display: "block", fontFamily: S.mono, fontSize: "10px",
      letterSpacing: ".14em", color: S.muted, textTransform: "uppercase",
      marginBottom: ".4rem",
    }}>
      {children}
    </label>
  );
}

function TmBtn({
  children, onClick, type = "button", disabled, variant = "primary", style,
}: {
  children: React.ReactNode; onClick?: () => void; type?: "button" | "submit" | "reset";
  disabled?: boolean; variant?: "primary" | "secondary" | "danger" | "ghost";
  style?: React.CSSProperties;
}) {
  const variants = {
    primary: { background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent },
    secondary: { background: "rgba(255,255,255,.04)", border: `1px solid ${S.inputBorder}`, color: S.muted },
    danger: { background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171" },
    ghost: { background: "transparent", border: "none", color: S.muted },
  };
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={`tm-btn-${variant}`}
      style={{
        fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em",
        textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1,
        ...variants[variant], ...style,
      }}
    >
      {children}
    </button>
  );
}

export default function DepotsPage() {
  const { data: depots, isLoading, error } = useDepots(true);
  const createMutation = useCreateDepot();
  const updateMutation = useUpdateDepot();
  const deleteMutation = useDeleteDepot();

  const [showForm, setShowForm] = useState(false);
  const [editingDepot, setEditingDepot] = useState<DepotDto | null>(null);
  const [formData, setFormData] = useState<CreateDepotDto>({
    name: "", address: { ...emptyAddress }, isActive: true,
    operatingHours: emptyOperatingHours,
  });
  const [newDayOff, setNewDayOff] = useState({ date: "", reason: "", isPaid: false });

  const handleScheduleChange = (day: string, field: "startTime" | "endTime", value: string) => {
    setFormData({ ...formData, operatingHours: { ...formData.operatingHours!, schedule: formData.operatingHours!.schedule.map((d) => d.dayOfWeek === day ? { ...d, [field]: value } : d) } });
  };

  const handleToggleDay = (day: string, isOpen: boolean) => {
    setFormData({ ...formData, operatingHours: { ...formData.operatingHours!, schedule: formData.operatingHours!.schedule.map((d) => d.dayOfWeek === day ? { ...d, startTime: isOpen ? "09:00" : undefined, endTime: isOpen ? "17:00" : undefined } : d) } });
  };

  const handleAddDayOff = () => {
    if (!newDayOff.date) return;
    const dayOff: DayOffDto = { date: newDayOff.date, reason: newDayOff.reason || undefined, isPaid: newDayOff.isPaid };
    setFormData({ ...formData, operatingHours: { ...formData.operatingHours!, daysOff: [...formData.operatingHours!.daysOff, dayOff] } });
    setNewDayOff({ date: "", reason: "", isPaid: false });
  };

  const handleRemoveDayOff = (date: string) => {
    setFormData({ ...formData, operatingHours: { ...formData.operatingHours!, daysOff: formData.operatingHours!.daysOff.filter((d) => d.date !== date) } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schedule = formData.operatingHours?.schedule.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime ? toTimeOnly(d.startTime) : undefined,
      endTime: d.endTime ? toTimeOnly(d.endTime) : undefined,
    }));
    const payload = { ...formData, operatingHours: schedule?.some((d) => d.startTime) ? { schedule, daysOff: formData.operatingHours?.daysOff || [] } : undefined };
    try {
      if (editingDepot) {
        await updateMutation.mutateAsync({ id: editingDepot.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      handleCancel();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (depot: DepotDto) => {
    setEditingDepot(depot);
    const schedule = depot.operatingHours?.schedule.map((d) => ({ dayOfWeek: d.dayOfWeek, startTime: d.startTime ? fromTimeOnly(d.startTime) : undefined, endTime: d.endTime ? fromTimeOnly(d.endTime) : undefined })) || defaultSchedule;
    setFormData({ name: depot.name, address: { street1: depot.address.street1, street2: depot.address.street2 || "", city: depot.address.city, state: depot.address.state, postalCode: depot.address.postalCode, countryCode: depot.address.countryCode, isResidential: depot.address.isResidential }, isActive: depot.isActive, operatingHours: depot.operatingHours ? { schedule, daysOff: depot.operatingHours.daysOff } : emptyOperatingHours });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this depot?")) {
      try { await deleteMutation.mutateAsync(id); } catch (err) { console.error(err); }
    }
  };

  const handleCancel = () => {
    setShowForm(false); setEditingDepot(null);
    setFormData({ name: "", address: { ...emptyAddress }, isActive: true, operatingHours: emptyOperatingHours });
    setNewDayOff({ date: "", reason: "", isPaid: false });
  };


  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .tm-row:hover { background: rgba(255,255,255,.02); }
        .tm-card:hover { border-color: rgba(245,158,11,.18) !important; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
        .tm-btn-secondary:hover { border-color: rgba(255,255,255,.2) !important; color: #e2e8f0 !important; }
        .tm-btn-danger:hover { border-color: rgba(239,68,68,.5) !important; background: rgba(239,68,68,.14) !important; }
        .tm-nav-link { font-family: var(--font-geist-mono,monospace); font-size:11px; letter-spacing:.14em; text-decoration:none; text-transform:uppercase; padding:.375rem .5rem; border-radius:4px; color:#3d4f6b; transition:color .15s,background .15s; }
        .tm-nav-link:hover { color:#e2e8f0; background:rgba(255,255,255,.04); }
        .tm-nav-link.active { color:#f59e0b; }
        .tm-checkbox { accent-color: #f59e0b; width:14px; height:14px; cursor:pointer; }
        .tm-select { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); color:#e2e8f0; border-radius:6px; padding:.5rem .75rem; font-size:.875rem; width:100%; outline:none; font-family:var(--font-geist-mono,monospace); }
        .tm-select:focus { border-color:rgba(245,158,11,.45); }
        .tm-select option { background:#0f1929; color:#e2e8f0; }
      `}</style>

      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        {/* Grid bg */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />

          {/* Page content */}
          <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
              <div>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>Management</p>
                <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>Depots</h1>
              </div>
              {!showForm && (
                <TmBtn variant="primary" onClick={() => setShowForm(true)} style={{ lineHeight: 1 }} >
                  + Add Depot
                </TmBtn>
              )}
            </div>

            {/* Loading / error */}
            {isLoading && <p style={{ fontFamily: S.mono, fontSize: ".875rem", color: S.muted }}>Loading...</p>}
            {error && <p style={{ fontFamily: S.mono, fontSize: ".875rem", color: S.red }}>Error: {String(error)}</p>}

            {/* Form */}
            {showForm && (
              <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, marginBottom: "1.5rem", padding: "1.75rem" }}>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase", marginBottom: "1.25rem" }}>
                  {editingDepot ? "Edit Depot" : "New Depot"}
                </p>

                <form onSubmit={handleSubmit}>
                  {/* Name */}
                  <div style={{ marginBottom: "1rem" }}>
                    <TmLabel htmlFor="name">Name</TmLabel>
                    <input id="name" className="tm-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", width: "100%", outline: "none", fontFamily: S.mono, boxSizing: "border-box" }} />
                  </div>

                  {/* Address */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <TmLabel htmlFor="street1">Street</TmLabel>
                      <input id="street1" className="tm-input" value={formData.address.street1} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street1: e.target.value } })} required style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", width: "100%", outline: "none", fontFamily: S.mono, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <TmLabel htmlFor="street2">Street 2</TmLabel>
                      <input id="street2" className="tm-input" value={formData.address.street2} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street2: e.target.value } })} style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", width: "100%", outline: "none", fontFamily: S.mono, boxSizing: "border-box" }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    {[
                      { id: "city", label: "City", key: "city" as const, required: true },
                      { id: "state", label: "State", key: "state" as const, required: true },
                      { id: "postalCode", label: "Postal Code", key: "postalCode" as const, required: true },
                    ].map(({ id, label, key, required }) => (
                      <div key={id}>
                        <TmLabel htmlFor={id}>{label}</TmLabel>
                        <input id={id} className="tm-input" value={formData.address[key] as string} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, [key]: e.target.value } })} required={required} style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", width: "100%", outline: "none", fontFamily: S.mono, boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <TmLabel htmlFor="countryCode">Country Code</TmLabel>
                      <input id="countryCode" className="tm-input" maxLength={2} value={formData.address.countryCode} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, countryCode: e.target.value } })} required style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", width: "100%", outline: "none", fontFamily: S.mono, boxSizing: "border-box" }} />
                    </div>
                    <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-end", paddingBottom: ".5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer" }}>
                        <input type="checkbox" className="tm-checkbox" checked={formData.address.isResidential} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, isResidential: e.target.checked } })} />
                        <span style={{ fontFamily: S.mono, fontSize: "11px", color: S.muted, letterSpacing: ".08em" }}>Residential</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer" }}>
                        <input type="checkbox" className="tm-checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                        <span style={{ fontFamily: S.mono, fontSize: "11px", color: S.muted, letterSpacing: ".08em" }}>Active</span>
                      </label>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: "1.25rem", marginTop: "1.25rem" }}>
                    <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase", marginBottom: "1rem" }}>Operating Hours</p>

                    <div style={{ marginBottom: "1.25rem" }}>
                      {formData.operatingHours?.schedule.map((day) => (
                        <div key={day.dayOfWeek} className="tm-row" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: ".35rem 0", borderRadius: 4 }}>
                          <span style={{ fontFamily: S.mono, fontSize: "11px", color: S.muted, width: "96px", letterSpacing: ".06em" }}>{day.dayOfWeek}</span>
                          <input type="checkbox" className="tm-checkbox" checked={!!day.startTime} onChange={(e) => handleToggleDay(day.dayOfWeek, e.target.checked)} />
                          {day.startTime ? (
                            <>
                              <input type="time" className="tm-input" value={day.startTime} onChange={(e) => handleScheduleChange(day.dayOfWeek, "startTime", e.target.value)} style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".35rem .6rem", fontSize: ".8rem", width: "110px", outline: "none", fontFamily: S.mono }} />
                              <span style={{ fontFamily: S.mono, fontSize: "11px", color: S.dim }}>—</span>
                              <input type="time" className="tm-input" value={day.endTime} onChange={(e) => handleScheduleChange(day.dayOfWeek, "endTime", e.target.value)} style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".35rem .6rem", fontSize: ".8rem", width: "110px", outline: "none", fontFamily: S.mono }} />
                            </>
                          ) : (
                            <span style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, letterSpacing: ".1em" }}>CLOSED</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Days off */}
                    <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".75rem" }}>Days Off</p>
                    <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-end", marginBottom: ".75rem", flexWrap: "wrap" }}>
                      <div>
                        <TmLabel>Date</TmLabel>
                        <input type="date" className="tm-input" value={newDayOff.date} onChange={(e) => setNewDayOff({ ...newDayOff, date: e.target.value })} style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", width: "150px", outline: "none", fontFamily: S.mono }} />
                      </div>
                      <div>
                        <TmLabel>Reason</TmLabel>
                        <input className="tm-input" placeholder="Optional" value={newDayOff.reason} onChange={(e) => setNewDayOff({ ...newDayOff, reason: e.target.value })} style={{ background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text, borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", width: "180px", outline: "none", fontFamily: S.mono }} />
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".5rem", cursor: "pointer" }}>
                        <input type="checkbox" className="tm-checkbox" checked={newDayOff.isPaid} onChange={(e) => setNewDayOff({ ...newDayOff, isPaid: e.target.checked })} />
                        <span style={{ fontFamily: S.mono, fontSize: "11px", color: S.muted, letterSpacing: ".08em" }}>Paid</span>
                      </label>
                      <TmBtn variant="secondary" onClick={handleAddDayOff} style={{ marginBottom: ".5rem" }}>Add</TmBtn>
                    </div>

                    {(formData.operatingHours?.daysOff.length ?? 0) > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                        {formData.operatingHours?.daysOff.map((d) => (
                          <div key={d.date} style={{ display: "flex", alignItems: "center", gap: ".75rem", background: "rgba(255,255,255,.03)", border: `1px solid ${S.border}`, borderRadius: 6, padding: ".4rem .75rem" }}>
                            <span style={{ fontFamily: S.mono, fontSize: "11px", color: S.accent }}>{d.date}</span>
                            {d.reason && <span style={{ fontSize: ".8rem", color: S.muted }}>{d.reason}</span>}
                            {d.isPaid && <span style={{ fontFamily: S.mono, fontSize: "9px", color: S.green, letterSpacing: ".1em" }}>PAID</span>}
                            <button type="button" onClick={() => handleRemoveDayOff(d.date)} style={{ marginLeft: "auto", fontFamily: S.mono, fontSize: "9px", letterSpacing: ".1em", color: "#f87171", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase" }}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: ".75rem", marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: `1px solid ${S.border}` }}>
                    <TmBtn type="submit" variant="primary" disabled={createMutation.isPending || updateMutation.isPending} style={{ minWidth: "80px" }}>
                      {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                    </TmBtn>
                    <TmBtn variant="secondary" onClick={handleCancel}>Cancel</TmBtn>
                  </div>
                </form>
              </div>
            )}

            {/* Depot list */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {depots?.map((depot) => (
                <div key={depot.id} className="tm-card" style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", transition: "border-color .2s" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".4rem" }}>
                      <span style={{ fontFamily: S.mono, fontSize: ".95rem", fontWeight: 700, color: S.text }}>{depot.name}</span>
                      <span style={{ fontFamily: S.mono, fontSize: "9px", letterSpacing: ".12em", padding: ".2rem .5rem", borderRadius: 4, border: `1px solid ${depot.isActive ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`, color: depot.isActive ? S.green : S.red, textTransform: "uppercase" }}>
                        {depot.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.muted, marginBottom: ".25rem" }}>
                      {depot.address.street1}{depot.address.street2 ? `, ${depot.address.street2}` : ""}, {depot.address.city}, {depot.address.state} {depot.address.postalCode}
                    </p>
                    {depot.operatingHours?.schedule && (
                      <p style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, letterSpacing: ".06em" }}>
                        {depot.operatingHours.schedule.filter((d) => d.startTime).length} operating days
                        {depot.operatingHours.daysOff.length > 0 && ` · ${depot.operatingHours.daysOff.length} days off`}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", flexShrink: 0 }}>
                    <TmBtn variant="secondary" onClick={() => handleEdit(depot)}>Edit</TmBtn>
                    <TmBtn variant="danger" onClick={() => handleDelete(depot.id)} disabled={deleteMutation.isPending}>Delete</TmBtn>
                  </div>
                </div>
              ))}
              {depots?.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <p style={{ fontFamily: S.mono, fontSize: ".875rem", color: S.dim }}>No depots yet. Add one to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
