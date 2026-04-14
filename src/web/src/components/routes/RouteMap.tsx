"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { RouteStatus } from "@/lib/types/route";
import { fetchRoundTripPath } from "@/lib/mapbox/directions";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const STATUS_COLORS: Record<RouteStatus, string> = {
  [RouteStatus.Draft]: "#94a3b8",
  [RouteStatus.Dispatched]: "#3b82f6",
  [RouteStatus.InProgress]: "#f59e0b",
  [RouteStatus.Completed]: "#22c55e",
};

interface StopData {
  parcelId: string;
  stopOrder: number;
  trackingNumber: string;
  latitude: number;
  longitude: number;
  address: string;
  status?: string;
}

interface RouteMapProps {
  depotLocation: { latitude: number; longitude: number; name: string } | null;
  stops: StopData[];
  selectedStopId: string | null;
  onStopSelected: (parcelId: string | null) => void;
  status: RouteStatus;
}

const STOP_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  DELIVERED: { bg: "#22c55e", text: "\u2713" },
  FAILED_ATTEMPT: { bg: "#ef4444", text: "!" },
};

function getStopColor(stopStatus: string | undefined, routeColor: string): { bg: string; text: string } {
  if (!stopStatus) return { bg: routeColor, text: "" };
  const mapped = STOP_STATUS_STYLES[stopStatus];
  if (mapped) return mapped;
  return { bg: routeColor, text: "" };
}

export default function RouteMap({
  depotLocation,
  stops,
  selectedStopId,
  onStopSelected,
  status,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Stable refs for callbacks
  const onStopSelectedRef = useRef(onStopSelected);
  onStopSelectedRef.current = onStopSelected;

  // Effect: markers only (no line drawing)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const color = STATUS_COLORS[status] ?? "#94a3b8";

    // Remove old markers
    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch (_) {
        /* noop */
      }
    });
    markersRef.current = [];

    const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder);

    // Add depot marker
    if (depotLocation) {
      const depotEl = document.createElement("div");
      depotEl.style.cssText =
        `width:28px;height:28px;background:#f59e0b;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#080c14;`;
      depotEl.textContent = "D";

      const depotMarker = new mapboxgl.Marker({ element: depotEl })
        .setLngLat([depotLocation.longitude, depotLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 15 }).setText(
            `Depot: ${depotLocation.name}`
          )
        )
        .addTo(map);
      markersRef.current.push(depotMarker);
    }

    // Add stop markers
    sortedStops.forEach((stop) => {
      const isSelected = stop.parcelId === selectedStopId;
      const stopColor = getStopColor(stop.status, color);
      const el = document.createElement("div");

      if (isSelected) {
        el.style.cssText = `width:24px;height:24px;background:${stopColor.bg};border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px ${stopColor.bg},0 0 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:#080c14;cursor:pointer;`;
      } else {
        el.style.cssText = `width:20px;height:20px;background:${stopColor.bg};border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;color:#080c14;cursor:pointer;`;
      }
      el.textContent = stopColor.text || String(stop.stopOrder);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([stop.longitude, stop.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<strong>#${stop.stopOrder}</strong> ${stop.trackingNumber}<br/><span style="color:#8899aa">${stop.address}</span>`
          )
        )
        .addTo(map);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onStopSelectedRef.current(
          stop.parcelId === selectedStopId ? null : stop.parcelId
        );
      });

      markersRef.current.push(marker);
    });

    // Fit bounds or fly to selected stop
    const allCoords: [number, number][] = [];
    if (depotLocation) {
      allCoords.push([depotLocation.longitude, depotLocation.latitude]);
    }
    sortedStops.forEach((s) => allCoords.push([s.longitude, s.latitude]));

    if (selectedStopId) {
      const selected = sortedStops.find((s) => s.parcelId === selectedStopId);
      if (selected) {
        map.flyTo({
          center: [selected.longitude, selected.latitude],
          zoom: Math.max(map.getZoom(), 14),
          duration: 600,
        });
      }
    } else if (allCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      allCoords.forEach((c) => bounds.extend(c as mapboxgl.LngLatLike));
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 });
    }
  }, [stops, selectedStopId, depotLocation, status]);

  // Effect: route line — straight-line initially, then road-following
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const color = STATUS_COLORS[status] ?? "#94a3b8";

    // Build straight-line coordinates as initial draw
    const lineCoords: [number, number][] = [];
    if (depotLocation) {
      lineCoords.push([depotLocation.longitude, depotLocation.latitude]);
    }
    const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder);
    sortedStops.forEach((s) => lineCoords.push([s.longitude, s.latitude]));
    if (depotLocation && lineCoords.length > 1) {
      lineCoords.push([depotLocation.longitude, depotLocation.latitude]);
    }

    // Draw straight line immediately
    const routeSource = map.getSource("route-line") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (routeSource) {
      routeSource.setData({
        type: "FeatureCollection",
        features:
          lineCoords.length >= 2
            ? [{ type: "Feature", geometry: { type: "LineString", coordinates: lineCoords }, properties: {} }]
            : [],
      });
    }

    map.setPaintProperty("route-line-layer", "line-color", color);

    // Then fetch road-following path
    if (stops.length === 0) return;

    let cancelled = false;

    fetchRoundTripPath({
      depot: depotLocation
        ? { latitude: depotLocation.latitude, longitude: depotLocation.longitude }
        : null,
      stops: sortedStops.map((s) => ({ latitude: s.latitude, longitude: s.longitude, stopOrder: s.stopOrder })),
    }).then((roadCoords) => {
      if (cancelled) return;
      const src = map.getSource("route-line") as mapboxgl.GeoJSONSource | undefined;
      if (src && roadCoords.length >= 2) {
        src.setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: { type: "LineString", coordinates: roadCoords }, properties: {} }],
        });
      }
    });

    return () => { cancelled = true; };
  }, [stops, depotLocation, status]);

  // Map init
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

    map.on("load", () => {
      map.addSource("route-line", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "route-line-layer",
        type: "line",
        source: "route-line",
        paint: {
          "line-color": "#94a3b8",
          "line-width": 3,
          "line-opacity": 0.7,
        },
      });

      mapRef.current = map;
    });

    return () => {
      markersRef.current.forEach((m) => {
        try {
          m.remove();
        } catch (_) {
          /* noop */
        }
      });
      try {
        map.remove();
      } catch (_) {
        /* noop */
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!stops.length && !depotLocation) {
    return (
      <div
        style={{
          height: 300,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,.07)",
          background: "rgba(255,255,255,.02)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#647a96",
          fontSize: ".85rem",
        }}
      >
        No stops to display on map
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 380,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,.07)",
      }}
    />
  );
}
