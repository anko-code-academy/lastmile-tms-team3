"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TmNavbar from "@/components/TmNavbar";
import { createDriverAction } from "@/lib/actions/drivers";
import { getDepotsAction } from "@/lib/actions/depots";
import type { DepotOption } from "@/lib/actions/depots";
import type { CreateDriverInput } from "@/lib/types/driver";

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

const inputStyle: React.CSSProperties = {
  background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text,
  borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem",
  width: "100%", outline: "none", fontFamily: S.mono, boxSizing: "border-box",
};

function TmLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".4rem" }}>
      {children}
    </label>
  );
}

export default function NewDriverPage() {
  const router = useRouter();
  const [depots, setDepots] = useState<DepotOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    licenseNumber: "", licenseExpiryDate: "", photoUrl: "", depotId: "",
  });

  useEffect(() => {
    getDepotsAction().then((d) => {
      setDepots(d);
      if (d[0]) setForm((f) => ({ ...f, depotId: d[0].id }));
    });
  }, []);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const input: CreateDriverInput = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      email: form.email,
      licenseNumber: form.licenseNumber,
      licenseExpiryDate: form.licenseExpiryDate,
      photoUrl: form.photoUrl || undefined,
      depotId: form.depotId || undefined,
    };
    const result = await createDriverAction(input);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
    } else if (result?.driverId) {
      router.push(`/admin/drivers/${result.driverId}`);
    }
  }

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .tm-select { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .5rem .75rem; font-size: .875rem; width: 100%; outline: none; font-family: var(--font-geist-mono,monospace); }
        .tm-select:focus { border-color: rgba(245,158,11,.45); }
        .tm-select option { background: #0f1929; color: #e2e8f0; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
        .tm-btn-secondary:hover { border-color: rgba(255,255,255,.2) !important; color: #e2e8f0 !important; }
      `}</style>
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />
          <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>

            {/* Back */}
            <Link href="/admin/drivers" style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", color: S.muted, textDecoration: "none", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: ".4rem", marginBottom: "1.5rem" }}>
              ← All Drivers
            </Link>

            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
              <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>Driver Management</p>
              <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>Add Driver</h1>
            </div>

            {/* Form */}
            <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.75rem" }}>
              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <TmLabel htmlFor="firstName">First Name *</TmLabel>
                    <input id="firstName" className="tm-input" required value={form.firstName} onChange={set("firstName")} style={inputStyle} />
                  </div>
                  <div>
                    <TmLabel htmlFor="lastName">Last Name *</TmLabel>
                    <input id="lastName" className="tm-input" required value={form.lastName} onChange={set("lastName")} style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="email">Email *</TmLabel>
                  <input id="email" type="email" className="tm-input" required value={form.email} onChange={set("email")} style={inputStyle} />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="phone">Phone *</TmLabel>
                  <input id="phone" className="tm-input" required value={form.phone} onChange={set("phone")} placeholder="+1 555 000 0000" style={inputStyle} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <TmLabel htmlFor="licenseNumber">License Number *</TmLabel>
                    <input id="licenseNumber" className="tm-input" required value={form.licenseNumber} onChange={set("licenseNumber")} placeholder="DL123456" style={inputStyle} />
                  </div>
                  <div>
                    <TmLabel htmlFor="licenseExpiryDate">License Expiry *</TmLabel>
                    <input id="licenseExpiryDate" type="date" className="tm-input" required value={form.licenseExpiryDate} onChange={set("licenseExpiryDate")} style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="depotId">Depot</TmLabel>
                  <select id="depotId" className="tm-select" value={form.depotId} onChange={set("depotId")}>
                    <option value="">No depot</option>
                    {depots.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <TmLabel htmlFor="photoUrl">Photo URL</TmLabel>
                  <input id="photoUrl" className="tm-input" value={form.photoUrl} onChange={set("photoUrl")} placeholder="https://example.com/photo.jpg" style={inputStyle} />
                </div>

                {error && (
                  <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.red, marginBottom: "1rem" }}>{error}</p>
                )}

                <div style={{ display: "flex", gap: ".75rem", paddingTop: ".5rem", borderTop: `1px solid ${S.border}` }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="tm-btn-primary"
                    style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? .5 : 1, background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent }}
                  >
                    {submitting ? "Creating..." : "Create Driver"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="tm-btn-secondary"
                    style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: "pointer", background: "rgba(255,255,255,.04)", border: `1px solid ${S.inputBorder}`, color: S.muted }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
