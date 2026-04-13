"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import type { Parcel, EditParcelInput } from "@/lib/types/parcel";
import { WeightUnit, DimensionUnit } from "@/lib/types/parcel";
import { editParcelAction } from "@/lib/actions/parcels";

const S = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.65)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto" as const, paddingTop: "2rem", paddingBottom: "2rem" },
  dialog: { background: "#0d1627", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "1.5rem", width: "100%", maxWidth: 640 },
  label: { fontFamily: "var(--font-geist-mono, monospace)", fontSize: "10px", letterSpacing: ".1em", color: "#647a96", textTransform: "uppercase" as const, display: "block", marginBottom: ".375rem", marginTop: ".75rem" },
  input: { width: "100%", padding: ".5rem .75rem", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, color: "#e2e8f0", fontSize: ".875rem", boxSizing: "border-box" as const },
  select: { width: "100%", padding: ".5rem .75rem", background: "#0d1627", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, color: "#e2e8f0", fontSize: ".875rem", boxSizing: "border-box" as const },
  section: { fontFamily: "var(--font-geist-mono, monospace)", fontSize: "9px", letterSpacing: ".18em", color: "#647a96", textTransform: "uppercase" as const, marginTop: "1.25rem", marginBottom: ".5rem", borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: ".375rem" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".75rem" },
  btnPrimary: { padding: ".5rem 1.25rem", background: "#2563eb", border: "none", borderRadius: 6, color: "#fff", fontSize: ".875rem", fontWeight: 600, cursor: "pointer" },
  btnGhost: { padding: ".5rem 1.25rem", background: "transparent", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, color: "#e2e8f0", fontSize: ".875rem", cursor: "pointer" },
  error: { marginTop: ".5rem", fontSize: ".8rem", color: "#ef4444" },
};

interface Props {
  parcel: Parcel;
  onClose: () => void;
  onSaved: (updated: Partial<Parcel>) => void;
}

function AddressFields({ values, onChange }: {
  values: EditParcelInput["recipientAddress"];
  onChange: (field: string, value: string | boolean) => void;
}) {
  return (
    <>
      <div>
        <label style={S.label}>Street 1</label>
        <input style={S.input} value={values.street1} onChange={e => onChange("street1", e.target.value)} required />
      </div>
      <div>
        <label style={S.label}>Street 2</label>
        <input style={S.input} value={values.street2 ?? ""} onChange={e => onChange("street2", e.target.value)} />
      </div>
      <div style={S.row3}>
        <div>
          <label style={S.label}>City</label>
          <input style={S.input} value={values.city} onChange={e => onChange("city", e.target.value)} required />
        </div>
        <div>
          <label style={S.label}>State</label>
          <input style={S.input} value={values.state} onChange={e => onChange("state", e.target.value)} required />
        </div>
        <div>
          <label style={S.label}>Postal Code</label>
          <input style={S.input} value={values.postalCode} onChange={e => onChange("postalCode", e.target.value)} required />
        </div>
      </div>
      <div style={S.row2}>
        <div>
          <label style={S.label}>Country Code</label>
          <input style={S.input} value={values.countryCode} maxLength={2} onChange={e => onChange("countryCode", e.target.value)} required />
        </div>
        <div>
          <label style={S.label}>Contact Name</label>
          <input style={S.input} value={values.contactName ?? ""} onChange={e => onChange("contactName", e.target.value)} />
        </div>
      </div>
      <div style={S.row2}>
        <div>
          <label style={S.label}>Phone</label>
          <input style={S.input} value={values.phone ?? ""} onChange={e => onChange("phone", e.target.value)} />
        </div>
        <div>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" value={values.email ?? ""} onChange={e => onChange("email", e.target.value)} />
        </div>
      </div>
    </>
  );
}

export function EditParcelDialog({ parcel, onClose, onSaved }: Props) {
  const [form, setForm] = useState<EditParcelInput>({
    parcelId: parcel.id,
    description: parcel.description ?? "",
    recipientAddress: { ...parcel.recipientAddress, street2: parcel.recipientAddress.street2 ?? "" },
    shipperAddress: { ...parcel.shipperAddress, street2: parcel.shipperAddress.street2 ?? "" },
    weight: parcel.weight,
    weightUnit: parcel.weightUnit,
    length: parcel.length,
    width: parcel.width,
    height: parcel.height,
    dimensionUnit: parcel.dimensionUnit,
    declaredValue: parcel.declaredValue,
    currency: parcel.currency,
    parcelType: parcel.parcelType ?? "",
    notes: parcel.notes ?? "",
    estimatedDeliveryDate: parcel.estimatedDeliveryDate,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRecipient(field: string, value: string | boolean) {
    setForm(f => ({ ...f, recipientAddress: { ...f.recipientAddress, [field]: value } }));
  }

  function updateShipper(field: string, value: string | boolean) {
    setForm(f => ({ ...f, shipperAddress: { ...f.shipperAddress, [field]: value } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await editParcelAction(form);
      if (result.error) {
        setError(result.error);
      } else if (result.parcel) {
        onSaved(result.parcel);
      }
    });
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.dialog} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "1rem", fontWeight: 700, color: "#e2e8f0" }}>
            Edit Parcel
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#647a96" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Parcel details */}
          <p style={S.section}>Parcel Details</p>
          <div>
            <label style={S.label}>Description</label>
            <input style={S.input} value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={S.row2}>
            <div>
              <label style={S.label}>Parcel Type</label>
              <input style={S.input} value={form.parcelType ?? ""} onChange={e => setForm(f => ({ ...f, parcelType: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Currency</label>
              <input style={S.input} value={form.currency} maxLength={3} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={S.label}>Notes</label>
            <input style={S.input} value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {/* Physical */}
          <p style={S.section}>Physical Properties</p>
          <div style={S.row2}>
            <div>
              <label style={S.label}>Weight</label>
              <input style={S.input} type="number" step="0.001" min="0" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: parseFloat(e.target.value) }))} required />
            </div>
            <div>
              <label style={S.label}>Weight Unit</label>
              <select style={S.select} value={form.weightUnit} onChange={e => setForm(f => ({ ...f, weightUnit: e.target.value as WeightUnit }))}>
                <option value={WeightUnit.Kg}>KG</option>
                <option value={WeightUnit.Lb}>LB</option>
              </select>
            </div>
          </div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>Length</label>
              <input style={S.input} type="number" step="0.01" min="0" value={form.length} onChange={e => setForm(f => ({ ...f, length: parseFloat(e.target.value) }))} required />
            </div>
            <div>
              <label style={S.label}>Width</label>
              <input style={S.input} type="number" step="0.01" min="0" value={form.width} onChange={e => setForm(f => ({ ...f, width: parseFloat(e.target.value) }))} required />
            </div>
            <div>
              <label style={S.label}>Height</label>
              <input style={S.input} type="number" step="0.01" min="0" value={form.height} onChange={e => setForm(f => ({ ...f, height: parseFloat(e.target.value) }))} required />
            </div>
          </div>
          <div style={S.row2}>
            <div>
              <label style={S.label}>Dimension Unit</label>
              <select style={S.select} value={form.dimensionUnit} onChange={e => setForm(f => ({ ...f, dimensionUnit: e.target.value as DimensionUnit }))}>
                <option value={DimensionUnit.Cm}>CM</option>
                <option value={DimensionUnit.In}>IN</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Declared Value</label>
              <input style={S.input} type="number" step="0.01" min="0" value={form.declaredValue} onChange={e => setForm(f => ({ ...f, declaredValue: parseFloat(e.target.value) }))} required />
            </div>
          </div>
          <div>
            <label style={S.label}>Estimated Delivery Date</label>
            <input style={S.input} type="date" value={form.estimatedDeliveryDate ? form.estimatedDeliveryDate.split("T")[0] : ""} onChange={e => setForm(f => ({ ...f, estimatedDeliveryDate: e.target.value ? e.target.value + "T00:00:00Z" : undefined }))} />
          </div>

          {/* Recipient */}
          <p style={S.section}>Recipient Address</p>
          <AddressFields values={form.recipientAddress} onChange={updateRecipient} />

          {/* Shipper */}
          <p style={S.section}>Shipper Address</p>
          <AddressFields values={form.shipperAddress} onChange={updateShipper} />

          {error && <p style={S.error}>{error}</p>}

          <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
            <button type="button" style={S.btnGhost} onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" style={S.btnPrimary} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
