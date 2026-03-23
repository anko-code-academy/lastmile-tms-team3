"use client";

import { useState } from "react";
import { useDepots, useCreateDepot, useUpdateDepot, useDeleteDepot } from "@/lib/hooks/useDepots";
import { DepotDto, CreateDepotDto, DailyAvailabilityDto, DayOffDto } from "@/lib/types/depot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Convert "HH:mm" to ISO 8601 duration format "PT#{hours}H#{minutes}M"
function toDuration(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  return `PT${hours}H${minutes}M`;
}

// Convert ISO 8601 duration (e.g., "PT9H", "PT9H30M") to "HH:mm" format
function fromDuration(duration: string): string {
  if (!duration) return "";
  // Parse PT9H or PT9H30M format
  const hoursMatch = duration.match(/PT(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);
  const hours = hoursMatch ? hoursMatch[1] : "00";
  const minutes = minutesMatch ? minutesMatch[1] : "00";
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

const defaultSchedule: DailyAvailabilityDto[] = DAYS_OF_WEEK.map((day) => ({
  dayOfWeek: day,
  startTime: "09:00",
  endTime: "17:00",
}));

const emptyOperatingHours = {
  schedule: defaultSchedule,
  daysOff: [],
};

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
    operatingHours: emptyOperatingHours,
  });
  const [newDayOff, setNewDayOff] = useState({ date: "", reason: "", isPaid: false });

  const handleScheduleChange = (day: string, field: "startTime" | "endTime", value: string) => {
    setFormData({
      ...formData,
      operatingHours: {
        ...formData.operatingHours!,
        schedule: formData.operatingHours!.schedule.map((d) =>
          d.dayOfWeek === day ? { ...d, [field]: value } : d
        ),
      },
    });
  };

  const handleToggleDay = (day: string, isOpen: boolean) => {
    setFormData({
      ...formData,
      operatingHours: {
        ...formData.operatingHours!,
        schedule: formData.operatingHours!.schedule.map((d) =>
          d.dayOfWeek === day
            ? { ...d, startTime: isOpen ? "09:00" : undefined, endTime: isOpen ? "17:00" : undefined }
            : d
        ),
      },
    });
  };

  const handleAddDayOff = () => {
    if (!newDayOff.date) return;
    const dayOff: DayOffDto = {
      date: newDayOff.date,
      reason: newDayOff.reason || undefined,
      isPaid: newDayOff.isPaid,
    };
    setFormData({
      ...formData,
      operatingHours: {
        ...formData.operatingHours!,
        daysOff: [...formData.operatingHours!.daysOff, dayOff],
      },
    });
    setNewDayOff({ date: "", reason: "", isPaid: false });
  };

  const handleRemoveDayOff = (date: string) => {
    setFormData({
      ...formData,
      operatingHours: {
        ...formData.operatingHours!,
        daysOff: formData.operatingHours!.daysOff.filter((d) => d.date !== date),
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert schedule times to ISO 8601 duration format for GraphQL
    const schedule = formData.operatingHours?.schedule.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime ? toDuration(d.startTime) : null,
      endTime: d.endTime ? toDuration(d.endTime) : null,
    }));

    const payload = {
      ...formData,
      operatingHours: schedule?.some((d) => d.startTime)
        ? { schedule, daysOff: formData.operatingHours?.daysOff || [] }
        : undefined,
    };

    try {
      if (editingDepot) {
        await updateMutation.mutateAsync({
          id: editingDepot.id,
          ...payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
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
        operatingHours: emptyOperatingHours,
      });
    } catch (err) {
      console.error("Failed to save depot:", err);
    }
  };

  const handleEdit = (depot: DepotDto) => {
    setEditingDepot(depot);

    // Convert ISO duration format back to "HH:mm" for editing
    const schedule = depot.operatingHours?.schedule.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime ? fromDuration(d.startTime) : undefined,
      endTime: d.endTime ? fromDuration(d.endTime) : undefined,
    })) || defaultSchedule;

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
      operatingHours: depot.operatingHours
        ? { schedule, daysOff: depot.operatingHours.daysOff }
        : emptyOperatingHours,
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
      operatingHours: emptyOperatingHours,
    });
    setNewDayOff({ date: "", reason: "", isPaid: false });
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

              {/* Operating Hours Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-4">Operating Hours</h3>

                {/* Schedule */}
                <div className="space-y-2 mb-4">
                  <Label>Weekly Schedule</Label>
                  {formData.operatingHours?.schedule.map((day) => (
                    <div key={day.dayOfWeek} className="flex items-center gap-4">
                      <span className="w-28 text-sm">{day.dayOfWeek}</span>
                      <input
                        type="checkbox"
                        checked={!!day.startTime}
                        onChange={(e) => handleToggleDay(day.dayOfWeek, e.target.checked)}
                        className="rounded"
                      />
                      {day.startTime && (
                        <>
                          <Input
                            type="time"
                            value={day.startTime}
                            onChange={(e) => handleScheduleChange(day.dayOfWeek, "startTime", e.target.value)}
                            className="w-32"
                          />
                          <span>to</span>
                          <Input
                            type="time"
                            value={day.endTime}
                            onChange={(e) => handleScheduleChange(day.dayOfWeek, "endTime", e.target.value)}
                            className="w-32"
                          />
                        </>
                      )}
                      {!day.startTime && <span className="text-gray-400 text-sm">Closed</span>}
                    </div>
                  ))}
                </div>

                {/* Days Off */}
                <div className="space-y-2">
                  <Label>Days Off</Label>
                  <div className="flex gap-2 items-start">
                    <Input
                      type="date"
                      value={newDayOff.date}
                      onChange={(e) => setNewDayOff({ ...newDayOff, date: e.target.value })}
                      className="w-40"
                    />
                    <Input
                      placeholder="Reason (optional)"
                      value={newDayOff.reason}
                      onChange={(e) => setNewDayOff({ ...newDayOff, reason: e.target.value })}
                      className="w-48"
                    />
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={newDayOff.isPaid}
                        onChange={(e) => setNewDayOff({ ...newDayOff, isPaid: e.target.checked })}
                      />
                      Paid
                    </label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddDayOff}>
                      Add
                    </Button>
                  </div>

                  {(formData.operatingHours?.daysOff.length ?? 0) > 0 && (
                    <div className="mt-2 space-y-1">
                      {formData.operatingHours?.daysOff.map((dayOff) => (
                        <div key={dayOff.date} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                          <span>{dayOff.date}</span>
                          {dayOff.reason && <span className="text-gray-500">- {dayOff.reason}</span>}
                          {dayOff.isPaid && <span className="text-green-600 text-xs">(Paid)</span>}
                          <button
                            type="button"
                            onClick={() => handleRemoveDayOff(dayOff.date)}
                            className="ml-auto text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                  {depot.operatingHours?.schedule && (
                    <p className="text-xs text-gray-500 mt-1">
                      Hours: {depot.operatingHours.schedule.filter(d => d.startTime).length} days configured
                      {depot.operatingHours.daysOff.length > 0 && `, ${depot.operatingHours.daysOff.length} days off`}
                    </p>
                  )}
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