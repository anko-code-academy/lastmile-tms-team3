"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface StopData {
  parcelId: string;
  stopOrder: number;
  trackingNumber: string;
  latitude: number;
  longitude: number;
  address: string;
}

interface RouteMapProps {
  depotLocation: { latitude: number; longitude: number; name: string } | null;
  stops: StopData[];
  selectedStopId: string | null;
  onStopSelected: (parcelId: string | null) => void;
}

export default function RouteMap({
  depotLocation,
  stops,
  selectedStopId,
  onStopSelected,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Stable refs for callbacks
  const onStopSelectedRef = useRef(onStopSelected);
  onStopSelectedRef.current = onStopSelected;

  // Sync markers + route line when stops change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Remove old markers
    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch (_) {
        /* noop */
      }
    });
    markersRef.current = [];

    // Build route line coordinates: depot → stops → depot
    const lineCoords: [number, number][] = [];
    if (depotLocation) {
      lineCoords.push([depotLocation.longitude, depotLocation.latitude]);
    }

    // Sort stops by order for the line
    const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder);

    // Add depot marker
    if (depotLocation) {
      const depotEl = document.createElement("div");
      depotEl.style.cssText =
        "width:28px;height:28px;background:#f59e0b;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#080c14;";
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
      const el = document.createElement("div");
      el.style.cssText = isSelected
        ? "width:24px;height:24px;background:#f59e0b;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px #f59e0b,0 0 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:#080c14;cursor:pointer;"
        : "width:20px;height:20px;background:rgba(245,158,11,.85);border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;color:#080c14;cursor:pointer;";
      el.textContent = String(stop.stopOrder);

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
      lineCoords.push([stop.longitude, stop.latitude]);
    });

    // Close route line back to depot
    if (depotLocation && lineCoords.length > 1) {
      lineCoords.push([depotLocation.longitude, depotLocation.latitude]);
    }

    // Update route line source
    const routeSource = map.getSource("route-line") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (routeSource) {
      routeSource.setData({
        type: "FeatureCollection",
        features:
          lineCoords.length >= 2
            ? [
                {
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: lineCoords,
                  },
                  properties: {},
                },
              ]
            : [],
      });
    }

    // Fit bounds
    if (lineCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      lineCoords.forEach((c) => bounds.extend(c as mapboxgl.LngLatLike));
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 });
    }
  }, [stops, selectedStopId, depotLocation]);

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
          "line-color": "#f59e0b",
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
          color: "#4a5f7a",
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
