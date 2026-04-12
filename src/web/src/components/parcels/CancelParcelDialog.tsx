"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import type { Parcel } from "@/lib/types/parcel";
import { cancelParcelAction } from "@/lib/actions/parcels";

const S = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" },
  dialog: { background: "#0d1627", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "1.5rem", width: "100%", maxWidth: 440 },
  label: { fontFamily: "var(--font-geist-mono, monospace)", fontSize: "10px", letterSpacing: ".1em", color: "#4a5f7a", textTransform: "uppercase" as const, display: "block", marginBottom: ".375rem" },
  textarea: { width: "100%", padding: ".625rem .75rem", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, color: "#e2e8f0", fontSize: ".875rem", resize: "vertical" as const, minHeight: 80 },
  btnDanger: { padding: ".5rem 1.25rem", background: "#dc2626", border: "none", borderRadius: 6, color: "#fff", fontSize: ".875rem", fontWeight: 600, cursor: "pointer" },
  btnGhost: { padding: ".5rem 1.25rem", background: "transparent", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, color: "#e2e8f0", fontSize: ".875rem", cursor: "pointer" },
  error: { marginTop: ".5rem", fontSize: ".8rem", color: "#ef4444" },
};

interface Props {
  parcel: Pick<Parcel, "id" | "trackingNumber">;
  onClose: () => void;
  onCancelled: (updated: Partial<Parcel>) => void;
}

export function CancelParcelDialog({ parcel, onClose, onCancelled }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Cancel reason is required.");
      return;
    }
    startTransition(async () => {
      const result = await cancelParcelAction({ parcelId: parcel.id, cancelReason: reason.trim() });
      if (result.error) {
        setError(result.error);
      } else if (result.parcel) {
        onCancelled(result.parcel);
      }
    });
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.dialog} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "1rem", fontWeight: 700, color: "#e2e8f0" }}>
            Cancel Parcel
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5f7a" }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: ".875rem", color: "#64748b", marginBottom: "1.25rem" }}>
          Cancel parcel <span style={{ fontFamily: "var(--font-geist-mono, monospace)", color: "#f59e0b" }}>{parcel.trackingNumber}</span>?
          This action cannot be undone.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={S.label}>Cancel Reason *</label>
          <textarea
            style={S.textarea}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describe why this parcel is being cancelled..."
            required
          />
          {error && <p style={S.error}>{error}</p>}
          <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
            <button type="button" style={S.btnGhost} onClick={onClose} disabled={isPending}>
              Keep Parcel
            </button>
            <button type="submit" style={S.btnDanger} disabled={isPending || !reason.trim()}>
              {isPending ? "Cancelling..." : "Cancel Parcel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
