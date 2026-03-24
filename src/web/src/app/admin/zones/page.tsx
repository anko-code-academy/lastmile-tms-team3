"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useZones, useCreateZone, useUpdateZone, useDeleteZone } from "@/lib/hooks/useZones";
import { useDepots } from "@/lib/hooks/useDepots";
import { ZoneDto, CreateZoneDto, GeoJsonPointDto } from "@/lib/types/zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GeoJsonFeature {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties?: Record<string, unknown>;
}

interface GeoJsonFile {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export default function ZonesPage() {
  const router = useRouter();

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
  const [manualPoints, setManualPoints] = useState<GeoJsonPointDto[]>([]);
  const [newPoint, setNewPoint] = useState({ longitude: "", latitude: "" });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string) as GeoJsonFile;

        if (geojson.type !== "FeatureCollection" || !geojson.features.length) {
          alert("Invalid GeoJSON: must be a FeatureCollection with at least one feature");
          return;
        }

        const feature = geojson.features[0];
        let coordinates: number[][][];

        if (feature.geometry.type === "Polygon") {
          coordinates = feature.geometry.coordinates as number[][][];
        } else if (feature.geometry.type === "MultiPolygon") {
          // Use the first polygon from MultiPolygon
          coordinates = feature.geometry.coordinates[0] as number[][][];
        } else {
          alert(`Invalid geometry type: ${feature.geometry.type}. Expected Polygon or MultiPolygon.`);
          return;
        }

        // Extract points from the first ring (outer ring) of the polygon
        const ring = coordinates[0];
        const points: GeoJsonPointDto[] = ring.map((coord) => ({
          longitude: coord[0],
          latitude: coord[1],
        }));

        // Remove the closing point if it's the same as the first point
        if (
          points.length > 1 &&
          points[0].longitude === points[points.length - 1].longitude &&
          points[0].latitude === points[points.length - 1].latitude
        ) {
          points.pop();
        }

        setFormData({ ...formData, boundary: { coordinates: points } });
        setManualPoints(points);
        alert(`Loaded ${points.length} polygon points from GeoJSON`);
      } catch (err) {
        console.error("Failed to parse GeoJSON:", err);
        alert("Failed to parse GeoJSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleAddPoint = () => {
    const lng = parseFloat(newPoint.longitude);
    const lat = parseFloat(newPoint.latitude);

    if (isNaN(lng) || isNaN(lat)) {
      alert("Please enter valid longitude and latitude values");
      return;
    }

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      alert("Longitude must be between -180 and 180, latitude between -90 and 90");
      return;
    }

    const point: GeoJsonPointDto = { longitude: lng, latitude: lat };
    const newPoints = [...manualPoints, point];
    setManualPoints(newPoints);
    setFormData({ ...formData, boundary: { coordinates: newPoints } });
    setNewPoint({ longitude: "", latitude: "" });
  };

  const handleRemovePoint = (index: number) => {
    const newPoints = manualPoints.filter((_, i) => i !== index);
    setManualPoints(newPoints);
    setFormData({ ...formData, boundary: newPoints.length > 0 ? { coordinates: newPoints } : null });
  };

  const handleClearPoints = () => {
    setManualPoints([]);
    setFormData({ ...formData, boundary: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.boundary || formData.boundary.coordinates.length < 3) {
      alert("Zone boundary must have at least 3 points");
      return;
    }

    try {
      if (editingZone) {
        await updateMutation.mutateAsync({
          id: editingZone.id,
          ...formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
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
    setManualPoints(zone.boundary?.coordinates || []);
    setShowForm(true);
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
    setManualPoints([]);
    setNewPoint({ longitude: "", latitude: "" });
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

              {/* Zone Boundary - GeoJSON Upload */}
              <div>
                <Label>Zone Boundary</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Upload a GeoJSON file or manually add polygon coordinates
                </p>

                {/* File Upload */}
                <div className="mb-4">
                  <input
                    type="file"
                    accept=".json,.geojson"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Supported: GeoJSON files with Polygon or MultiPolygon features
                  </p>
                </div>

                {/* Manual Entry */}
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium">Or add points manually</Label>
                  <div className="flex gap-2 mt-2 items-end">
                    <div>
                      <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        placeholder="e.g. -74.006"
                        value={newPoint.longitude}
                        onChange={(e) => setNewPoint({ ...newPoint, longitude: e.target.value })}
                        className="w-36"
                      />
                    </div>
                    <div>
                      <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        placeholder="e.g. 40.7128"
                        value={newPoint.latitude}
                        onChange={(e) => setNewPoint({ ...newPoint, latitude: e.target.value })}
                        className="w-36"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddPoint}>
                      Add Point
                    </Button>
                  </div>
                </div>

                {/* Points List */}
                {manualPoints.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm">Polygon Points ({manualPoints.length})</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleClearPoints}>
                        Clear All
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Longitude</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Latitude</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-500">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manualPoints.map((point, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-1 text-gray-500">{index + 1}</td>
                              <td className="px-3 py-1 font-mono text-xs">{point.longitude.toFixed(6)}</td>
                              <td className="px-3 py-1 font-mono text-xs">{point.latitude.toFixed(6)}</td>
                              <td className="px-3 py-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePoint(index)}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {manualPoints.length >= 3
                        ? `Polygon ready with ${manualPoints.length} points`
                        : `Add ${3 - manualPoints.length} more point(s) to create a polygon`}
                    </p>
                  </div>
                )}
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
                      Boundary: {zone.boundary.coordinates.length} points
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