"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import TmNavbar from "@/components/TmNavbar";
import { useZones, useCreateZone, useUpdateZone, useDeleteZone } from "@/lib/hooks/useZones";
import { useDepots } from "@/lib/hooks/useDepots";
import { ZoneDto, CreateZoneDto, UpdateZoneDto, GeoJsonPointDto } from "@/lib/types/zone";

const ZoneMap = dynamic(() => import("@/components/ZoneMap"), {
  ssr: false,
  loading: () => (
    <div style={{
      width: "100%", height: "420px", borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.02)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "monospace", fontSize: "11px", color: "#4a5f7a", letterSpacing: ".1em",
    }}>Loading map...</div>
  ),
});

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)" as const,
  text: "#e2e8f0" as const,
  muted: "#4a5f7a" as const,
  dim: "#3a526e" as const,
  accent: "#f59e0b" as const,
  green: "#22c55e" as const,
  red: "#ef4444" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

function TmLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".4rem" }}>
      {children}
    </label>
  );
}

function TmBtn({ children, onClick, type = "button", disabled, variant = "primary", style }: {
  children: React.ReactNode; onClick?: () => void; type?: "button" | "submit" | "reset";
  disabled?: boolean; variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  style?: React.CSSProperties;
}) {
  const inputBorder = "rgba(255,255,255,.1)";
  const variants = {
    primary: { background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent },
    secondary: { background: "rgba(255,255,255,.04)", border: `1px solid ${inputBorder}`, color: S.muted },
    danger: { background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171" },
    ghost: { background: "transparent", border: "none", color: S.muted },
    outline: { background: "transparent", border: `1px solid ${S.accent}`, color: S.accent },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: S.text,
  borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem",
  width: "100%", outline: "none", fontFamily: S.mono, boxSizing: "border-box",
};

export default function ZonesPage() {
  const { data: zones, isLoading: zonesLoading } = useZones(undefined, true);
  const { data: depots, isLoading: depotsLoading } = useDepots(true);
  const createMutation = useCreateZone();
  const updateMutation = useUpdateZone();
  const deleteMutation = useDeleteZone();

  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneDto | null>(null);
  const [formData, setFormData] = useState<CreateZoneDto>({ name: "", depotId: "", boundary: null, isActive: true });
  const [drawnPoints, setDrawnPoints] = useState<GeoJsonPointDto[]>([]);
  const [drawnPointsHistory, setDrawnPointsHistory] = useState<GeoJsonPointDto[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [selectedZoneOnMap, setSelectedZoneOnMap] = useState<ZoneDto | null>(null);

  // Stable refs for callbacks that need current values
  const drawnPointsRef = useRef(drawnPoints);
  const historyIndexRef = useRef(historyIndex);
  const drawnPointsHistoryRef = useRef(drawnPointsHistory);

  // Detect if a polygon is closed (last point equals first)
  const isClosedPolygon = (pts: GeoJsonPointDto[]) =>
    pts.length >= 3 && pts[0].longitude === pts[pts.length - 1].longitude && pts[0].latitude === pts[pts.length - 1].latitude;

  // Drawing is active when form is open and user hasn't saved yet
  const isDrawing = showForm && !editingZone;

  const selectedDepot = useMemo(
    () => depots?.find((d) => d.id === formData.depotId) ?? null,
    [depots, formData.depotId]
  );

  const depotLocation = useMemo(() => {
    if (!selectedDepot?.address) return null;
    const { latitude, longitude } = selectedDepot.address;
    if (!latitude || !longitude) return null;
    return { latitude, longitude };
  }, [selectedDepot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In edit mode: if drawnPoints has 1-2 points, that's invalid
    // In edit mode: if drawnPoints has 0 points, boundary is cleared (keep existing)
    if (editingZone && drawnPoints.length > 0 && drawnPoints.length < 3) {
      alert("Add at least 3 points or remove all points to keep existing boundary"); return;
    }
    if (!editingZone && (!formData.boundary || formData.boundary.coordinates.length < 3)) {
      alert("Add at least 3 points on the map to create a zone boundary"); return;
    }
    try {
      const coords = formData.boundary?.coordinates || [];
      // Strip closing point before sending — backend auto-closes
      const cleanBoundary = coords.length >= 3 && isClosedPolygon(coords)
        ? { coordinates: coords.slice(0, -1) }
        : formData.boundary;
      if (editingZone) {
        const payload: { id: string; name: string; depotId: string; isActive: boolean; boundary: typeof cleanBoundary } = {
          id: editingZone.id,
          name: formData.name,
          depotId: formData.depotId,
          isActive: formData.isActive,
          boundary: cleanBoundary
        };
        await updateMutation.mutateAsync(payload as UpdateZoneDto);
      } else {
        const payload = { name: formData.name, depotId: formData.depotId, isActive: formData.isActive, boundary: cleanBoundary };
        await createMutation.mutateAsync(payload);
      }
      handleCancel();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (zone: ZoneDto) => {
    setEditingZone(zone);
    // Trim closing point if present so user sees only their original points
    const coords = zone.boundary?.coordinates || [];
    const cleanPoints = isClosedPolygon(coords) ? coords.slice(0, -1) : coords;
    setFormData({ name: zone.name, depotId: zone.depotId, isActive: zone.isActive, boundary: zone.boundary });
    setDrawnPoints(cleanPoints);
    setDrawnPointsHistory([cleanPoints]); // Initialize history with zone's current points
    setHistoryIndex(0);
    setShowForm(true);
    setSelectedZoneOnMap(zone);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this zone?")) {
      try { await deleteMutation.mutateAsync(id); } catch (err) { console.error(err); }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingZone(null);
    setFormData({ name: "", depotId: "", boundary: null, isActive: true });
    setDrawnPoints([]);
    setDrawnPointsHistory([[]]);
    setHistoryIndex(0);
    setSelectedZoneOnMap(null);
  };

  const handleZoneDrawn = useCallback((points: GeoJsonPointDto[]) => {
    if (points.length >= 3) {
      setDrawnPoints(points);
      setFormData((prev) => ({ ...prev, boundary: { coordinates: points } }));
    } else {
      setDrawnPoints(points);
      setFormData((prev) => ({ ...prev, boundary: null }));
    }
  }, []);

  const handlePointAdded = useCallback((pt: GeoJsonPointDto, _total: number) => {
    setDrawnPoints((prev) => {
      // In create mode: prevent accidental closure (first point = last click)
      // — closure is implicit on the backend
      if (!editingZone && prev.length >= 3 && pt.longitude === prev[0].longitude && pt.latitude === prev[0].latitude) {
        return prev;
      }
      const next = [...prev, pt];
      // Push to history
      setDrawnPointsHistory((hist) => {
        const newHist = hist.slice(0, historyIndexRef.current + 1);
        if (newHist.length >= 50) newHist.shift();
        return [...newHist, next];
      });
      setHistoryIndex((idx) => Math.min(idx + 1, 49));
      // Sync formData boundary
      setFormData((prev) => ({ ...prev, boundary: { coordinates: next } }));
      return next;
    });
  }, [editingZone]);

  const handlePointDragged = useCallback((index: number, point: GeoJsonPointDto) => {
    setDrawnPoints((prev) => {
      const next = [...prev];
      next[index] = point;
      // Push to history
      setDrawnPointsHistory((hist) => {
        const newHist = hist.slice(0, historyIndexRef.current + 1);
        if (newHist.length >= 50) newHist.shift();
        return [...newHist, next];
      });
      setHistoryIndex((idx) => Math.min(idx + 1, 49));
      // Sync formData boundary
      setFormData((prev) => ({ ...prev, boundary: { coordinates: next } }));
      return next;
    });
  }, []);

  // Sync refs when values change
  useEffect(() => {
    drawnPointsRef.current = drawnPoints;
  }, [drawnPoints]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    drawnPointsHistoryRef.current = drawnPointsHistory;
  }, [drawnPointsHistory]);

  // Keyboard shortcuts: Delete zone, Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      // Delete key: delete zone selected on map
      if ((e.key === "Delete" || e.key === "Backspace") && selectedZoneOnMap && !showForm) {
        e.preventDefault();
        if (confirm(`Delete zone "${selectedZoneOnMap.name}"?`)) {
          deleteMutation.mutate(selectedZoneOnMap.id);
          setSelectedZoneOnMap(null);
        }
        return;
      }

      // Only handle undo/redo when form is open
      if (!showForm) return;

      // Ctrl+Z = Undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const newIdx = historyIndexRef.current - 1;
        if (newIdx < 0) return;
        setDrawnPoints(drawnPointsHistoryRef.current[newIdx]);
        setHistoryIndex(newIdx);
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z = Redo
      if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) {
        e.preventDefault();
        const newIdx = historyIndexRef.current + 1;
        if (newIdx >= drawnPointsHistoryRef.current.length) return;
        setDrawnPoints(drawnPointsHistoryRef.current[newIdx]);
        setHistoryIndex(newIdx);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedZoneOnMap, showForm, deleteMutation]);

  const handleZoneSelected = useCallback((zone: ZoneDto | null) => {
    setSelectedZoneOnMap(zone);
  }, []);

  const handleZoneClick = (zone: ZoneDto) => {
    setSelectedZoneOnMap(zone);
  };

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-input::placeholder { color: #3a526e; }
        .tm-card:hover { border-color: rgba(245,158,11,.18) !important; }
        .tm-nav-link { font-family:var(--font-geist-mono,monospace); font-size:11px; letter-spacing:.14em; text-decoration:none; text-transform:uppercase; padding:.375rem .5rem; border-radius:4px; color:#3d4f6b; transition:color .15s,background .15s; }
        .tm-nav-link:hover { color:#e2e8f0; background:rgba(255,255,255,.04); }
        .tm-nav-link.active { color:#f59e0b; }
        .tm-checkbox { accent-color:#f59e0b; width:14px; height:14px; cursor:pointer; }
        .tm-select { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); color:#e2e8f0; border-radius:6px; padding:.5rem .75rem; font-size:.875rem; width:100%; outline:none; font-family:var(--font-geist-mono,monospace); }
        .tm-select:focus { border-color:rgba(245,158,11,.45); }
        .tm-select option { background:#0f1929; color:#e2e8f0; }
        .zone-card { cursor: pointer; }
        .zone-card.selected { border-color: rgba(245,158,11,.4) !important; background: rgba(245,158,11,.04) !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <TmNavbar />

          <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
              <div>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>Management</p>
                <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>Zones</h1>
              </div>
              {!showForm && <TmBtn variant="primary" onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>+ Add Zone</TmBtn>}
            </div>

            {(zonesLoading || depotsLoading) && <p style={{ fontFamily: S.mono, fontSize: ".875rem", color: S.muted }}>Loading...</p>}

            {/* Form */}
            {showForm && (
              <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, marginBottom: "1.5rem", padding: "1.75rem" }}>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase", marginBottom: "1.25rem" }}>
                  {editingZone ? "Edit Zone" : "New Zone"}
                </p>
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: "1rem" }}>
                    <TmLabel htmlFor="name">Name</TmLabel>
                    <input id="name" className="tm-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={inputStyle} />
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <TmLabel htmlFor="depot">Depot</TmLabel>
                    <select id="depot" className="tm-select" value={formData.depotId} onChange={(e) => setFormData({ ...formData, depotId: e.target.value })} required>
                      <option value="">Select a depot</option>
                      {depots?.map((depot) => (
                        <option key={depot.id} value={depot.id}>{depot.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer" }}>
                      <input type="checkbox" className="tm-checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                      <span style={{ fontFamily: S.mono, fontSize: "11px", color: S.muted, letterSpacing: ".08em" }}>Active</span>
                    </label>
                  </div>

                  {/* Map */}
                  <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: "1.25rem" }}>
                    <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase", marginBottom: ".75rem" }}>
                      Zone Boundary
                    </p>

                    {drawnPoints.length > 0 && (
                      <div style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.15)", borderRadius: 6, padding: ".4rem .75rem", marginBottom: ".75rem", fontFamily: S.mono, fontSize: "10px", color: "#f59e0b", letterSpacing: ".06em" }}>
                        {editingZone
                          ? "Click map points to drag and move them. Press Delete to remove this zone."
                          : "Click map points to drag and move them."}
                      </div>
                    )}

                    <ZoneMap
                      zones={zones ?? []}
                      selectedZone={selectedZoneOnMap}
                      depotLocation={depotLocation}
                      isDrawing={isDrawing}
                      isEditing={!!editingZone && !isDrawing}
                      editingZoneId={editingZone?.id ?? null}
                      onZoneDrawn={handleZoneDrawn}
                      onZoneSelected={handleZoneSelected}
                      onPointAdded={handlePointAdded}
                      onPointDragged={handlePointDragged}
                      enablePointDragging={drawnPoints.length > 0}
                      drawnPoints={drawnPoints ?? []}
                    />

                    {/* Points table */}
                    {drawnPoints.length > 0 && (
                      <div style={{ marginTop: ".75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
                          <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase" }}>
                            Points ({drawnPoints.length})
                          </p>
                          <div style={{ display: "flex", gap: ".25rem" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const newIdx = historyIndexRef.current - 1;
                                if (newIdx < 0) return;
                                const pts = drawnPointsHistoryRef.current[newIdx];
                                setDrawnPoints(pts);
                                setHistoryIndex(newIdx);
                                setFormData((prev) => ({ ...prev, boundary: pts.length >= 3 ? { coordinates: pts } : null }));
                              }}
                              disabled={historyIndex <= 0}
                              title="Undo (Ctrl+Z)"
                              style={{ background: "none", border: "1px solid rgba(255,255,255,.1)", borderRadius: 4, cursor: historyIndex <= 0 ? "not-allowed" : "pointer", color: historyIndex <= 0 ? S.dim : S.muted, padding: ".2rem .5rem", fontSize: "10px", fontFamily: S.mono }}
                            >
                              Undo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newIdx = historyIndexRef.current + 1;
                                if (newIdx >= drawnPointsHistoryRef.current.length) return;
                                const pts = drawnPointsHistoryRef.current[newIdx];
                                setDrawnPoints(pts);
                                setHistoryIndex(newIdx);
                                setFormData((prev) => ({ ...prev, boundary: pts.length >= 3 ? { coordinates: pts } : null }));
                              }}
                              disabled={historyIndex >= drawnPointsHistory.length - 1}
                              title="Redo (Ctrl+Y)"
                              style={{ background: "none", border: "1px solid rgba(255,255,255,.1)", borderRadius: 4, cursor: historyIndex >= drawnPointsHistory.length - 1 ? "not-allowed" : "pointer", color: historyIndex >= drawnPointsHistory.length - 1 ? S.dim : S.muted, padding: ".2rem .5rem", fontSize: "10px", fontFamily: S.mono }}
                            >
                              Redo
                            </button>
                          </div>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                              <th style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, letterSpacing: ".1em", textTransform: "uppercase", padding: ".35rem .5rem", textAlign: "left" }}>#</th>
                              <th style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, letterSpacing: ".1em", textTransform: "uppercase", padding: ".35rem .5rem", textAlign: "left" }}>Longitude</th>
                              <th style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, letterSpacing: ".1em", textTransform: "uppercase", padding: ".35rem .5rem", textAlign: "left" }}>Latitude</th>
                              <th style={{ width: "40px" }} />
                            </tr>
                          </thead>
                          <tbody>
                            {drawnPoints.map((pt, i) => (
                              <tr key={i} style={{ borderBottom: `1px solid ${S.border}` }}>
                                <td style={{ fontFamily: S.mono, fontSize: "11px", color: S.accent, padding: ".35rem .5rem" }}>{i + 1}</td>
                                <td style={{ padding: ".25rem .35rem" }}>
                                  <input
                                    type="number"
                                    step="any"
                                    value={Number(pt.longitude.toFixed(4))}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (isNaN(val)) return;
                                      const updated = drawnPoints.map((p, j) => j === i ? { ...p, longitude: val } : p);
                                      setDrawnPoints(updated);
                                      // Push to history
                                      setDrawnPointsHistory((hist) => {
                                        const newHist = hist.slice(0, historyIndexRef.current + 1);
                                        if (newHist.length >= 50) newHist.shift();
                                        return [...newHist, updated];
                                      });
                                      setHistoryIndex((idx) => Math.min(idx + 1, 49));
                                      setFormData((prev) => ({ ...prev, boundary: { coordinates: updated } }));
                                    }}
                                    onBlur={(e) => {
                                      const rounded = Number(parseFloat(e.target.value).toFixed(4));
                                      const updated = drawnPoints.map((p, j) => j === i ? { ...p, longitude: rounded } : p);
                                      setDrawnPoints(updated);
                                      setFormData((prev) => ({ ...prev, boundary: { coordinates: updated } }));
                                    }}
                                    style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: S.text, borderRadius: 4, padding: ".25rem .4rem", fontSize: "11px", fontFamily: S.mono, width: "100%", outline: "none" }}
                                  />
                                </td>
                                <td style={{ padding: ".25rem .35rem" }}>
                                  <input
                                    type="number"
                                    step="any"
                                    value={Number(pt.latitude.toFixed(4))}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (isNaN(val)) return;
                                      const updated = drawnPoints.map((p, j) => j === i ? { ...p, latitude: val } : p);
                                      setDrawnPoints(updated);
                                      // Push to history
                                      setDrawnPointsHistory((hist) => {
                                        const newHist = hist.slice(0, historyIndexRef.current + 1);
                                        if (newHist.length >= 50) newHist.shift();
                                        return [...newHist, updated];
                                      });
                                      setHistoryIndex((idx) => Math.min(idx + 1, 49));
                                      setFormData((prev) => ({ ...prev, boundary: { coordinates: updated } }));
                                    }}
                                    onBlur={(e) => {
                                      const rounded = Number(parseFloat(e.target.value).toFixed(4));
                                      const updated = drawnPoints.map((p, j) => j === i ? { ...p, latitude: rounded } : p);
                                      setDrawnPoints(updated);
                                      setFormData((prev) => ({ ...prev, boundary: { coordinates: updated } }));
                                    }}
                                    style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: S.text, borderRadius: 4, padding: ".25rem .4rem", fontSize: "11px", fontFamily: S.mono, width: "100%", outline: "none" }}
                                  />
                                </td>
                                <td style={{ padding: ".35rem .5rem", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = drawnPoints.filter((_, j) => j !== i);
                                      setDrawnPoints(updated);
                                      // Push to history
                                      setDrawnPointsHistory((hist) => {
                                        const newHist = hist.slice(0, historyIndexRef.current + 1);
                                        if (newHist.length >= 50) newHist.shift();
                                        return [...newHist, updated];
                                      });
                                      setHistoryIndex((idx) => Math.min(idx + 1, 49));
                                      // Clear boundary if deleting drops below 3 points
                                      if (updated.length < 3) {
                                        setFormData((prev) => ({ ...prev, boundary: null }));
                                      } else {
                                        setFormData((prev) => ({ ...prev, boundary: { coordinates: updated } }));
                                      }
                                    }}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: S.red, fontSize: "14px", lineHeight: 1, padding: "0 4px" }}
                                    title="Remove point"
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: ".75rem", marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: `1px solid ${S.border}` }}>
                    <TmBtn
                      type="submit"
                      variant="primary"
                      disabled={!!(createMutation.isPending || updateMutation.isPending || (!editingZone && (formData.boundary === null || formData.boundary.coordinates.length < 3)) || (editingZone && drawnPoints.length > 0 && drawnPoints.length < 3) || (editingZone && drawnPoints.length === 0))}
                    >
                      {!editingZone && !formData.boundary ? "Draw boundary first" : (editingZone && drawnPoints.length > 0 && drawnPoints.length < 3) ? "Add more points" : (createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save")}
                    </TmBtn>
                    <TmBtn variant="secondary" onClick={handleCancel}>Cancel</TmBtn>
                  </div>
                </form>
              </div>
            )}

            {/* Zone list */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {zones?.map((zone) => (
                <div
                  key={zone.id}
                  className={`tm-card zone-card ${selectedZoneOnMap?.id === zone.id ? "selected" : ""}`}
                  style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", transition: "border-color .2s" }}
                  onClick={() => handleZoneClick(zone)}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".4rem" }}>
                      <span style={{ fontFamily: S.mono, fontSize: ".95rem", fontWeight: 700, color: S.text }}>{zone.name}</span>
                      <span style={{ fontFamily: S.mono, fontSize: "9px", letterSpacing: ".12em", padding: ".2rem .5rem", borderRadius: 4, border: `1px solid ${zone.isActive ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`, color: zone.isActive ? S.green : S.red, textTransform: "uppercase" }}>
                        {zone.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.muted, marginBottom: ".2rem" }}>Depot: {zone.depot?.name ?? "Unknown"}</p>
                    {zone.boundary && (
                      <p style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, letterSpacing: ".06em" }}>
                        {zone.boundary.coordinates.length - 1} boundary points
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <TmBtn variant="secondary" onClick={() => handleEdit(zone)}>Edit</TmBtn>
                    <TmBtn variant="danger" onClick={() => handleDelete(zone.id)} disabled={deleteMutation.isPending}>Delete</TmBtn>
                  </div>
                </div>
              ))}
              {zones?.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <p style={{ fontFamily: S.mono, fontSize: ".875rem", color: S.dim }}>No zones yet. Add one to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
