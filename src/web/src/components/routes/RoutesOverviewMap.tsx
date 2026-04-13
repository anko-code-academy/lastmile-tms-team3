"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { RouteMapData } from "@/lib/types/route";
import { RouteStatus } from "@/lib/types/route";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const STATUS_COLORS: Record<RouteStatus, string> = {
  [RouteStatus.Draft]: "#94a3b8",
  [RouteStatus.Dispatched]: "#3b82f6",
  [RouteStatus.InProgress]: "#f59e0b",
  [RouteStatus.Completed]: "#22c55e",
};

interface RoutesOverviewMapProps {
  routes: RouteMapData[];
  selectedRouteId: string | null;
  onRouteSelected: (id: string | null) => void;
}

export default function RoutesOverviewMap({
  routes,
  selectedRouteId,
  onRouteSelected,
}: RoutesOverviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const onRouteSelectedRef = useRef(onRouteSelected);
  onRouteSelectedRef.current = onRouteSelected;

  // Sync layers + markers when routes change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Remove old markers + popups
    markersRef.current.forEach((m) => {
      try { m.remove(); } catch (_) { /* noop */ }
    });
    markersRef.current = [];

    // Remove old route sources + layers
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

    const allCoords: [number, number][] = [];

    routes.forEach((route) => {
      const color = STATUS_COLORS[route.status] ?? "#94a3b8";
      const isSelected = route.id === selectedRouteId;
      const sortedStops = [...route.stops].sort((a, b) => a.stopOrder - b.stopOrder);

      // Build line coordinates: depot -> stops -> depot
      const lineCoords: [number, number][] = [];
      if (route.depot?.address?.latitude != null && route.depot?.address?.longitude != null) {
        lineCoords.push([route.depot.address.longitude, route.depot.address.latitude]);
      }

      sortedStops.forEach((stop) => {
        lineCoords.push([stop.longitude, stop.latitude]);
      });

      // Close loop back to depot
      if (route.depot?.address?.latitude != null && lineCoords.length > 1) {
        lineCoords.push([route.depot!.address!.longitude, route.depot!.address!.latitude]);
      }

      allCoords.push(...lineCoords);

      // Add route line source + layer
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
          "line-width": isSelected ? 4 : 2.5,
          "line-opacity": isSelected ? 0.9 : 0.6,
        },
      });

      // Click on route line to select
      map.on("click", layerId, () => {
        onRouteSelectedRef.current(
          route.id === selectedRouteId ? null : route.id
        );
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

        markersRef.current.push(marker);
      }

      // Stop markers
      sortedStops.forEach((stop) => {
        const el = document.createElement("div");
        const size = isSelected ? 18 : 14;
        const fontSize = isSelected ? 9 : 8;
        el.style.cssText = `width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;color:#080c14;cursor:pointer;`;
        el.textContent = String(stop.stopOrder);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.longitude, stop.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 10, closeButton: false }).setHTML(
              `<strong style="color:${color}">${route.name}</strong><br/>` +
              `<strong>#${stop.stopOrder}</strong> ${stop.trackingNumber}<br/>` +
              `<span style="color:#8899aa">${stop.street1}, ${stop.city}</span>`
            )
          )
          .addTo(map);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onRouteSelectedRef.current(
            route.id === selectedRouteId ? null : route.id
          );
        });

        markersRef.current.push(marker);
      });
    });

    // Fit bounds to show all routes
    if (allCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      allCoords.forEach((c) => bounds.extend(c as mapboxgl.LngLatLike));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
    }
  }, [routes, selectedRouteId]);

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
      mapRef.current = map;
    });

    return () => {
      markersRef.current.forEach((m) => {
        try { m.remove(); } catch (_) { /* noop */ }
      });
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
