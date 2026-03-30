"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import TmNavbar from "@/components/TmNavbar";
import {
  getDriverAction,
  updateDriverAction,
  updateDriverAvailabilityAction,
  updateDriverStatusAction,
} from "@/lib/actions/drivers";
import { getDepotsAction } from "@/lib/actions/depots";
import type { DepotOption } from "@/lib/actions/depots";
import type {
  Driver,
  DriverAvailability,
  DriverDayOffInputItem,
  DriverScheduleInputItem,
  UpdateDriverInput,
} from "@/lib/types/driver";

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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

type ScheduleFormRow = { enabled: boolean; startTime: string; endTime: string };

function buildScheduleForm(availability: DriverAvailability): Record<string, ScheduleFormRow> {
  const base = Object.fromEntries(DAYS.map((d) => [d, { enabled: false, startTime: "08:00", endTime: "17:00" }]));
  for (const s of availability.schedule) {
    base[s.dayOfWeek] = {
      enabled: true,
      startTime: s.startTime ? s.startTime.slice(0, 5) : "08:00",
      endTime: s.endTime ? s.endTime.slice(0, 5) : "17:00",
    };
  }
  return base;
}

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

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [depots, setDepots] = useState<DepotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    licenseNumber: "", licenseExpiryDate: "", photoUrl: "", depotId: "",
  });

  const [avail, setAvail] = useState<DriverAvailability>({ schedule: [], daysOff: [] });
  const [availEditing, setAvailEditing] = useState(false);
  const [availSaving, setAvailSaving] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<Record<string, ScheduleFormRow>>(() =>
    Object.fromEntries(DAYS.map((d) => [d, { enabled: false, startTime: "08:00", endTime: "17:00" }]))
  );
  const [daysOffForm, setDaysOffForm] = useState<DriverDayOffInputItem[]>([]);

  useEffect(() => {
    Promise.all([getDriverAction(id), getDepotsAction()]).then(([d, deps]) => {
      if (!d) { router.replace("/admin/drivers"); return; }
      setDriver(d);
      setDepots(deps);
      setForm({
        firstName: d.firstName, lastName: d.lastName,
        phone: d.phone, email: d.email,
        licenseNumber: d.licenseNumber,
        licenseExpiryDate: d.licenseExpiryDate.slice(0, 10),
        photoUrl: d.photoUrl ?? "", depotId: d.depotId ?? "",
      });
      setAvail(d.availability);
      setScheduleForm(buildScheduleForm(d.availability));
      setDaysOffForm(d.availability.daysOff.map((x) => ({ date: x.date, isPaid: x.isPaid, reason: x.reason ?? "" })));
    }).finally(() => setLoading(false));
  }, [id, router]);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleCancelAvail() {
    if (driver) {
      setScheduleForm(buildScheduleForm(driver.availability));
      setDaysOffForm(driver.availability.daysOff.map((x) => ({ date: x.date, isPaid: x.isPaid, reason: x.reason ?? "" })));
    }
    setAvailEditing(false);
    setAvailError(null);
  }

  async function handleSaveAvail() {
    if (!driver) return;
    setAvailSaving(true);
    setAvailError(null);

    const schedule: DriverScheduleInputItem[] = DAYS
      .filter((d) => scheduleForm[d].enabled)
      .map((d) => ({
        dayOfWeek: d,
        startTime: scheduleForm[d].startTime || undefined,
        endTime: scheduleForm[d].endTime || undefined,
      }));

    const daysOff: DriverDayOffInputItem[] = daysOffForm
      .filter((d) => d.date)
      .map((d) => ({ date: d.date, isPaid: d.isPaid, reason: d.reason || undefined }));

    const result = await updateDriverAvailabilityAction({ id: driver.id, schedule, daysOff });
    setAvailSaving(false);
    if (result.error) {
      setAvailError(result.error);
    } else if (result.availability) {
      setAvail(result.availability);
      setDriver((d) => d ? { ...d, availability: result.availability! } : d);
      setAvailEditing(false);
    }
  }

  function handleCancelEdit() {
    if (!driver) return;
    setForm({
      firstName: driver.firstName, lastName: driver.lastName,
      phone: driver.phone, email: driver.email,
      licenseNumber: driver.licenseNumber,
      licenseExpiryDate: driver.licenseExpiryDate.slice(0, 10),
      photoUrl: driver.photoUrl ?? "", depotId: driver.depotId ?? "",
    });
    setEditing(false);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!driver) return;
    setSaving(true);
    setError(null);
    const input: UpdateDriverInput = {
      id: driver.id,
      firstName: form.firstName, lastName: form.lastName,
      phone: form.phone, email: form.email,
      licenseNumber: form.licenseNumber,
      licenseExpiryDate: form.licenseExpiryDate,
      photoUrl: form.photoUrl || undefined,
      depotId: form.depotId || undefined,
    };
    const result = await updateDriverAction(input);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setDriver((d) => d ? { ...d, ...form, depotId: form.depotId || undefined, photoUrl: form.photoUrl || undefined } : d);
      setEditing(false);
    }
  }

  async function handleToggleStatus(newStatus: boolean) {
    if (!driver) return;
    setStatusLoading(true);
    const result = await updateDriverStatusAction({ id: driver.id, isActive: newStatus });
    setStatusLoading(false);
    if (!result.error) setDriver((d) => d ? { ...d, isActive: newStatus } : d);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg }}>
        <TmNavbar />
        <p style={{ padding: "2rem", fontFamily: S.mono, fontSize: ".875rem", color: S.muted }}>Loading...</p>
      </div>
    );
  }

  if (!driver) return null;

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
            <Link href="/admin/drivers" style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", color: S.muted, textDecoration: "none", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: ".4rem", marginBottom: "1.5rem" }}>
              ← All Drivers
            </Link>

            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
              <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>Driver Management</p>
              <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>{driver.fullName}</h1>
                <span style={{ fontFamily: S.mono, fontSize: "9px", letterSpacing: ".12em", padding: ".2rem .5rem", borderRadius: 4, border: `1px solid ${driver.isActive ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`, color: driver.isActive ? S.green : S.red, textTransform: "uppercase" }}>
                  {driver.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.muted, marginTop: ".375rem" }}>
                {driver.licenseNumber} · {driver.depotName ?? "No depot assigned"}
              </p>
            </div>

            {/* Status toggle */}
            <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.25rem 1.5rem", marginBottom: "1rem" }}>
              <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase", marginBottom: ".875rem" }}>Status</p>
              <div style={{ display: "flex", gap: ".5rem" }}>
                {[{ label: "Active", value: true }, { label: "Inactive", value: false }].map(({ label, value }) => (
                  <button
                    key={label}
                    disabled={driver.isActive === value || statusLoading}
                    onClick={() => handleToggleStatus(value)}
                    style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".4rem .9rem", borderRadius: 6, cursor: (driver.isActive === value || statusLoading) ? "default" : "pointer", opacity: statusLoading ? .5 : 1, border: `1px solid ${driver.isActive === value ? (value ? "rgba(34,197,94,.4)" : "rgba(239,68,68,.4)") : S.border}`, background: driver.isActive === value ? (value ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.08)") : "transparent", color: driver.isActive === value ? (value ? S.green : S.red) : S.muted }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Details form */}
            <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase" }}>Driver Details</p>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <TmLabel htmlFor="firstName">First Name</TmLabel>
                    <input id="firstName" className={editing ? "tm-input" : undefined} disabled={!editing} value={form.firstName} onChange={set("firstName")} style={inputStyle(!editing)} />
                  </div>
                  <div>
                    <TmLabel htmlFor="lastName">Last Name</TmLabel>
                    <input id="lastName" className={editing ? "tm-input" : undefined} disabled={!editing} value={form.lastName} onChange={set("lastName")} style={inputStyle(!editing)} />
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="email">Email</TmLabel>
                  <input id="email" type="email" className={editing ? "tm-input" : undefined} disabled={!editing} value={form.email} onChange={set("email")} style={inputStyle(!editing)} />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="phone">Phone</TmLabel>
                  <input id="phone" className={editing ? "tm-input" : undefined} disabled={!editing} value={form.phone} onChange={set("phone")} style={inputStyle(!editing)} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <TmLabel htmlFor="licenseNumber">License Number</TmLabel>
                    <input id="licenseNumber" className={editing ? "tm-input" : undefined} disabled={!editing} value={form.licenseNumber} onChange={set("licenseNumber")} style={inputStyle(!editing)} />
                  </div>
                  <div>
                    <TmLabel htmlFor="licenseExpiryDate">License Expiry</TmLabel>
                    <input id="licenseExpiryDate" type="date" className={editing ? "tm-input" : undefined} disabled={!editing} value={form.licenseExpiryDate} onChange={set("licenseExpiryDate")} style={inputStyle(!editing)} />
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="depotId">Depot</TmLabel>
                  <select id="depotId" className="tm-select" disabled={!editing} value={form.depotId} onChange={set("depotId")}>
                    <option value="">No depot</option>
                    {depots.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: editing ? "1.5rem" : 0 }}>
                  <TmLabel htmlFor="photoUrl">Photo URL</TmLabel>
                  <input id="photoUrl" className={editing ? "tm-input" : undefined} disabled={!editing} value={form.photoUrl} onChange={set("photoUrl")} style={inputStyle(!editing)} />
                </div>

                {error && (
                  <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.red, marginBottom: "1rem" }}>{error}</p>
                )}

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
            {/* Availability Calendar */}
            <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.75rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase" }}>Availability Calendar</p>
                {!availEditing && (
                  <button
                    onClick={() => setAvailEditing(true)}
                    className="tm-btn-secondary"
                    style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".35rem .75rem", borderRadius: 5, cursor: "pointer", background: "rgba(255,255,255,.04)", border: `1px solid ${S.inputBorder}`, color: S.muted }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Weekly schedule */}
              <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".6rem" }}>Weekly Schedule</p>
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", marginBottom: "1.5rem" }}>
                {DAYS.map((day) => {
                  const row = scheduleForm[day];
                  const liveRow = avail.schedule.find((s) => s.dayOfWeek === day);
                  return (
                    <div key={day} style={{ display: "grid", gridTemplateColumns: "130px 1fr", alignItems: "center", gap: ".75rem" }}>
                      {availEditing ? (
                        <>
                          <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontFamily: S.mono, fontSize: ".8rem", color: row.enabled ? S.text : S.dim, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              onChange={(e) => setScheduleForm((f) => ({ ...f, [day]: { ...f[day], enabled: e.target.checked } }))}
                              style={{ accentColor: S.accent }}
                            />
                            {day}
                          </label>
                          {row.enabled ? (
                            <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                              <input
                                type="time"
                                value={row.startTime}
                                onChange={(e) => setScheduleForm((f) => ({ ...f, [day]: { ...f[day], startTime: e.target.value } }))}
                                className="tm-input"
                                style={{ ...inputStyle(false), width: "120px" }}
                              />
                              <span style={{ fontFamily: S.mono, fontSize: ".75rem", color: S.dim }}>–</span>
                              <input
                                type="time"
                                value={row.endTime}
                                onChange={(e) => setScheduleForm((f) => ({ ...f, [day]: { ...f[day], endTime: e.target.value } }))}
                                className="tm-input"
                                style={{ ...inputStyle(false), width: "120px" }}
                              />
                            </div>
                          ) : (
                            <span style={{ fontFamily: S.mono, fontSize: ".75rem", color: S.dim }}>Off</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span style={{ fontFamily: S.mono, fontSize: ".8rem", color: liveRow ? S.text : S.dim }}>{day}</span>
                          <span style={{ fontFamily: S.mono, fontSize: ".8rem", color: liveRow ? S.muted : S.dim }}>
                            {liveRow ? `${liveRow.startTime?.slice(0, 5) ?? "—"} – ${liveRow.endTime?.slice(0, 5) ?? "—"}` : "Off"}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Days off */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".6rem" }}>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase" }}>Days Off</p>
                {availEditing && (
                  <button
                    type="button"
                    onClick={() => setDaysOffForm((f) => [...f, { date: "", isPaid: true, reason: "" }])}
                    style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".08em", textTransform: "uppercase", padding: ".25rem .6rem", borderRadius: 4, cursor: "pointer", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", color: S.accent }}
                  >
                    + Add
                  </button>
                )}
              </div>

              {availEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", marginBottom: "1.25rem" }}>
                  {daysOffForm.length === 0 && (
                    <span style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>No days off scheduled.</span>
                  )}
                  {daysOffForm.map((d, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "150px 90px 1fr 32px", gap: ".5rem", alignItems: "center" }}>
                      <input
                        type="date"
                        value={d.date}
                        onChange={(e) => setDaysOffForm((f) => f.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}
                        className="tm-input"
                        style={inputStyle(false)}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: ".35rem", fontFamily: S.mono, fontSize: ".75rem", color: S.muted, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={d.isPaid}
                          onChange={(e) => setDaysOffForm((f) => f.map((x, j) => j === i ? { ...x, isPaid: e.target.checked } : x))}
                          style={{ accentColor: S.accent }}
                        />
                        Paid
                      </label>
                      <input
                        type="text"
                        placeholder="Reason (optional)"
                        value={d.reason ?? ""}
                        onChange={(e) => setDaysOffForm((f) => f.map((x, j) => j === i ? { ...x, reason: e.target.value } : x))}
                        className="tm-input"
                        style={inputStyle(false)}
                      />
                      <button
                        type="button"
                        onClick={() => setDaysOffForm((f) => f.filter((_, j) => j !== i))}
                        style={{ fontFamily: S.mono, fontSize: "12px", color: S.red, background: "transparent", border: "none", cursor: "pointer", padding: ".2rem" }}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".35rem", marginBottom: availEditing ? "1.25rem" : 0 }}>
                  {avail.daysOff.length === 0 ? (
                    <span style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>No days off scheduled.</span>
                  ) : avail.daysOff.map((d, i) => (
                    <div key={i} style={{ display: "flex", gap: "1rem", fontFamily: S.mono, fontSize: ".8rem" }}>
                      <span style={{ color: S.text }}>{d.date}</span>
                      <span style={{ color: d.isPaid ? S.green : S.muted }}>{d.isPaid ? "Paid" : "Unpaid"}</span>
                      {d.reason && <span style={{ color: S.dim }}>{d.reason}</span>}
                    </div>
                  ))}
                </div>
              )}

              {availError && (
                <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.red, marginBottom: "1rem" }}>{availError}</p>
              )}

              {availEditing && (
                <div style={{ display: "flex", gap: ".75rem", paddingTop: "1.25rem", borderTop: `1px solid ${S.border}` }}>
                  <button
                    type="button"
                    disabled={availSaving}
                    onClick={handleSaveAvail}
                    className="tm-btn-primary"
                    style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: availSaving ? "not-allowed" : "pointer", opacity: availSaving ? .5 : 1, background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent }}
                  >
                    {availSaving ? "Saving..." : "Save Schedule"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAvail}
                    className="tm-btn-secondary"
                    style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: "pointer", background: "rgba(255,255,255,.04)", border: `1px solid ${S.inputBorder}`, color: S.muted }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
