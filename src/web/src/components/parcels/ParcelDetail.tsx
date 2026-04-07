"use client";

import type { Parcel } from "@/lib/types/parcel";
import { ParcelStatusBadge } from "@/components/parcels/ParcelStatusBadge";

const S = {
  panel:  "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)"  as const,
  text:   "#e2e8f0"                as const,
  muted:  "#4a5f7a"                as const,
  dim:    "#3a526e"                as const,
  accent: "#f59e0b"                as const,
  mono:   "var(--font-geist-mono, monospace)" as const,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.25rem 1.5rem" }}>
      <p style={{ fontFamily: S.mono, fontSize: "9px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase", marginBottom: "1rem" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid rgba(255,255,255,.04)`, padding: ".5rem 0" }}>
      <span style={{ fontFamily: S.mono, fontSize: "10px", color: S.muted, letterSpacing: ".08em" }}>{label}</span>
      <span style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.text, fontWeight: 600 }}>{value ?? "—"}</span>
    </div>
  );
}

function AddressBlock({ title, address }: { title: string; address: Parcel["recipientAddress"] }) {
  return (
    <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.25rem 1.5rem" }}>
      <p style={{ fontFamily: S.mono, fontSize: "9px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase", marginBottom: ".75rem" }}>
        {title}
      </p>
      <p style={{ fontFamily: S.mono, fontSize: ".875rem", fontWeight: 700, color: S.text, marginBottom: ".25rem" }}>
        {address.contactName ?? address.companyName ?? "—"}
      </p>
      {address.companyName && address.contactName && (
        <p style={{ fontSize: ".8rem", color: S.muted, marginBottom: ".25rem" }}>{address.companyName}</p>
      )}
      <p style={{ fontSize: ".875rem", color: S.muted }}>{address.street1}</p>
      {address.street2 && <p style={{ fontSize: ".875rem", color: S.muted }}>{address.street2}</p>}
      <p style={{ fontSize: ".875rem", color: S.muted }}>
        {address.city}, {address.state} {address.postalCode}
      </p>
      <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>{address.countryCode}</p>
      {address.phone && <p style={{ fontSize: ".8rem", color: S.dim, marginTop: ".25rem" }}>{address.phone}</p>}
      {address.email && <p style={{ fontSize: ".8rem", color: S.dim }}>{address.email}</p>}
    </div>
  );
}

export function ParcelDetail({ parcel }: { parcel: Parcel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>
            Parcel
          </p>
          <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>
            {parcel.trackingNumber}
          </h1>
          {parcel.description && (
            <p style={{ fontSize: ".875rem", color: S.muted, marginTop: ".375rem" }}>{parcel.description}</p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <ParcelStatusBadge status={parcel.status} />
          <span style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>
            {parcel.serviceType.charAt(0) + parcel.serviceType.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      {/* Addresses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <AddressBlock title="Recipient" address={parcel.recipientAddress} />
        <AddressBlock title="Shipper"   address={parcel.shipperAddress}   />
      </div>

      {/* Physical details */}
      <Section title="Physical Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "2rem" }}>
          <InfoRow label="Weight"           value={`${parcel.weight} ${parcel.weightUnit.toLowerCase()}`} />
          <InfoRow label="Dimensions"       value={`${parcel.length}×${parcel.width}×${parcel.height} ${parcel.dimensionUnit.toLowerCase()}`} />
          <InfoRow label="Declared Value"   value={`${parcel.currency} ${parcel.declaredValue}`} />
          <InfoRow label="Parcel Type"      value={parcel.parcelType} />
          <InfoRow label="Est. Delivery"    value={parcel.estimatedDeliveryDate ? new Date(parcel.estimatedDeliveryDate).toLocaleDateString() : null} />
          <InfoRow label="Actual Delivery"  value={parcel.actualDeliveryDate    ? new Date(parcel.actualDeliveryDate).toLocaleDateString()    : null} />
          <InfoRow label="Delivery Attempts" value={parcel.deliveryAttempts} />
          <InfoRow label="Zone"             value={parcel.zone?.name} />
        </div>
      </Section>

      {/* Tracking timeline */}
      {parcel.trackingEvents.length > 0 && (
        <Section title="Tracking History">
          <div>
            {parcel.trackingEvents.map((event, i) => (
              <div key={event.id} style={{ display: "flex", gap: "1rem", paddingBottom: i < parcel.trackingEvents.length - 1 ? "1rem" : 0 }}>
                {/* Dot + line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ marginTop: 4, width: 8, height: 8, borderRadius: "50%", background: S.accent, flexShrink: 0 }} />
                  {i < parcel.trackingEvents.length - 1 && (
                    <div style={{ flex: 1, width: 1, background: `rgba(255,255,255,.08)`, marginTop: 4 }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: ".5rem" }}>
                    <p style={{ fontFamily: S.mono, fontSize: ".8rem", fontWeight: 700, color: S.text }}>
                      {event.eventType.replace(/_/g, " ").charAt(0).toUpperCase() +
                        event.eventType.replace(/_/g, " ").slice(1).toLowerCase()}
                    </p>
                    <span style={{ fontFamily: S.mono, fontSize: "9px", color: S.dim, flexShrink: 0 }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {event.description && (
                    <p style={{ fontSize: ".8rem", color: S.muted, marginTop: 2 }}>{event.description}</p>
                  )}
                  <p style={{ fontFamily: S.mono, fontSize: "9px", color: S.dim, marginTop: 2 }}>
                    {[event.locationCity, event.locationState, event.locationCountryCode].filter(Boolean).join(", ")}
                    {event.operator ? ` · ${event.operator}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Content items */}
      {parcel.contentItems.length > 0 && (
        <Section title={`Contents (${parcel.contentItems.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  {["HS Code", "Description", "Qty", "Unit Value", "Weight"].map((h) => (
                    <th key={h} style={{ padding: ".5rem 1rem .5rem 0", fontFamily: S.mono, fontSize: "9px", letterSpacing: ".12em", color: S.muted, textTransform: "uppercase", textAlign: h === "Qty" || h === "Unit Value" || h === "Weight" ? "right" : "left", fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parcel.contentItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: `1px solid rgba(255,255,255,.04)` }}>
                    <td style={{ padding: ".5rem 1rem .5rem 0", fontFamily: S.mono, fontSize: ".8rem", color: S.dim }}>{item.hsCode}</td>
                    <td style={{ padding: ".5rem 1rem .5rem 0", fontSize: ".875rem", color: S.muted }}>{item.description}</td>
                    <td style={{ padding: ".5rem 0", fontFamily: S.mono, fontSize: ".8rem", color: S.text, textAlign: "right" }}>{item.quantity}</td>
                    <td style={{ padding: ".5rem 1rem", fontFamily: S.mono, fontSize: ".8rem", color: S.text, textAlign: "right" }}>{item.currency} {item.unitValue}</td>
                    <td style={{ padding: ".5rem 0", fontFamily: S.mono, fontSize: ".8rem", color: S.text, textAlign: "right" }}>{item.weight} {item.weightUnit.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Proof of Delivery */}
      {parcel.deliveryConfirmation && (
        <Section title="Proof of Delivery">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "2rem" }}>
            <InfoRow label="Received By"  value={parcel.deliveryConfirmation.receivedBy} />
            <InfoRow label="Delivered At" value={new Date(parcel.deliveryConfirmation.deliveredAt).toLocaleString()} />
            <InfoRow label="Location"     value={parcel.deliveryConfirmation.location} />
            {parcel.deliveryConfirmation.latitude && parcel.deliveryConfirmation.longitude && (
              <InfoRow label="Coordinates" value={`${parcel.deliveryConfirmation.latitude}, ${parcel.deliveryConfirmation.longitude}`} />
            )}
          </div>
          {parcel.deliveryConfirmation.signatureImage && (
            <div style={{ marginTop: "1rem" }}>
              <p style={{ fontFamily: S.mono, fontSize: "9px", color: S.dim, marginBottom: ".5rem" }}>Signature</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/png;base64,${parcel.deliveryConfirmation.signatureImage}`} alt="Signature" style={{ height: 64, background: "#fff", borderRadius: 4, border: `1px solid ${S.border}` }} />
            </div>
          )}
          {parcel.deliveryConfirmation.photo && (
            <div style={{ marginTop: "1rem" }}>
              <p style={{ fontFamily: S.mono, fontSize: "9px", color: S.dim, marginBottom: ".5rem" }}>Photo</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${parcel.deliveryConfirmation.photo}`} alt="Delivery photo" style={{ height: 128, borderRadius: 4, border: `1px solid ${S.border}`, objectFit: "cover" }} />
            </div>
          )}
        </Section>
      )}

      {/* Watchers */}
      {parcel.watchers.length > 0 && (
        <Section title="Tracking Watchers">
          {parcel.watchers.map((w) => (
            <p key={w.id} style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.muted, marginBottom: ".25rem" }}>
              {w.name ?? w.email}{w.name && <span style={{ color: S.dim }}> ({w.email})</span>}
            </p>
          ))}
        </Section>
      )}

      {/* Meta */}
      <p style={{ fontFamily: S.mono, fontSize: "9px", color: S.dim, letterSpacing: ".06em" }}>
        Created {new Date(parcel.createdAt).toLocaleString()}
        {parcel.lastModifiedAt && <> · Modified {new Date(parcel.lastModifiedAt).toLocaleString()}</>}
      </p>
    </div>
  );
}
