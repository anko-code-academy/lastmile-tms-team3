"use client";

import { useState, useEffect, useRef } from "react";
import { Printer, ChevronLeft, Edit2, XCircle } from "lucide-react";
import Link from "next/link";
import type { Parcel, ChangeHistoryEntry } from "@/lib/types/parcel";
import { ParcelStatus } from "@/lib/types/parcel";
import { ParcelStatusBadge } from "@/components/parcels/ParcelStatusBadge";
import { downloadParcelLabelPdf, downloadParcelLabelZpl } from "@/lib/actions/labels";
import { EditParcelDialog } from "@/components/parcels/EditParcelDialog";
import { CancelParcelDialog } from "@/components/parcels/CancelParcelDialog";

const S = {
  panel:  "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)"  as const,
  text:   "#e2e8f0"                as const,
  muted:  "#647a96"                as const,
  dim:    "#4e6480"                as const,
  accent: "#f59e0b"                as const,
  mono:   "var(--font-geist-mono, monospace)" as const,
};

/** Statuses where Edit / Cancel are allowed */
const EDITABLE_STATUSES: ParcelStatus[] = [
  ParcelStatus.Registered,
  ParcelStatus.ReceivedAtDepot,
  ParcelStatus.Sorted,
  ParcelStatus.Staged,
];

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

function ChangeHistorySection({ entries }: { entries: ChangeHistoryEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <Section title={`Change History (${entries.length})`}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${S.border}` }}>
              {["Date", "Operator", "Action", "Summary"].map(h => (
                <th key={h} style={{ padding: ".5rem 1rem .5rem 0", fontFamily: S.mono, fontSize: "9px", letterSpacing: ".12em", color: S.muted, textTransform: "uppercase", textAlign: "left", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} style={{ borderBottom: `1px solid rgba(255,255,255,.04)` }}>
                <td style={{ padding: ".5rem 1rem .5rem 0", fontFamily: S.mono, fontSize: ".75rem", color: S.dim, whiteSpace: "nowrap" }}>
                  {new Date(entry.occurredAt).toLocaleString()}
                </td>
                <td style={{ padding: ".5rem 1rem .5rem 0", fontSize: ".8rem", color: S.muted }}>
                  {entry.actorUserName ?? "—"}
                </td>
                <td style={{ padding: ".5rem 1rem .5rem 0", fontFamily: S.mono, fontSize: ".75rem", color: S.accent }}>
                  {entry.actionType}
                </td>
                <td style={{ padding: ".5rem 0", fontSize: ".8rem", color: S.text }}>
                  {entry.summary ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function ParcelDetail({ parcel: initialParcel }: { parcel: Parcel }) {
  const [parcel, setParcel] = useState(initialParcel);
  const [showEdit, setShowEdit] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const canEdit = EDITABLE_STATUSES.includes(parcel.status as ParcelStatus);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Breadcrumb */}
      <div>
        <Link
          href="/parcels"
          style={{ display: "inline-flex", alignItems: "center", gap: ".25rem", fontFamily: S.mono, fontSize: ".8rem", color: S.muted, textDecoration: "none" }}
        >
          <ChevronLeft size={14} />
          Parcels
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>
            Parcel · {parcel.parcelType ?? parcel.serviceType.charAt(0) + parcel.serviceType.slice(1).toLowerCase()}
          </p>
          <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>
            {parcel.trackingNumber}
          </h1>
          <BarcodeSVG trackingNumber={parcel.trackingNumber} />
          {parcel.description && (
            <p style={{ fontSize: ".875rem", color: S.muted, marginTop: ".375rem" }}>{parcel.description}</p>
          )}
          <p style={{ fontFamily: S.mono, fontSize: "9px", color: S.dim, marginTop: ".5rem" }}>
            Created {new Date(parcel.createdAt).toLocaleString()}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <ParcelStatusBadge status={parcel.status} size="md" />
          {canEdit && (
            <>
              <button
                onClick={() => setShowEdit(true)}
                style={{ display: "flex", alignItems: "center", gap: ".375rem", padding: ".4rem .875rem", background: "rgba(37,99,235,.15)", border: "1px solid rgba(37,99,235,.4)", borderRadius: 6, color: "#93c5fd", fontSize: ".8rem", cursor: "pointer" }}
              >
                <Edit2 size={13} />
                Edit
              </button>
              <button
                onClick={() => setShowCancel(true)}
                style={{ display: "flex", alignItems: "center", gap: ".375rem", padding: ".4rem .875rem", background: "rgba(220,38,38,.1)", border: "1px solid rgba(220,38,38,.3)", borderRadius: 6, color: "#fca5a5", fontSize: ".8rem", cursor: "pointer" }}
              >
                <XCircle size={13} />
                Cancel
              </button>
            </>
          )}
          <PrintLabelMenu parcelId={parcel.id} trackingNumber={parcel.trackingNumber} />
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
          <InfoRow label="Notes"            value={parcel.notes} />
          <InfoRow label="Est. Delivery"    value={parcel.estimatedDeliveryDate ? new Date(parcel.estimatedDeliveryDate).toLocaleDateString() : null} />
          <InfoRow label="Actual Delivery"  value={parcel.actualDeliveryDate    ? new Date(parcel.actualDeliveryDate).toLocaleDateString()    : null} />
          <InfoRow label="Delivery Attempts" value={parcel.deliveryAttempts} />
          <InfoRow label="Zone"             value={parcel.zone?.name} />
        </div>
      </Section>

      {/* Route info */}
      {parcel.route && (
        <Section title="Assigned Route">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "2rem" }}>
            <InfoRow label="Route" value={parcel.route.name} />
            <InfoRow label="Route ID" value={parcel.routeId} />
          </div>
        </Section>
      )}

      {/* Tracking timeline */}
      {parcel.trackingEvents.length > 0 && (
        <Section title="Tracking History">
          <div>
            {parcel.trackingEvents.map((event, i) => (
              <div key={event.id} style={{ display: "flex", gap: "1rem", paddingBottom: i < parcel.trackingEvents.length - 1 ? "1rem" : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ marginTop: 4, width: 8, height: 8, borderRadius: "50%", background: S.accent, flexShrink: 0 }} />
                  {i < parcel.trackingEvents.length - 1 && (
                    <div style={{ flex: 1, width: 1, background: `rgba(255,255,255,.08)`, marginTop: 4 }} />
                  )}
                </div>
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

      {/* Change history */}
      <ChangeHistorySection entries={parcel.changeHistory} />

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

      {/* Dialogs */}
      {showEdit && (
        <EditParcelDialog
          parcel={parcel}
          onClose={() => setShowEdit(false)}
          onSaved={updated => {
            setParcel(p => ({ ...p, ...updated }));
            setShowEdit(false);
          }}
        />
      )}
      {showCancel && (
        <CancelParcelDialog
          parcel={parcel}
          onClose={() => setShowCancel(false)}
          onCancelled={updated => {
            setParcel(p => ({ ...p, ...updated }));
            setShowCancel(false);
          }}
        />
      )}
    </div>
  );
}

function BarcodeSVG({ trackingNumber }: { trackingNumber: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    import("jsbarcode").then(({ default: JsBarcode }) => {
      JsBarcode(canvasRef.current!, trackingNumber, {
        format: "CODE128",
        displayValue: false,
        height: 50,
        width: 2,
        margin: 0,
      });
    }).catch(() => {});
  }, [trackingNumber]);

  return (
    <canvas ref={canvasRef} className="mt-2 max-w-sm" />
  );
}

function PrintLabelMenu({ parcelId, trackingNumber }: { parcelId: string; trackingNumber: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePrint(format: "pdf" | "zpl") {
    setLoading(format);
    setOpen(false);
    try {
      if (format === "pdf") {
        const blob = await downloadParcelLabelPdf(parcelId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `label-${trackingNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const text = await downloadParcelLabelZpl(parcelId);
        const blob = new Blob([text], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `label-${trackingNumber}.zpl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to download label:", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading !== null}
        style={{
          display: "flex", alignItems: "center", gap: ".375rem",
          padding: ".4rem .875rem",
          background: "rgba(255,255,255,.06)",
          border: "1px solid rgba(255,255,255,.15)",
          borderRadius: 6,
          color: S.text,
          fontSize: ".8rem",
          fontFamily: S.mono,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? .6 : 1,
          transition: "background .15s",
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.1)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.06)"; }}
      >
        {loading ? (
          <span>Downloading...</span>
        ) : (
          <>
            <Printer size={13} />
            Print Label
          </>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20,
            width: 160, borderRadius: 8,
            border: "1px solid rgba(255,255,255,.12)",
            background: "#0d1627",
            boxShadow: "0 8px 24px rgba(0,0,0,.5)",
            padding: "4px 0",
          }}>
            {(["pdf", "zpl"] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => handlePrint(fmt)}
                style={{
                  display: "block", width: "100%", padding: ".5rem .875rem",
                  textAlign: "left", background: "none", border: "none",
                  color: S.text, fontSize: ".8rem", fontFamily: S.mono, cursor: "pointer",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                {fmt === "pdf" ? "A4 PDF" : "4×6 Thermal (ZPL)"}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
