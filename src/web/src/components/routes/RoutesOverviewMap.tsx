"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { RouteMapData } from "@/lib/types/route";
import { RouteStatus } from "@/lib/types/route";
import { fetchRoutePath, fetchRoundTripPath } from "@/lib/mapbox/directions";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const STATUS_COLORS: Record<RouteStatus, string> = {
  [RouteStatus.Draft]: "#94a3b8",
  [RouteStatus.Dispatched]: "#3b82f6",
  [RouteStatus.InProgress]: "#f59e0b",
  [RouteStatus.Completed]: "#22c55e",
};

const STOP_STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  LOADED: { bg: "", label: "Loaded" },
  OUT_FOR_DELIVERY: { bg: "", label: "Out for delivery" },
  DELIVERED: { bg: "#22c55e", label: "Delivered" },
  FAILED_ATTEMPT: { bg: "#ef4444", label: "Failed" },
  STAGED: { bg: "#64748b", label: "Staged" },
};

function getStopMarkerStyle(status: string, routeColor: string): { bg: string; text: string; label: string } {
  const mapped = STOP_STATUS_STYLES[status];
  if (!mapped) return { bg: "#64748b", text: "", label: status.replace(/_/g, " ") };
  if (mapped.bg === "") return { bg: routeColor, text: "", label: mapped.label };
  if (status === "DELIVERED") return { bg: mapped.bg, text: "✓", label: mapped.label };
  if (status === "FAILED_ATTEMPT") return { bg: mapped.bg, text: "!", label: mapped.label };
  return { bg: mapped.bg, text: "", label: mapped.label };
}

interface DriverPosition {
  lat: number;
  lng: number;
  timestamp: string;
}

interface RoutesOverviewMapProps {
  routes: RouteMapData[];
  selectedRouteId: string | null;
  onRouteSelected: (id: string | null) => void;
  driverPositions: Map<string, DriverPosition>;
}

export default function RoutesOverviewMap({
  routes,
  selectedRouteId,
  onRouteSelected,
  driverPositions,
}: RoutesOverviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const staticMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const driverMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const animFramesRef = useRef<Map<string, number>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  const onRouteSelectedRef = useRef(onRouteSelected);
  onRouteSelectedRef.current = onRouteSelected;

  // Effect 1: Route lines (sync straight-line + async road-following)
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const style = map.getStyle();
    if (style?.layers) {
      for (const layer of style.layers) {
        if (layer.id.startsWith("route-line-")) {
          map.removeLayer(layer.id);
        }
      }
    }
    if (style?.sources) {
      for (const key of Object.keys(style.sources)) {
        if (key.startsWith("route-line-")) {
          map.removeSource(key);
        }
      }
    }

    routes.forEach((route) => {
      const color = STATUS_COLORS[route.status] ?? "#94a3b8";
      const isSelected = route.id === selectedRouteId;
      const sortedStops = [...route.stops].sort((a, b) => a.stopOrder - b.stopOrder);

      const lineCoords: [number, number][] = [];
      if (route.depot?.address?.latitude != null && route.depot?.address?.longitude != null) {
        lineCoords.push([route.depot.address.longitude, route.depot.address.latitude]);
      }
      sortedStops.forEach((stop) => {
        lineCoords.push([stop.longitude, stop.latitude]);
      });
      if (route.depot?.address?.latitude != null && lineCoords.length > 1) {
        lineCoords.push([route.depot!.address!.longitude, route.depot!.address!.latitude]);
      }

      const sourceId = `route-line-${route.id}`;
      const layerId = `route-line-${route.id}`;

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: lineCoords.length >= 2
            ? [{
                type: "Feature",
                geometry: { type: "LineString", coordinates: lineCoords },
                properties: { routeId: route.id },
              }]
            : [],
        },
      });

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": color,
          "line-width": isSelected ? 5 : 2,
          "line-opacity": isSelected ? 1.0 : 0.15,
        },
      });

      map.on("click", layerId, () => {
        onRouteSelectedRef.current(
          route.id === selectedRouteId ? null : route.id
        );
      });
    });

    // Async: fetch road-following paths for each route
    let cancelled = false;

    routes.forEach(async (route) => {
      if (route.stops.length === 0) return;

      const roadCoords = await fetchRoundTripPath({
        depot: route.depot?.address?.latitude != null
          ? { latitude: route.depot.address.latitude, longitude: route.depot.address.longitude }
          : null,
        stops: [...route.stops]
          .sort((a, b) => a.stopOrder - b.stopOrder)
          .map((s) => ({ latitude: s.latitude, longitude: s.longitude, stopOrder: s.stopOrder })),
      });

      if (cancelled) return;
      if (roadCoords.length < 2) return;

      const sourceId = `route-line-${route.id}`;
      const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "LineString", coordinates: roadCoords },
            properties: { routeId: route.id },
          }],
        });
      }
    });

    return () => { cancelled = true; };
  }, [routes, selectedRouteId, mapReady]);

  // Effect 2: Static markers — depot + stops (only re-runs when routes change)
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    staticMarkersRef.current.forEach((m) => {
      try { m.remove(); } catch (_) { /* noop */ }
    });
    staticMarkersRef.current = [];

    const allCoords: [number, number][] = [];

    routes.forEach((route) => {
      const color = STATUS_COLORS[route.status] ?? "#94a3b8";
      const isRouteSelected = route.id === selectedRouteId;
      const markerOpacity = isRouteSelected ? 1.0 : (selectedRouteId ? 0.25 : 1.0);
      const sortedStops = [...route.stops].sort((a, b) => a.stopOrder - b.stopOrder);

      if (route.depot?.address?.latitude != null && route.depot?.address?.longitude != null) {
        allCoords.push([route.depot.address.longitude, route.depot.address.latitude]);
      }
      sortedStops.forEach((stop) => {
        allCoords.push([stop.longitude, stop.latitude]);
      });

      // Depot marker
      if (route.depot?.address?.latitude != null && route.depot?.address?.longitude != null) {
        const el = document.createElement("div");
        el.style.cssText = `width:22px;height:22px;background:#f59e0b;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;color:#080c14;cursor:pointer;`;
        el.textContent = "D";

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([route.depot.address.longitude, route.depot.address.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(
              `<strong style="color:${color}">${route.name}</strong><br/>Depot: ${route.depot.name}`
            )
          )
          .addTo(map);

        staticMarkersRef.current.push(marker);
      }

      // Stop markers
      sortedStops.forEach((stop) => {
        const el = document.createElement("div");
        const size = 18;
        const fontSize = 9;
        const stopStyle = getStopMarkerStyle(stop.status, color);
        const textContent = stopStyle.text || String(stop.stopOrder);
        el.style.cssText = `width:${size}px;height:${size}px;background:${stopStyle.bg};border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;color:#080c14;cursor:pointer;opacity:${markerOpacity};`;
        el.textContent = textContent;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.longitude, stop.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(
              `<strong style="color:${color}">${route.name}</strong><br/>` +
              `<strong>#${stop.stopOrder}</strong> ${stop.trackingNumber}<br/>` +
              `<span style="color:${stopStyle.bg};font-weight:600">${stopStyle.label}</span><br/>` +
              `<span style="color:#8899aa">${stop.street1}, ${stop.city}</span>`
            )
          )
          .addTo(map);

        staticMarkersRef.current.push(marker);
      });
    });

    // Fit bounds
    if (allCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      allCoords.forEach((c) => bounds.extend(c as mapboxgl.LngLatLike));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, mapReady]);

  // Effect 3: Driver markers — create/update markers, animate smoothly
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const activeRoutes = routes.filter(
      (r) => r.status === RouteStatus.Dispatched || r.status === RouteStatus.InProgress
    );

    // Remove markers for routes no longer active
    const activeIds = new Set(activeRoutes.map((r) => r.id));
    for (const [id, marker] of driverMarkersRef.current) {
      if (!activeIds.has(id)) {
        try { marker.remove(); } catch (_) { /* noop */ }
        driverMarkersRef.current.delete(id);
      }
    }

    // Cancel animations for removed routes
    for (const [id, frameId] of animFramesRef.current) {
      if (!activeIds.has(id)) {
        cancelAnimationFrame(frameId);
        animFramesRef.current.delete(id);
      }
    }

    activeRoutes.forEach((route) => {
      const pos = driverPositions.get(route.id);
      if (!pos) return;

      const targetLng = pos.lng;
      const targetLat = pos.lat;
      const color = STATUS_COLORS[route.status] ?? "#94a3b8";

      const existing = driverMarkersRef.current.get(route.id);

      if (existing) {
        // Animate existing marker along road path to new position
        const currentLngLat = existing.getLngLat();
        const prevFrame = animFramesRef.current.get(route.id);
        if (prevFrame) cancelAnimationFrame(prevFrame);

        fetchRoutePath([
          [currentLngLat.lng, currentLngLat.lat],
          [targetLng, targetLat],
        ]).then((roadCoords) => {
          if (roadCoords.length < 2) {
            existing.setLngLat([targetLng, targetLat]);
            return;
          }

          // Compute cumulative distances along the road path
          const dists: number[] = [0];
          let totalDist = 0;
          for (let i = 1; i < roadCoords.length; i++) {
            const dx = roadCoords[i][0] - roadCoords[i - 1][0];
            const dy = roadCoords[i][1] - roadCoords[i - 1][1];
            totalDist += Math.sqrt(dx * dx + dy * dy);
            dists.push(totalDist);
          }

          const duration = 2000;
          const startTime = performance.now();

          const animate = (now: number) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            const targetDist = totalDist * ease;

            // Find the segment the marker is on
            let segIdx = 0;
            for (let i = 1; i < dists.length; i++) {
              if (dists[i] >= targetDist) { segIdx = i - 1; break; }
              if (i === dists.length - 1) segIdx = i - 1;
            }

            const segLen = dists[segIdx + 1] - dists[segIdx];
            const segT = segLen > 0 ? (targetDist - dists[segIdx]) / segLen : 0;

            const lng = roadCoords[segIdx][0] + (roadCoords[segIdx + 1][0] - roadCoords[segIdx][0]) * segT;
            const lat = roadCoords[segIdx][1] + (roadCoords[segIdx + 1][1] - roadCoords[segIdx][1]) * segT;
            existing.setLngLat([lng, lat]);

            if (t < 1) {
              animFramesRef.current.set(route.id, requestAnimationFrame(animate));
            } else {
              existing.setLngLat([targetLng, targetLat]);
              animFramesRef.current.delete(route.id);
            }
          };

          animFramesRef.current.set(route.id, requestAnimationFrame(animate));
        });
      } else {
        // Create new driver marker
        const driverEl = document.createElement("div");
        driverEl.style.cssText = `width:28px;height:28px;background:${color};border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;`;
        driverEl.textContent = "\uD83D\uDE9A";

        const deliveredCount = route.stops.filter(s => s.status === "DELIVERED").length;
        const totalStops = route.stops.length;

        const marker = new mapboxgl.Marker({ element: driverEl })
          .setLngLat([targetLng, targetLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(
              `<strong style="color:${color}">${route.name}</strong><br/>` +
              `<span>Driver: ${route.driverName ?? "Unassigned"}</span><br/>` +
              `<span>Progress: ${deliveredCount}/${totalStops} stops</span>` +
              (route.vehiclePlate ? `<br/><span style="color:#8899aa">Vehicle: ${route.vehiclePlate}</span>` : "")
            )
          )
          .addTo(map);

        driverMarkersRef.current.set(route.id, marker);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, driverPositions, mapReady]);

  // Map init
  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-86.78, 36.17],
      zoom: 10,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      staticMarkersRef.current.forEach((m) => {
        try { m.remove(); } catch (_) { /* noop */ }
      });
      driverMarkersRef.current.forEach((m) => {
        try { m.remove(); } catch (_) { /* noop */ }
      });
      driverMarkersRef.current.clear();
      animFramesRef.current.forEach((f) => cancelAnimationFrame(f));
      animFramesRef.current.clear();
      try { map.remove(); } catch (_) { /* noop */ }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (routes.length === 0) {
    return (
      <div
        style={{
          height: 500,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,.07)",
          background: "rgba(255,255,255,.02)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#4a5f7a",
          fontSize: ".85rem",
        }}
      >
        No routes with stops for this date
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 500,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,.07)",
      }}
    />
  );
}
