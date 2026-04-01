"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ZoneDto, GeoJsonPointDto } from "@/lib/types/zone";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const ZONE_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6",
  "#ef4444", "#06b6d4", "#f97316", "#84cc16",
];

interface Props {
  zones: ZoneDto[];
  selectedZone: ZoneDto | null;
  depotLocation: { latitude: number; longitude: number } | null;
  isDrawing: boolean;
  isEditing: boolean;
  editingZoneId: string | null;
  onZoneDrawn: (boundary: GeoJsonPointDto[]) => void;
  onZoneSelected: (zone: ZoneDto | null) => void;
  onPointAdded: (point: GeoJsonPointDto, totalPoints: number) => void;
  onPointDragged?: (index: number, point: GeoJsonPointDto) => void;
  enablePointDragging?: boolean;
  drawnPoints: GeoJsonPointDto[];
}

export default function ZoneMap({
  zones,
  selectedZone,
  depotLocation,
  isDrawing,
  isEditing,
  editingZoneId,
  onZoneDrawn,
  onZoneSelected,
  onPointAdded,
  onPointDragged,
  enablePointDragging = false,
  drawnPoints,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const depotMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pointMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Stable refs for click handler — avoids stale closures
  const isDrawingRef = useRef(isDrawing);
  const isEditingRef = useRef(isEditing);
  const onPointAddedRef = useRef(onPointAdded);
  const onPointDraggedRef = useRef(onPointDragged);
  const enablePointDraggingRef = useRef(enablePointDragging);
  const zonesRef = useRef(zones);

  isDrawingRef.current = isDrawing;
  isEditingRef.current = isEditing;
  onPointAddedRef.current = onPointAdded;
  onPointDraggedRef.current = onPointDragged;
  enablePointDraggingRef.current = enablePointDragging;
  zonesRef.current = zones;

  // ─── Helpers ───────────────────────────────────────────────────────

  const removeAllMarkers = useCallback(() => {
    pointMarkersRef.current.forEach((m) => { try { m.remove(); } catch (_) { /* noop */ } });
    pointMarkersRef.current = [];
  }, []);

  const buildGeoJson = useCallback((pts: GeoJsonPointDto[]): GeoJSON.Feature => {
    if (pts.length === 0) return { type: "Feature", geometry: { type: "Point", coordinates: [] }, properties: {} };
    if (pts.length === 1) return { type: "Feature", geometry: { type: "Point", coordinates: [pts[0].longitude, pts[0].latitude] }, properties: {} };
    if (pts.length === 2) return { type: "Feature", geometry: { type: "LineString", coordinates: pts.map((p) => [p.longitude, p.latitude]) }, properties: {} };
    // 3+ → closed polygon
    const coords = pts.map((p) => [p.longitude, p.latitude] as [number, number]);
    return { type: "Feature", geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] }, properties: {} };
  }, []);

  const updatePreview = useCallback((pts: GeoJsonPointDto[]) => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("draw-preview") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({ type: "FeatureCollection", features: pts.length > 0 ? [buildGeoJson(pts)] : [] });
  }, [buildGeoJson]);

  // ─── Core effect: drawnPoints → map markers and preview ────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    removeAllMarkers();
    updatePreview(drawnPoints);

    // Add markers for current drawnPoints
    drawnPoints.forEach((pt, idx) => {
      const map = mapRef.current;
      if (!map) return;
      const el = document.createElement("div");
      const isFirst = idx === 0;
      el.style.cssText = isFirst
        ? "width:16px;height:16px;background:#f59e0b;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px #f59e0b;cursor:grab;"
        : "width:10px;height:10px;background:#f59e0b;border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.5);cursor:grab;";

      const marker = new mapboxgl.Marker({ element: el, draggable: !!enablePointDraggingRef.current })
        .setLngLat([pt.longitude, pt.latitude])
        .addTo(map);

      // Wire up drag events when point dragging is enabled
      if (enablePointDraggingRef.current && onPointDraggedRef.current) {
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          onPointDraggedRef.current!(idx, { longitude: lngLat.lng, latitude: lngLat.lat });
        });
      }

      pointMarkersRef.current.push(marker);
    });
  }, [drawnPoints, removeAllMarkers, updatePreview]);

  // ─── Zone overlays ───────────────────────────────────────────────

  const syncZonesOverlay = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (isDrawingRef.current) return; // hide all zones while drawing

    // Remove old zone layers and sources
    const style = map.getStyle();
    if (!style) return;
    style.layers
      .filter((l) => l.id.startsWith("zone-fill-") || l.id.startsWith("zone-label-"))
      .forEach((l) => { try { map.removeLayer(l.id); } catch (_) { /* noop */ } });
    Object.keys(style.sources)
      .filter((id) => id.startsWith("zone-src-"))
      .forEach((id) => { try { map.removeSource(id); } catch (_) { /* noop */ } });

    zones.forEach((zone, idx) => {
      if (!zone.boundary || zone.boundary.coordinates.length < 3) return;
      if (zone.id === editingZoneId) return; // edited zone shown as preview

      const color = ZONE_COLORS[idx % ZONE_COLORS.length];
      const coords = zone.boundary.coordinates;
      const closed: [number, number][] = [
        ...coords.map((p) => [p.longitude, p.latitude] as [number, number]),
        [coords[0].longitude, coords[0].latitude],
      ];
      const sourceId = `zone-src-${zone.id}`;
      const fillLayerId = `zone-fill-${zone.id}`;
      const labelLayerId = `zone-label-${zone.id}`;

      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [closed] }, properties: { color } }] },
      });
      map.addLayer({
        id: fillLayerId, type: "fill", source: sourceId,
        paint: { "fill-color": color, "fill-opacity": selectedZone?.id === zone.id ? 0.45 : 0.2 },
      });
      map.addLayer({
        id: labelLayerId, type: "symbol", source: sourceId,
        layout: { "text-field": zone.name, "text-size": 12, "text-anchor": "center" },
        paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.75)", "text-halo-width": 1.5 },
      });
    });
  }, [zones, selectedZone, editingZoneId]);

  // Sync zones when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) {
      syncZonesOverlay();
    } else {
      map.on("load", () => syncZonesOverlay());
    }
  }, [zones, selectedZone, editingZoneId, syncZonesOverlay]);

  // Update zone fill opacity on selection change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    zones.forEach((zone) => {
      const fillLayerId = `zone-fill-${zone.id}`;
      if (map.getLayer(fillLayerId)) {
        map.setPaintProperty(fillLayerId, "fill-opacity", selectedZone?.id === zone.id ? 0.45 : 0.2);
      }
    });
  }, [selectedZone, zones]);

  // Fly to selected zone
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedZone?.boundary || selectedZone.boundary.coordinates.length === 0) return;
    const coords = selectedZone.boundary.coordinates;
    const lngs = coords.map((p) => p.longitude);
    const lats = coords.map((p) => p.latitude);
    map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 80, maxZoom: 15, duration: 800 });
  }, [selectedZone?.id]);

  // Depot marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (depotMarkerRef.current) { try { depotMarkerRef.current.remove(); } catch (_) { /* noop */ } depotMarkerRef.current = null; }
    if (!depotLocation) return;
    const el = document.createElement("div");
    el.style.cssText = "width:14px;height:14px;background:#f59e0b;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.5);";
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([depotLocation.longitude, depotLocation.latitude])
      .setPopup(new mapboxgl.Popup({ offset: 15 }).setText("Depot location"))
      .addTo(map);
    depotMarkerRef.current = marker;
    return () => { try { marker.remove(); } catch (_) { /* noop */ } };
  }, [depotLocation]);

  // Cursor style
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = isDrawing || isEditing ? "crosshair" : "";
  }, [isDrawing, isEditing]);

  // ─── Map init (runs once on mount) ─────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [30.3, 59.95],
      zoom: 10,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.doubleClickZoom.disable();

    map.on("load", () => {
      map.addSource("draw-preview", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "draw-preview-fill", type: "fill", source: "draw-preview",
        paint: { "fill-color": "#f59e0b", "fill-opacity": 0.2 },
        filter: ["==", "$type", "Polygon"],
      });
      map.addLayer({
        id: "draw-preview-line", type: "line", source: "draw-preview",
        paint: { "line-color": "#f59e0b", "line-width": 2 },
        filter: ["in", "$type", "LineString", "Polygon"],
      });
      map.addLayer({
        id: "draw-preview-point", type: "circle", source: "draw-preview",
        paint: { "circle-color": "#f59e0b", "circle-radius": 5, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
        filter: ["==", "$type", "Point"],
      });

      mapRef.current = map;
      syncZonesOverlay();

      // Load pre-existing drawnPoints (e.g. when editing starts)
      if (drawnPoints.length > 0) {
        drawnPoints.forEach((pt, idx) => {
          const el = document.createElement("div");
          const isFirst = idx === 0;
          el.style.cssText = isFirst
            ? "width:16px;height:16px;background:#f59e0b;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px #f59e0b;cursor:grab;"
            : "width:10px;height:10px;background:#f59e0b;border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.5);cursor:grab;";
          const marker = new mapboxgl.Marker({ element: el, draggable: !!enablePointDraggingRef.current })
            .setLngLat([pt.longitude, pt.latitude])
            .addTo(map);
          if (enablePointDraggingRef.current && onPointDraggedRef.current) {
            marker.on("dragend", () => {
              const lngLat = marker.getLngLat();
              onPointDraggedRef.current!(idx, { longitude: lngLat.lng, latitude: lngLat.lat });
            });
          }
          pointMarkersRef.current.push(marker);
        });
        updatePreview(drawnPoints);
      }
    });

    // Canvas click — zone selection OR add point
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const map = mapRef.current;
      if (!map) return;

      // Zone selection: was a zone fill clicked?
      const style = map.getStyle();
      if (!style) return;
      const fillLayerIds = style.layers.filter((l) => l.id.startsWith("zone-fill-")).map((l) => l.id);
      const features = map.queryRenderedFeatures(e.point, { layers: fillLayerIds });
      if (features.length > 0) {
        const sourceId = features[0].source as string;
        const zoneId = sourceId.replace("zone-src-", "");
        const zone = zonesRef.current.find((z) => z.id === zoneId);
        if (zone) onZoneSelected(zone);
        return;
      }

      // Add drawing point
      if (!isDrawingRef.current && !isEditingRef.current) return;
      const pt: GeoJsonPointDto = { longitude: e.lngLat.lng, latitude: e.lngLat.lat };
      const newIndex = pointMarkersRef.current.length;
      const el = document.createElement("div");
      el.style.cssText = "width:10px;height:10px;background:#f59e0b;border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.5);cursor:grab;";
      const marker = new mapboxgl.Marker({ element: el, draggable: !!enablePointDraggingRef.current })
        .setLngLat([pt.longitude, pt.latitude])
        .addTo(map);
      if (enablePointDraggingRef.current && onPointDraggedRef.current) {
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          onPointDraggedRef.current!(newIndex, { longitude: lngLat.lng, latitude: lngLat.lat });
        });
      }
      pointMarkersRef.current.push(marker);
      onPointAddedRef.current(pt, pointMarkersRef.current.length + 1);
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
      removeAllMarkers();
      try { map.remove(); } catch (_) { /* noop */ }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only runs once

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "420px", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}
    />
  );
}
