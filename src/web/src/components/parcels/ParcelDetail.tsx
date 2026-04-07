"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import type { Parcel } from "@/lib/types/parcel";
import { ParcelStatusBadge } from "@/components/parcels/ParcelStatusBadge";
import { downloadParcelLabelPdf, downloadParcelLabelZpl } from "@/lib/actions/labels";

function AddressBlock({ title, address }: { title: string; address: Parcel["recipientAddress"] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
        {title}
      </p>
      <div className="space-y-1 text-sm">
        <p className="font-medium">
          {address.contactName ?? address.companyName ?? "—"}
        </p>
        {address.companyName && address.contactName && (
          <p className="text-muted-foreground">{address.companyName}</p>
        )}
        <p>{address.street1}</p>
        {address.street2 && <p>{address.street2}</p>}
        <p>
          {address.city}, {address.state} {address.postalCode}
        </p>
        <p>{address.countryCode}</p>
        {address.phone && <p className="text-muted-foreground">{address.phone}</p>}
        {address.email && <p className="text-muted-foreground">{address.email}</p>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

export function ParcelDetail({ parcel }: { parcel: Parcel }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400 mb-1">
            Parcel
          </p>
          <h1 className="text-2xl font-bold font-mono tracking-tight">
            {parcel.trackingNumber}
          </h1>
          {parcel.description && (
            <p className="text-muted-foreground mt-1">{parcel.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ParcelStatusBadge status={parcel.status} />
          <span className="text-sm text-muted-foreground">
            {parcel.serviceType.charAt(0) + parcel.serviceType.slice(1).toLowerCase()}
          </span>
          <PrintLabelMenu parcelId={parcel.id} trackingNumber={parcel.trackingNumber} />
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AddressBlock title="Recipient" address={parcel.recipientAddress} />
        <AddressBlock title="Shipper" address={parcel.shipperAddress} />
      </div>

      {/* Physical & Value Info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Physical Details
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow
            label="Weight"
            value={`${parcel.weight} ${parcel.weightUnit.toLowerCase()}`}
          />
          <InfoRow
            label="Dimensions"
            value={`${parcel.length}×${parcel.width}×${parcel.height} ${parcel.dimensionUnit.toLowerCase()}`}
          />
          <InfoRow
            label="Declared Value"
            value={`${parcel.currency} ${parcel.declaredValue}`}
          />
          <InfoRow label="Parcel Type" value={parcel.parcelType} />
          <InfoRow
            label="Est. Delivery"
            value={
              parcel.estimatedDeliveryDate
                ? new Date(parcel.estimatedDeliveryDate).toLocaleDateString()
                : "—"
            }
          />
          <InfoRow
            label="Actual Delivery"
            value={
              parcel.actualDeliveryDate
                ? new Date(parcel.actualDeliveryDate).toLocaleDateString()
                : "—"
            }
          />
          <InfoRow label="Delivery Attempts" value={parcel.deliveryAttempts} />
          <InfoRow label="Zone" value={parcel.zone?.name} />
        </div>
      </div>

      {/* Tracking Timeline */}
      {parcel.trackingEvents.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
            Tracking History
          </p>
          <div className="relative space-y-0">
            {parcel.trackingEvents.map((event, i) => (
              <div key={event.id} className="flex gap-4 pb-4 last:pb-0">
                {/* timeline dot + line */}
                <div className="flex flex-col items-center">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-amber-400" />
                  {i < parcel.trackingEvents.length - 1 && (
                    <div className="mt-1 w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      {event.eventType.replace(/_/g, " ").charAt(0).toUpperCase() +
                        event.eventType.replace(/_/g, " ").slice(1).toLowerCase()}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.description}
                    </p>
                  )}
                  <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                    {[event.locationCity, event.locationState, event.locationCountryCode]
                      .filter(Boolean)
                      .join(", ")}
                    {event.operator && <span>· {event.operator}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Items */}
      {parcel.contentItems.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Contents ({parcel.contentItems.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-2 pr-4 font-medium">HS Code</th>
                  <th className="pb-2 pr-4 font-medium">Description</th>
                  <th className="pb-2 pr-4 font-medium text-right">Qty</th>
                  <th className="pb-2 pr-4 font-medium text-right">Unit Value</th>
                  <th className="pb-2 font-medium text-right">Weight</th>
                </tr>
              </thead>
              <tbody>
                {parcel.contentItems.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{item.hsCode}</td>
                    <td className="py-2 pr-4">{item.description}</td>
                    <td className="py-2 pr-4 text-right">{item.quantity}</td>
                    <td className="py-2 pr-4 text-right">
                      {item.currency} {item.unitValue}
                    </td>
                    <td className="py-2 text-right">
                      {item.weight} {item.weightUnit.toLowerCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proof of Delivery */}
      {parcel.deliveryConfirmation && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Proof of Delivery
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <InfoRow
              label="Received By"
              value={parcel.deliveryConfirmation.receivedBy}
            />
            <InfoRow
              label="Delivered At"
              value={new Date(parcel.deliveryConfirmation.deliveredAt).toLocaleString()}
            />
            <InfoRow
              label="Location"
              value={parcel.deliveryConfirmation.location}
            />
            {parcel.deliveryConfirmation.latitude &&
              parcel.deliveryConfirmation.longitude && (
                <InfoRow
                  label="Coordinates"
                  value={`${parcel.deliveryConfirmation.latitude}, ${parcel.deliveryConfirmation.longitude}`}
                />
              )}
          </div>
          {parcel.deliveryConfirmation.signatureImage && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Signature</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${parcel.deliveryConfirmation.signatureImage}`}
                alt="Signature"
                className="h-16 bg-white rounded border border-border"
              />
            </div>
          )}
          {parcel.deliveryConfirmation.photo && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Photo</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${parcel.deliveryConfirmation.photo}`}
                alt="Delivery photo"
                className="h-32 rounded border border-border object-cover"
              />
            </div>
          )}
        </div>
      )}

      {/* Watchers */}
      {parcel.watchers.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Tracking Watchers
          </p>
          <ul className="space-y-1">
            {parcel.watchers.map((w) => (
              <li key={w.id} className="text-sm">
                <span className="text-muted-foreground">{w.name ?? w.email}</span>
                {w.name && <span className="text-muted-foreground ml-2">({w.email})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-muted-foreground font-mono">
        Created {new Date(parcel.createdAt).toLocaleString()}
        {parcel.lastModifiedAt && (
          <> · Last modified {new Date(parcel.lastModifiedAt).toLocaleString()}</>
        )}
      </div>
    </div>
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
        await downloadParcelLabelPdf(parcelId, trackingNumber);
      } else {
        await downloadParcelLabelZpl(parcelId, trackingNumber);
      }
    } catch (err) {
      console.error("Failed to download label:", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
        disabled={loading !== null}
      >
        {loading ? (
          <span className="text-xs">Downloading...</span>
        ) : (
          <>
            <Printer className="h-4 w-4" />
            Print Label
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-border bg-card shadow-lg py-1">
            <button
              onClick={() => handlePrint("pdf")}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
            >
              A4 PDF
            </button>
            <button
              onClick={() => handlePrint("zpl")}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
            >
              4x6 Thermal (ZPL)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
