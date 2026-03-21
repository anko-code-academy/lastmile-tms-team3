"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { Feature, FeatureCollection, Polygon } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import { useZones, useCreateZone, useUpdateZone, useDeleteZone } from "@/lib/hooks/useZones";
import { useDepots } from "@/lib/hooks/useDepots";
import { ZoneDto, CreateZoneDto, GeoJsonPointDto } from "@/lib/types/zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Configure Mapbox - use env variable or public token for demo
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiZGVtby11c2VyIiwiYSI6ImNscWt4eTEyMDAwMDEycXBmbzJ0aDl6ZjkifQ.demo";

export default function ZonesPage() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const drawnFeatures = useRef<GeoJsonPointDto[]>([]);

  const { data: zones, isLoading: zonesLoading } = useZones(undefined, true);
  const { data: depots, isLoading: depotsLoading } = useDepots(true);
  const createMutation = useCreateZone();
  const updateMutation = useUpdateZone();
  const deleteMutation = useDeleteZone();

  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneDto | null>(null);
  const [formData, setFormData] = useState<CreateZoneDto>({
    name: "",
    depotId: "",
    boundary: null,
    isActive: true,
  });

  // Update polygon visualization on map
  const updatePolygonVisualization = useCallback(() => {
    if (!map.current || drawnFeatures.current.length < 3) return;

    const polygonFeature: Feature<Polygon> = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            ...drawnFeatures.current.map((p) => [p.longitude, p.latitude]),
            [drawnFeatures.current[0].longitude, drawnFeatures.current[0].latitude],
          ],
        ],
      },
      properties: {},
    };

    const sourceId = "drawn-polygon";

    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(polygonFeature);
    } else {
      map.current.addSource(sourceId, {
        type: "geojson",
        data: polygonFeature,
      });

      map.current.addLayer({
        id: "polygon-fill",
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.3,
        },
      });

      map.current.addLayer({
        id: "polygon-outline",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
        },
      });
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-74.006, 40.7128], // Default to NYC
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add click handler for drawing polygon
    map.current.on("click", (e) => {
      if (!showForm) return;

      const point: GeoJsonPointDto = {
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
      };

      drawnFeatures.current.push(point);
      updatePolygonVisualization();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [showForm, updatePolygonVisualization]);

  // Draw existing zone boundary when editing
  useEffect(() => {
    if (!editingZone?.boundary || !map.current) return;

    drawnFeatures.current = [...editingZone.boundary.coordinates];
    updatePolygonVisualization();
  }, [editingZone, updatePolygonVisualization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (drawnFeatures.current.length < 4) {
      alert("Please draw at least 4 points to create a polygon");
      return;
    }

    const boundary = {
      coordinates: drawnFeatures.current,
    };

    try {
      if (editingZone) {
        await updateMutation.mutateAsync({
          id: editingZone.id,
          ...formData,
          boundary,
        });
      } else {
        await createMutation.mutateAsync({
          ...formData,
          boundary,
        });
      }

      handleCancel();
    } catch (err) {
      console.error("Failed to save zone:", err);
    }
  };

  const handleEdit = (zone: ZoneDto) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      depotId: zone.depotId,
      isActive: zone.isActive,
      boundary: zone.boundary,
    });
    setShowForm(true);

    // Reset drawn features
    drawnFeatures.current = zone.boundary
      ? [...zone.boundary.coordinates]
      : [];
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this zone?")) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error("Failed to delete zone:", err);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingZone(null);
    setFormData({
      name: "",
      depotId: "",
      boundary: null,
      isActive: true,
    });
    drawnFeatures.current = [];

    // Clear polygon from map
    if (map.current?.getSource("drawn-polygon")) {
      const emptyCollection: FeatureCollection = {
        type: "FeatureCollection",
        features: [],
      };
      (map.current.getSource("drawn-polygon") as mapboxgl.GeoJSONSource).setData(emptyCollection);
    }
  };

  const clearDrawing = () => {
    drawnFeatures.current = [];
    if (map.current?.getSource("drawn-polygon")) {
      const emptyCollection: FeatureCollection = {
        type: "FeatureCollection",
        features: [],
      };
      (map.current.getSource("drawn-polygon") as mapboxgl.GeoJSONSource).setData(emptyCollection);
    }
  };

  if (zonesLoading || depotsLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Zones</h1>
        <div className="space-x-2">
          <Button onClick={() => router.push("/")} variant="outline">
            Back to Dashboard
          </Button>
          <Button onClick={() => setShowForm(true)}>Add Zone</Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingZone ? "Edit Zone" : "Create Zone"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="depot">Depot</Label>
                <select
                  id="depot"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.depotId}
                  onChange={(e) => setFormData({ ...formData, depotId: e.target.value })}
                  required
                >
                  <option value="">Select a depot</option>
                  {depots?.map((depot) => (
                    <option key={depot.id} value={depot.id}>
                      {depot.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <Label htmlFor="isActive" className="font-normal">
                  Active
                </Label>
              </div>

              <div>
                <Label>Zone Boundary</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Click on the map to draw polygon points (minimum 4 points required)
                </p>
                <div ref={mapContainer} className="h-80 rounded-md border" />
                <Button type="button" variant="outline" size="sm" onClick={clearDrawing} className="mt-2">
                  Clear Drawing
                </Button>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {zones?.map((zone) => (
          <Card key={zone.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{zone.name}</h3>
                  <p className="text-sm text-gray-600">Depot: {zone.depotName}</p>
                  <p className="text-sm">
                    Status:{" "}
                    <span className={zone.isActive ? "text-green-600" : "text-red-600"}>
                      {zone.isActive ? "Active" : "Inactive"}
                    </span>
                  </p>
                  {zone.boundary && (
                    <p className="text-sm text-gray-500">
                      Points: {zone.boundary.coordinates.length}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(zone)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(zone.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {zones?.length === 0 && (
          <p className="text-center text-gray-500 py-8">No zones found. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}