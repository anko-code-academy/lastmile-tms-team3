"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TmNavbar from "@/components/TmNavbar";
import { createVehicleAction } from "@/lib/actions/vehicles";
import { getDepotsAction } from "@/lib/actions/depots";
import type { DepotOption } from "@/lib/actions/depots";
import { VehicleType, WeightUnit } from "@/lib/types/vehicle";
import type { CreateVehicleInput } from "@/lib/types/vehicle";

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

export default function NewVehiclePage() {
  const router = useRouter();
  const [depots, setDepots] = useState<DepotOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    registrationPlate: "",
    type: VehicleType.Van,
    depotId: "",
    parcelCapacity: "1",
    weightCapacity: "1",
    weightUnit: WeightUnit.Kg,
  });

  useEffect(() => {
    getDepotsAction().then((d) => {
      setDepots(d);
      if (d[0]) setForm((f) => ({ ...f, depotId: d[0].id }));
    });
  }, []);

  function setStr(key: "registrationPlate" | "depotId") {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const input: CreateVehicleInput = {
      registrationPlate: form.registrationPlate,
      type: form.type,
      depotId: form.depotId,
      parcelCapacity: parseInt(form.parcelCapacity, 10),
      weightCapacity: parseFloat(form.weightCapacity),
      weightUnit: form.weightUnit,
    };
    const result = await createVehicleAction(input);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
    } else if (result?.vehicleId) {
      router.push(`/admin/vehicles/${result.vehicleId}`);
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
            <Link href="/admin/vehicles" style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", color: S.muted, textDecoration: "none", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: ".4rem", marginBottom: "1.5rem" }}>
              ← All Vehicles
            </Link>

            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
              <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>Fleet Management</p>
              <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>Add Vehicle</h1>
            </div>

            {/* Form */}
            <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.75rem" }}>
              <form onSubmit={handleSubmit}>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="registrationPlate">Registration Plate *</TmLabel>
                  <input id="registrationPlate" className="tm-input" required value={form.registrationPlate} onChange={setStr("registrationPlate")} placeholder="ABC-1234" style={inputStyle} />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="depotId">Depot *</TmLabel>
                  <select id="depotId" className="tm-select" required value={form.depotId} onChange={setStr("depotId")}>
                    <option value="">Select depot...</option>
                    {depots.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <TmLabel htmlFor="type">Vehicle Type *</TmLabel>
                  <select id="type" className="tm-select" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as VehicleType }))}>
                    <option value={VehicleType.Van}>Van</option>
                    <option value={VehicleType.Car}>Car</option>
                    <option value={VehicleType.Bike}>Bike</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <TmLabel htmlFor="parcelCapacity">Parcel Capacity *</TmLabel>
                    <input id="parcelCapacity" type="number" min={1} className="tm-input" required value={form.parcelCapacity} onChange={(e) => setForm((f) => ({ ...f, parcelCapacity: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <TmLabel>Weight Capacity *</TmLabel>
                    <div style={{ display: "flex", gap: ".5rem" }}>
                      <input type="number" min={1} step="0.1" className="tm-input" required value={form.weightCapacity} onChange={(e) => setForm((f) => ({ ...f, weightCapacity: e.target.value }))} style={{ ...inputStyle, flex: 1, width: "auto" }} />
                      <select className="tm-select" value={form.weightUnit} onChange={(e) => setForm((f) => ({ ...f, weightUnit: e.target.value as WeightUnit }))} style={{ width: "70px" }}>
                        <option value={WeightUnit.Kg}>kg</option>
                        <option value={WeightUnit.Lb}>lb</option>
                      </select>
                    </div>
                  </div>
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
                    {submitting ? "Creating..." : "Create Vehicle"}
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
