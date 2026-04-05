"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TmNavbar from "@/components/TmNavbar";
import { createParcelAction } from "@/lib/actions/parcels";
import { createParcelSchema } from "@/lib/types/parcel";
import type { CreateParcelInput, ServiceType as ServiceTypeEnum, WeightUnit as WeightUnitEnum, DimensionUnit as DimensionUnitEnum } from "@/lib/types/parcel";
import { ServiceType, WeightUnit, DimensionUnit } from "@/lib/types/parcel";

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
  green: "#22c55e" as const,
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ marginBottom: "1.25rem", paddingBottom: ".75rem", borderBottom: `1px solid ${S.border}` }}>
      <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", margin: 0 }}>{title}</p>
    </div>
  );
}

interface AddressFormData {
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  isResidential: boolean;
  contactName: string;
  companyName: string;
  phone: string;
  email: string;
}

const emptyAddress = (): AddressFormData => ({
  street1: "", street2: "", city: "", state: "", postalCode: "",
  countryCode: "US", isResidential: false, contactName: "", companyName: "", phone: "", email: "",
});

export default function NewParcelPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [recipient, setRecipient] = useState<AddressFormData>(emptyAddress());
  const [shipper, setShipper] = useState<AddressFormData>(emptyAddress());
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnitEnum>(WeightUnit.Lb);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnitEnum>(DimensionUnit.In);
  const [declaredValue, setDeclaredValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [serviceType, setServiceType] = useState<ServiceTypeEnum>(ServiceType.Standard);
  const [parcelType, setParcelType] = useState("Standard");
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");

  function setAddr(key: keyof AddressFormData, who: "recipient" | "shipper") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
      if (who === "recipient") setRecipient(r => ({ ...r, [key]: val }));
      else setShipper(s => ({ ...s, [key]: val }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setGlobalError(null);
    setError(null);

    const input: CreateParcelInput = {
      description: description || undefined,
      serviceType,
      recipientAddress: {
        street1: recipient.street1,
        street2: recipient.street2 || undefined,
        city: recipient.city,
        state: recipient.state,
        postalCode: recipient.postalCode,
        countryCode: recipient.countryCode,
        isResidential: recipient.isResidential,
        contactName: recipient.contactName || undefined,
        companyName: recipient.companyName || undefined,
        phone: recipient.phone || undefined,
        email: recipient.email || undefined,
      },
      shipperAddress: {
        street1: shipper.street1,
        street2: shipper.street2 || undefined,
        city: shipper.city,
        state: shipper.state,
        postalCode: shipper.postalCode,
        countryCode: shipper.countryCode,
        isResidential: shipper.isResidential,
        contactName: shipper.contactName || undefined,
        companyName: shipper.companyName || undefined,
        phone: shipper.phone || undefined,
        email: shipper.email || undefined,
      },
      weight: parseFloat(weight),
      weightUnit,
      length: parseFloat(length),
      width: parseFloat(width),
      height: parseFloat(height),
      dimensionUnit,
      declaredValue: parseFloat(declaredValue) || 0,
      currency,
      parcelType: parcelType || undefined,
      notes: notes || undefined,
    };

    const parsed = createParcelSchema.safeParse(input);
    if (!parsed.success) {
      setGlobalError(parsed.error.issues[0]?.message ?? "Validation failed");
      setSubmitting(false);
      return;
    }

    const result = await createParcelAction(input);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else if (result.parcel) {
      router.push(`/parcels/${result.parcel.id}`);
    }
  }

  function copyShipperToRecipient() {
    setRecipient({ ...shipper });
  }

  const field = (key: keyof AddressFormData, label: string, placeholder: string, who: "recipient" | "shipper", type = "text") => (
    <div>
      <TmLabel htmlFor={`${who}-${key}`}>{label}</TmLabel>
      <input
        id={`${who}-${key}`}
        type={type}
        className="tm-input"
        value={who === "recipient" ? recipient[key] as string : shipper[key] as string}
        onChange={setAddr(key, who)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .tm-select { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 6px; padding: .5rem .75rem; font-size: .875rem; width: 100%; outline: none; font-family: var(--font-geist-mono,monospace); box-sizing: border-box; }
        .tm-select:focus { border-color: rgba(245,158,11,.45); }
        .tm-select option { background: #0f1929; color: #e2e8f0; }
        .tm-checkbox { accent-color: #f59e0b; width: 16px; height: 16px; cursor: pointer; }
        .tm-btn-primary:hover { border-color: rgba(245,158,11,.6) !important; background: rgba(245,158,11,.18) !important; }
        .tm-btn-secondary:hover { border-color: rgba(255,255,255,.2) !important; color: #e2e8f0 !important; }
        .tm-textarea:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-textarea::placeholder { color: #3a526e; }
      `}</style>
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />
          <div style={{ padding: "2rem", maxWidth: "760px", margin: "0 auto" }}>

            {/* Back */}
            <Link href="/parcels" style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", color: S.muted, textDecoration: "none", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: ".4rem", marginBottom: "1.5rem" }}>
              ← All Parcels
            </Link>

            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
              <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>Operations Center</p>
              <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>Register Parcel</h1>
            </div>

            {globalError && (
              <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, padding: ".75rem 1rem", marginBottom: "1.5rem" }}>
                <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.red, margin: 0 }}>{globalError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gap: "1.5rem" }}>

                {/* Service Type & Meta */}
                <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.5rem" }}>
                  <SectionHeader title="Service" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                    <div>
                      <TmLabel htmlFor="serviceType">Service Type *</TmLabel>
                      <select id="serviceType" className="tm-select" value={serviceType} onChange={e => setServiceType(e.target.value as ServiceTypeEnum)}>
                        <option value={ServiceType.Economy}>Economy</option>
                        <option value={ServiceType.Standard}>Standard</option>
                        <option value={ServiceType.Express}>Express</option>
                        <option value={ServiceType.Overnight}>Overnight</option>
                      </select>
                    </div>
                    <div>
                      <TmLabel htmlFor="parcelType">Parcel Type</TmLabel>
                      <select id="parcelType" className="tm-select" value={parcelType} onChange={e => setParcelType(e.target.value)}>
                        <option value="Standard">Standard</option>
                        <option value="Documents">Documents</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Fragile">Fragile</option>
                        <option value="Hazardous">Hazardous</option>
                        <option value="Perishable">Perishable</option>
                        <option value="Oversized">Oversized</option>
                        <option value="Live">Live</option>
                        <option value="Temperature Controlled">Temperature Controlled</option>
                      </select>
                    </div>
                    <div>
                      <TmLabel htmlFor="description">Description</TmLabel>
                      <input id="description" className="tm-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" style={inputStyle} />
                    </div>
                  </div>
                </div>

                {/* Recipient Address */}
                <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", paddingBottom: ".75rem", borderBottom: `1px solid ${S.border}` }}>
                    <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", margin: 0 }}>Recipient Address *</p>
                    <button type="button" onClick={copyShipperToRecipient} style={{ background: "none", border: "none", color: S.muted, fontFamily: S.mono, fontSize: "10px", cursor: "pointer", textTransform: "uppercase", letterSpacing: ".1em" }}>
                      Copy from Sender
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    {field("contactName", "Contact Name", "Jane Doe", "recipient")}
                    {field("companyName", "Company", "Acme Corp", "recipient")}
                    {field("phone", "Phone", "+1 555 000 0000", "recipient", "tel")}
                    {field("email", "Email", "jane@example.com", "recipient", "email")}
                    {field("street1", "Street Address *", "123 Main St", "recipient")}
                    {field("street2", "Street 2", "Apt 4B", "recipient")}
                    {field("city", "City *", "New York", "recipient")}
                    {field("state", "State *", "NY", "recipient")}
                    {field("postalCode", "Postal Code *", "10001", "recipient")}
                    <div>
                      <TmLabel htmlFor="recipient-countryCode">Country Code *</TmLabel>
                      <input id="recipient-countryCode" className="tm-input" value={recipient.countryCode} onChange={setAddr("countryCode", "recipient")} maxLength={2} placeholder="US" style={{ ...inputStyle, textTransform: "uppercase" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", paddingTop: "1.4rem" }}>
                      <input id="recipient-isResidential" type="checkbox" className="tm-checkbox" checked={recipient.isResidential} onChange={setAddr("isResidential", "recipient")} />
                      <label htmlFor="recipient-isResidential" style={{ marginLeft: ".5rem", fontFamily: S.mono, fontSize: "11px", color: S.muted, cursor: "pointer" }}>Residential address</label>
                    </div>
                  </div>
                </div>

                {/* Shipper Address */}
                <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.5rem" }}>
                  <SectionHeader title="Sender Address *" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    {field("contactName", "Contact Name", "John Doe", "shipper")}
                    {field("companyName", "Company", "Sender Corp", "shipper")}
                    {field("phone", "Phone", "+1 555 000 0000", "shipper", "tel")}
                    {field("email", "Email", "john@example.com", "shipper", "email")}
                    {field("street1", "Street Address *", "456 Warehouse Blvd", "shipper")}
                    {field("street2", "Street 2", "Suite 100", "shipper")}
                    {field("city", "City *", "Los Angeles", "shipper")}
                    {field("state", "State *", "CA", "shipper")}
                    {field("postalCode", "Postal Code *", "90001", "shipper")}
                    <div>
                      <TmLabel htmlFor="shipper-countryCode">Country Code *</TmLabel>
                      <input id="shipper-countryCode" className="tm-input" value={shipper.countryCode} onChange={setAddr("countryCode", "shipper")} maxLength={2} placeholder="US" style={{ ...inputStyle, textTransform: "uppercase" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", paddingTop: "1.4rem" }}>
                      <input id="shipper-isResidential" type="checkbox" className="tm-checkbox" checked={shipper.isResidential} onChange={setAddr("isResidential", "shipper")} />
                      <label htmlFor="shipper-isResidential" style={{ marginLeft: ".5rem", fontFamily: S.mono, fontSize: "11px", color: S.muted, cursor: "pointer" }}>Residential address</label>
                    </div>
                  </div>
                </div>

                {/* Physical Properties */}
                <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.5rem" }}>
                  <SectionHeader title="Physical Properties" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <TmLabel htmlFor="weight">Weight *</TmLabel>
                      <input id="weight" type="number" step="0.001" min="0" className="tm-input" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0.00" style={inputStyle} />
                    </div>
                    <div>
                      <TmLabel htmlFor="weightUnit">Unit</TmLabel>
                      <select id="weightUnit" className="tm-select" value={weightUnit} onChange={e => setWeightUnit(e.target.value as WeightUnitEnum)}>
                        <option value={WeightUnit.Lb}>lb</option>
                        <option value={WeightUnit.Kg}>kg</option>
                      </select>
                    </div>
                    <div>
                      <TmLabel htmlFor="declaredValue">Declared Value</TmLabel>
                      <input id="declaredValue" type="number" step="0.01" min="0" className="tm-input" value={declaredValue} onChange={e => setDeclaredValue(e.target.value)} placeholder="0.00" style={inputStyle} />
                    </div>
                    <div>
                      <TmLabel htmlFor="currency">Currency</TmLabel>
                      <input id="currency" className="tm-input" value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={3} placeholder="USD" style={{ ...inputStyle, textTransform: "uppercase" }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
                    <div>
                      <TmLabel htmlFor="length">Length *</TmLabel>
                      <input id="length" type="number" step="0.01" min="0" className="tm-input" value={length} onChange={e => setLength(e.target.value)} placeholder="0.00" style={inputStyle} />
                    </div>
                    <div>
                      <TmLabel htmlFor="width">Width *</TmLabel>
                      <input id="width" type="number" step="0.01" min="0" className="tm-input" value={width} onChange={e => setWidth(e.target.value)} placeholder="0.00" style={inputStyle} />
                    </div>
                    <div>
                      <TmLabel htmlFor="height">Height *</TmLabel>
                      <input id="height" type="number" step="0.01" min="0" className="tm-input" value={height} onChange={e => setHeight(e.target.value)} placeholder="0.00" style={inputStyle} />
                    </div>
                    <div>
                      <TmLabel htmlFor="dimensionUnit">Unit</TmLabel>
                      <select id="dimensionUnit" className="tm-select" value={dimensionUnit} onChange={e => setDimensionUnit(e.target.value as DimensionUnitEnum)}>
                        <option value={DimensionUnit.In}>in</option>
                        <option value={DimensionUnit.Cm}>cm</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.5rem" }}>
                  <SectionHeader title="Notes" />
                  <div>
                    <TmLabel htmlFor="notes">Additional Notes</TmLabel>
                    <textarea
                      id="notes"
                      className="tm-textarea"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Special handling instructions, delivery notes, etc."
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, padding: ".75rem 1rem" }}>
                    <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.red, margin: 0 }}>{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: ".75rem", paddingTop: ".5rem", borderTop: `1px solid ${S.border}` }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="tm-btn-primary"
                    style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? .5 : 1, background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent }}
                  >
                    {submitting ? "Registering..." : "Register Parcel"}
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

              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
