"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  Vehicle,
} from "@/lib/types/vehicle";
import type { DepotOption } from "@/lib/actions/depots";

const vehicleSchema = z.object({
  registrationPlate: z.string().min(1, "Plate is required").max(20),
  type: z.enum(["VAN", "CAR", "BIKE"]),
  depotId: z.string().min(1, "Depot is required"),
  parcelCapacity: z.number().int().min(1, "Must be at least 1"),
  weightCapacity: z.number().min(1, "Must be at least 1"),
  weightUnit: z.enum(["LB", "KG"]),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "RETIRED"]).optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  vehicle?: Vehicle;
  depots: DepotOption[];
  /** If true, fields are disabled and only an Edit button is shown. */
  isReadOnly?: boolean;
  /** Called with vehicleId on success. If undefined, no navigation occurs. */
  onSuccess?: (vehicleId: string) => void;
  /** Submits to the backend and returns result. */
  onSubmit: (
    input: CreateVehicleInput | UpdateVehicleInput,
  ) => Promise<{ error?: string; vehicleId?: string } | void>;
}

export function VehicleForm({
  vehicle,
  depots,
  isReadOnly = false,
  onSuccess,
  onSubmit,
}: VehicleFormProps) {
  const router = useRouter();
  const isCreate = !vehicle;
  // When viewing an existing vehicle (isReadOnly=true), start in view mode
  const [editing, setEditing] = useState(!isCreate && !isReadOnly);
  const isDisabled = !isCreate && !editing;

  // Tracks what is currently displayed in view mode — used to revert on Cancel
  const committedValues = useRef<VehicleFormValues>(
    vehicle
      ? {
          registrationPlate: vehicle.registrationPlate,
          type: vehicle.type as "VAN" | "CAR" | "BIKE",
          depotId: vehicle.depotId ?? "",
          parcelCapacity: vehicle.parcelCapacity,
          weightCapacity: vehicle.weightCapacity,
          weightUnit: vehicle.weightUnit as "LB" | "KG",
        }
      : {
          type: "VAN",
          depotId: depots[0]?.id ?? "",
          weightUnit: "KG",
          parcelCapacity: 1,
          weightCapacity: 1,
          registrationPlate: "",
        },
  );

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues, unknown, VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle
      ? {
          registrationPlate: vehicle.registrationPlate,
          type: vehicle.type as "VAN" | "CAR" | "BIKE",
          depotId: vehicle.depotId ?? "",
          parcelCapacity: vehicle.parcelCapacity,
          weightCapacity: vehicle.weightCapacity,
          weightUnit: vehicle.weightUnit as "LB" | "KG",
        }
      : {
          type: "VAN" as const,
          depotId: depots[0]?.id ?? "",
          weightUnit: "KG" as const,
          parcelCapacity: 1,
          weightCapacity: 1,
        },
  });

  async function handleFormSubmit(data: VehicleFormValues) {
    const input: CreateVehicleInput | UpdateVehicleInput = isCreate
      ? (data as unknown as CreateVehicleInput)
      : {
          registrationPlate: data.registrationPlate,
          parcelCapacity: data.parcelCapacity,
          weightCapacity: data.weightCapacity,
          depotId: data.depotId,
        };
    const result = await onSubmit(input);
    if (result?.error) {
      setError("root", { message: result.error });
      return;
    }

    if (!isCreate) {
      clearErrors("root");
      committedValues.current = data;
      reset(committedValues.current);
      setEditing(false);
      return;
    }

    if (result?.vehicleId) {
      if (onSuccess) {
        onSuccess(result.vehicleId);
      } else {
        router.push(`/vehicles/${result.vehicleId}`);
      }
    }
  }

  function handleEditClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    clearErrors("root");
    setEditing(true);
  }

  function handleCancel() {
    if (!isCreate) {
      reset(committedValues.current);
      setEditing(false);
    } else {
      router.back();
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="space-y-6"
    >
      {/* Registration Plate */}
      <div className="space-y-2">
        <Label htmlFor="registrationPlate">Registration Plate *</Label>
        <Input
          id="registrationPlate"
          placeholder="ABC-1234"
          disabled={isDisabled}
          {...register("registrationPlate")}
          aria-invalid={!!errors.registrationPlate}
        />
        {errors.registrationPlate && (
          <p className="text-xs text-destructive">
            {errors.registrationPlate.message}
          </p>
        )}
      </div>

      {/* Depot */}
      <div className="space-y-2">
        <Label htmlFor="depotId">Depot *</Label>
        <select
          id="depotId"
          disabled={isDisabled}
          {...register("depotId")}
          className="flex h-8 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-invalid={!!errors.depotId}
        >
          <option value="">Select a depot...</option>
          {depots.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {errors.depotId && (
          <p className="text-xs text-destructive">{errors.depotId.message}</p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Vehicle Type *</Label>
        <select
          id="type"
          disabled={isDisabled || !isCreate}
          {...register("type")}
          className="flex h-8 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="VAN">Van</option>
          <option value="CAR">Car</option>
          <option value="BIKE">Bike</option>
        </select>
        {errors.type && (
          <p className="text-xs text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Capacities */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="parcelCapacity">Parcel Capacity *</Label>
          <Input
            id="parcelCapacity"
            type="number"
            min={1}
            disabled={isDisabled}
            {...register("parcelCapacity", { valueAsNumber: true })}
            aria-invalid={!!errors.parcelCapacity}
          />
          {errors.parcelCapacity && (
            <p className="text-xs text-destructive">
              {errors.parcelCapacity.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="weightCapacity">Weight Capacity *</Label>
          <div className="flex gap-2">
            <Input
              id="weightCapacity"
              type="number"
              min={1}
              disabled={isDisabled}
              className="flex-1"
              {...register("weightCapacity", { valueAsNumber: true })}
              aria-invalid={!!errors.weightCapacity}
            />
            <select
              disabled={isDisabled || !isCreate}
              {...register("weightUnit")}
              className="flex h-8 rounded-lg border border-input bg-background px-2 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="KG">kg</option>
              <option value="LB">lb</option>
            </select>
          </div>
          {errors.weightCapacity && (
            <p className="text-xs text-destructive">
              {errors.weightCapacity.message}
            </p>
          )}
        </div>
      </div>

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {isCreate ? (
          <>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Vehicle"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </>
        ) : isDisabled ? (
          <Button type="button" onClick={handleEditClick}>
            Edit
          </Button>
        ) : (
          <>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
