"use client";

import { useState } from "react";
import { useDepots, useCreateDepot, useUpdateDepot, useDeleteDepot } from "@/lib/hooks/useDepots";
import { DepotDto, CreateDepotDto } from "@/lib/types/depot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function DepotsPage() {
  const router = useRouter();
  const { data: depots, isLoading, error } = useDepots(true);
  const createMutation = useCreateDepot();
  const updateMutation = useUpdateDepot();
  const deleteMutation = useDeleteDepot();

  const [showForm, setShowForm] = useState(false);
  const [editingDepot, setEditingDepot] = useState<DepotDto | null>(null);
  const [formData, setFormData] = useState<CreateDepotDto>({
    name: "",
    address: {
      street1: "",
      street2: "",
      city: "",
      state: "",
      postalCode: "",
      countryCode: "US",
      isResidential: false,
    },
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingDepot) {
        await updateMutation.mutateAsync({
          id: editingDepot.id,
          ...formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }

      setShowForm(false);
      setEditingDepot(null);
      setFormData({
        name: "",
        address: {
          street1: "",
          street2: "",
          city: "",
          state: "",
          postalCode: "",
          countryCode: "US",
          isResidential: false,
        },
        isActive: true,
      });
    } catch (err) {
      console.error("Failed to save depot:", err);
    }
  };

  const handleEdit = (depot: DepotDto) => {
    setEditingDepot(depot);
    setFormData({
      name: depot.name,
      address: {
        street1: depot.address.street1,
        street2: depot.address.street2 || "",
        city: depot.address.city,
        state: depot.address.state,
        postalCode: depot.address.postalCode,
        countryCode: depot.address.countryCode,
        isResidential: depot.address.isResidential,
      },
      isActive: depot.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this depot?")) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error("Failed to delete depot:", err);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDepot(null);
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8">Error: {String(error)}</div>;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Depots</h1>
        <div className="space-x-2">
          <Button onClick={() => router.push("/")} variant="outline">
            Back to Dashboard
          </Button>
          <Button onClick={() => setShowForm(true)}>
            Add Depot
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {editingDepot ? "Edit Depot" : "Create Depot"}
            </CardTitle>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="street1">Street Address</Label>
                  <Input
                    id="street1"
                    value={formData.address.street1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street1: e.target.value },
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="street2">Street Address 2</Label>
                  <Input
                    id="street2"
                    value={formData.address.street2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street2: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.address.postalCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, postalCode: e.target.value },
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="countryCode">Country Code</Label>
                  <Input
                    id="countryCode"
                    value={formData.address.countryCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, countryCode: e.target.value },
                      })
                    }
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="isResidential">Type</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="isResidential"
                      checked={formData.address.isResidential}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, isResidential: e.target.checked },
                        })
                      }
                    />
                    <Label htmlFor="isResidential" className="font-normal">
                      Residential Address
                    </Label>
                  </div>
                </div>
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
        {depots?.map((depot) => (
          <Card key={depot.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{depot.name}</h3>
                  <p className="text-sm text-gray-600">
                    {depot.address.street1}
                    {depot.address.street2 && `, ${depot.address.street2}`}
                    , {depot.address.city}, {depot.address.state} {depot.address.postalCode}
                  </p>
                  <p className="text-sm">
                    Status: <span className={depot.isActive ? "text-green-600" : "text-red-600"}>
                      {depot.isActive ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(depot)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(depot.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {depots?.length === 0 && (
          <p className="text-center text-gray-500 py-8">No depots found. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}