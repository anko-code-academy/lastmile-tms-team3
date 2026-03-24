"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useZones, useCreateZone, useUpdateZone, useDeleteZone } from "@/lib/hooks/useZones";
import { useDepots } from "@/lib/hooks/useDepots";
import { ZoneDto, CreateZoneDto, GeoJsonPointDto } from "@/lib/types/zone";

interface GeoJsonFeature {
  type: "Feature";
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][]; };
  properties?: Record<string, unknown>;
}
interface GeoJsonFile {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

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

function TmLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".4rem" }}>
      {children}
    </label>
  );
}

function TmBtn({ children, onClick, type = "button", disabled, variant = "primary", style }: {
  children: React.ReactNode; onClick?: () => void; type?: "button" | "submit" | "reset";
  disabled?: boolean; variant?: "primary" | "secondary" | "danger" | "ghost";
  style?: React.CSSProperties;
}) {
  const variants = {
    primary: { background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent },
    secondary: { background: "rgba(255,255,255,.04)", border: `1px solid ${S.inputBorder}`, color: S.muted },
    danger: { background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171" },
    ghost: { background: "transparent", border: "none", color: S.muted },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`tm-btn-${variant}`} style={{ fontFamily: S.mono, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", padding: ".45rem .9rem", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  background: S.inputBg, border: `1px solid ${S.inputBorder}`, color: S.text,
  borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem",
  width: "100%", outline: "none", fontFamily: S.mono, boxSizing: "border-box",
};

export default function ZonesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.role === "Admin";
  const { data: zones, isLoading: zonesLoading } = useZones(undefined, true);
  const { data: depots, isLoading: depotsLoading } = useDepots(true);
  const createMutation = useCreateZone();
  const updateMutation = useUpdateZone();
  const deleteMutation = useDeleteZone();

  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneDto | null>(null);
  const [formData, setFormData] = useState<CreateZoneDto>({ name: "", depotId: "", boundary: null, isActive: true });
  const [manualPoints, setManualPoints] = useState<GeoJsonPointDto[]>([]);
  const [newPoint, setNewPoint] = useState({ longitude: "", latitude: "" });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string) as GeoJsonFile;
        if (geojson.type !== "FeatureCollection" || !geojson.features.length) { alert("Invalid GeoJSON"); return; }
        const feature = geojson.features[0];
        let coordinates: number[][][];
        if (feature.geometry.type === "Polygon") coordinates = feature.geometry.coordinates as number[][][];
        else if (feature.geometry.type === "MultiPolygon") coordinates = feature.geometry.coordinates[0] as number[][][];
        else { alert(`Invalid geometry type: ${feature.geometry.type}`); return; }
        const ring = coordinates[0];
        const points: GeoJsonPointDto[] = ring.map((coord) => ({ longitude: coord[0], latitude: coord[1] }));
        if (points.length > 1 && points[0].longitude === points[points.length - 1].longitude && points[0].latitude === points[points.length - 1].latitude) points.pop();
        setFormData({ ...formData, boundary: { coordinates: points } });
        setManualPoints(points);
        alert(`Loaded ${points.length} points`);
      } catch (err) { console.error(err); alert("Failed to parse GeoJSON"); }
    };
    reader.readAsText(file);
  };

  const handleAddPoint = () => {
    const lng = parseFloat(newPoint.longitude);
    const lat = parseFloat(newPoint.latitude);
    if (isNaN(lng) || isNaN(lat)) { alert("Enter valid coordinates"); return; }
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) { alert("Coordinates out of range"); return; }
    const newPoints = [...manualPoints, { longitude: lng, latitude: lat }];
    setManualPoints(newPoints);
    setFormData({ ...formData, boundary: { coordinates: newPoints } });
    setNewPoint({ longitude: "", latitude: "" });
  };

  const handleRemovePoint = (index: number) => {
    const newPoints = manualPoints.filter((_, i) => i !== index);
    setManualPoints(newPoints);
    setFormData({ ...formData, boundary: newPoints.length > 0 ? { coordinates: newPoints } : null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.boundary || formData.boundary.coordinates.length < 3) { alert("At least 3 boundary points required"); return; }
    try {
      if (editingZone) await updateMutation.mutateAsync({ id: editingZone.id, ...formData });
      else await createMutation.mutateAsync(formData);
      handleCancel();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (zone: ZoneDto) => {
    setEditingZone(zone);
    setFormData({ name: zone.name, depotId: zone.depotId, isActive: zone.isActive, boundary: zone.boundary });
    setManualPoints(zone.boundary?.coordinates || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this zone?")) {
      try { await deleteMutation.mutateAsync(id); } catch (err) { console.error(err); }
    }
  };

  const handleCancel = () => {
    setShowForm(false); setEditingZone(null);
    setFormData({ name: "", depotId: "", boundary: null, isActive: true });
    setManualPoints([]); setNewPoint({ longitude: "", latitude: "" });
  };

  const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "Parcels", href: "#" },
    { label: "Routes", href: "#" },
    { label: "Drivers", href: "#" },
    ...(isAdmin ? [
      { label: "Depot", href: "/admin/depots" },
      { label: "Zones", href: "/admin/zones", active: true },
      { label: "Users", href: "/admin/users" },
    ] : []),
  ];

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
        .tm-table-row:hover { background:rgba(255,255,255,.03); }
        .tm-file-input::file-selector-button { background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.3); color:#f59e0b; border-radius:4px; padding:.3rem .75rem; font-family:var(--font-geist-mono,monospace); font-size:10px; letter-spacing:.1em; cursor:pointer; margin-right:.75rem; text-transform:uppercase; }
      `}</style>

      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Navbar */}
          <nav style={{ display: "flex", alignItems: "center", padding: "0 2rem", height: "56px", borderBottom: `1px solid ${S.border}`, background: "rgba(8,12,20,.85)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10, gap: "2rem" }}>
            <span style={{ fontFamily: S.mono, fontSize: ".875rem", fontWeight: 800, letterSpacing: "-.01em", color: S.text, flexShrink: 0 }}>
              LAST <span style={{ color: S.accent }}>MILE</span> TMS
            </span>
            <div style={{ display: "flex", gap: ".25rem", flex: 1 }}>
              {navItems.map((item) => (
                <a key={item.label} href={item.href} className={`tm-nav-link${item.active ? " active" : ""}`}>{item.label}</a>
              ))}
            </div>
          </nav>

          <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
              <div>
                <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>Management</p>
                <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: S.text, letterSpacing: "-.02em", lineHeight: 1 }}>Zones</h1>
              </div>
              {!showForm && <TmBtn variant="primary" onClick={() => setShowForm(true)}>+ Add Zone</TmBtn>}
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

                  {/* Boundary */}
                  <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: "1.25rem" }}>
                    <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".18em", color: S.muted, textTransform: "uppercase", marginBottom: "1rem" }}>Zone Boundary</p>

                    {/* GeoJSON upload */}
                    <div style={{ marginBottom: "1.25rem" }}>
                      <input type="file" accept=".json,.geojson" onChange={handleFileUpload} className="tm-file-input" style={{ fontFamily: S.mono, fontSize: "11px", color: S.muted, width: "100%" }} />
                      <p style={{ fontFamily: S.mono, fontSize: "9px", color: S.dim, letterSpacing: ".08em", marginTop: ".4rem" }}>GeoJSON with Polygon or MultiPolygon</p>
                    </div>

                    {/* Manual entry */}
                    <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: "1rem" }}>
                      <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".14em", color: S.muted, textTransform: "uppercase", marginBottom: ".75rem" }}>Or Add Points Manually</p>
                      <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                        <div>
                          <TmLabel>Longitude</TmLabel>
                          <input className="tm-input" type="number" step="any" placeholder="e.g. -74.006" value={newPoint.longitude} onChange={(e) => setNewPoint({ ...newPoint, longitude: e.target.value })} style={{ ...inputStyle, width: "140px" }} />
                        </div>
                        <div>
                          <TmLabel>Latitude</TmLabel>
                          <input className="tm-input" type="number" step="any" placeholder="e.g. 40.7128" value={newPoint.latitude} onChange={(e) => setNewPoint({ ...newPoint, latitude: e.target.value })} style={{ ...inputStyle, width: "140px" }} />
                        </div>
                        <TmBtn variant="secondary" onClick={handleAddPoint} style={{ marginBottom: 0 }}>Add Point</TmBtn>
                      </div>
                    </div>

                    {/* Points table */}
                    {manualPoints.length > 0 && (
                      <div style={{ marginTop: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
                          <span style={{ fontFamily: S.mono, fontSize: "10px", color: S.muted, letterSpacing: ".1em", textTransform: "uppercase" }}>
                            {manualPoints.length} Points {manualPoints.length >= 3 ? <span style={{ color: S.green }}>· Ready</span> : <span style={{ color: S.red }}>· Need {3 - manualPoints.length} more</span>}
                          </span>
                          <button type="button" onClick={() => { setManualPoints([]); setFormData({ ...formData, boundary: null }); }} style={{ fontFamily: S.mono, fontSize: "9px", color: S.dim, background: "none", border: "none", cursor: "pointer", letterSpacing: ".1em", textTransform: "uppercase" }}>
                            Clear All
                          </button>
                        </div>
                        <div style={{ maxHeight: "200px", overflowY: "auto", border: `1px solid ${S.border}`, borderRadius: 6 }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${S.border}`, background: "rgba(255,255,255,.03)" }}>
                                {["#", "Longitude", "Latitude", ""].map((h) => (
                                  <th key={h} style={{ padding: ".45rem .75rem", textAlign: "left", fontFamily: S.mono, fontSize: "9px", letterSpacing: ".12em", color: S.muted, textTransform: "uppercase", fontWeight: 600 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {manualPoints.map((point, i) => (
                                <tr key={i} className="tm-table-row" style={{ borderBottom: `1px solid rgba(255,255,255,.03)` }}>
                                  <td style={{ padding: ".35rem .75rem", fontFamily: S.mono, fontSize: "10px", color: S.dim }}>{i + 1}</td>
                                  <td style={{ padding: ".35rem .75rem", fontFamily: S.mono, fontSize: "11px", color: S.text }}>{point.longitude.toFixed(6)}</td>
                                  <td style={{ padding: ".35rem .75rem", fontFamily: S.mono, fontSize: "11px", color: S.text }}>{point.latitude.toFixed(6)}</td>
                                  <td style={{ padding: ".35rem .75rem", textAlign: "right" }}>
                                    <button type="button" onClick={() => handleRemovePoint(i)} style={{ fontFamily: S.mono, fontSize: "9px", color: "#f87171", background: "none", border: "none", cursor: "pointer", letterSpacing: ".1em", textTransform: "uppercase" }}>Remove</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: ".75rem", marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: `1px solid ${S.border}` }}>
                    <TmBtn type="submit" variant="primary" disabled={createMutation.isPending || updateMutation.isPending}>
                      {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                    </TmBtn>
                    <TmBtn variant="secondary" onClick={handleCancel}>Cancel</TmBtn>
                  </div>
                </form>
              </div>
            )}

            {/* Zone list */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {zones?.map((zone) => (
                <div key={zone.id} className="tm-card" style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", transition: "border-color .2s" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".4rem" }}>
                      <span style={{ fontFamily: S.mono, fontSize: ".95rem", fontWeight: 700, color: S.text }}>{zone.name}</span>
                      <span style={{ fontFamily: S.mono, fontSize: "9px", letterSpacing: ".12em", padding: ".2rem .5rem", borderRadius: 4, border: `1px solid ${zone.isActive ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`, color: zone.isActive ? S.green : S.red, textTransform: "uppercase" }}>
                        {zone.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p style={{ fontFamily: S.mono, fontSize: ".8rem", color: S.muted, marginBottom: ".2rem" }}>Depot: {zone.depotName}</p>
                    {zone.boundary && (
                      <p style={{ fontFamily: S.mono, fontSize: "10px", color: S.dim, letterSpacing: ".06em" }}>
                        {zone.boundary.coordinates.length} boundary points
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", flexShrink: 0 }}>
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
