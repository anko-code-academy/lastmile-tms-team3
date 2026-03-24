"use server";
import { gqlFetch } from "@/lib/graphql/fetch";
import {
  CREATE_VEHICLE,
  GET_VEHICLE,
  GET_VEHICLES,
  UPDATE_VEHICLE,
  UPDATE_VEHICLE_STATUS,
} from "@/lib/graphql/queries/vehicles";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  Vehicle,
  VehicleStatus,
} from "@/lib/types/vehicle";

interface VehiclesResponse {
  vehicles: Vehicle[];
}

interface VehicleResponse {
  vehicle: Vehicle | null;
}

type UpdateVehicleStatusResponse = {
  id: string;
  status: VehicleStatus;
  lastModifiedAt: string;
};

export async function getVehiclesAction(): Promise<Vehicle[]> {
  const data = await gqlFetch<VehiclesResponse>(GET_VEHICLES);
  return data.vehicles;
}

export async function getVehicleAction(id: string): Promise<Vehicle | null> {
  const data = await gqlFetch<VehicleResponse>(GET_VEHICLE, { id });
  return data.vehicle;
}

export async function updateVehicleAction(
  id: string,
  input: UpdateVehicleInput,
): Promise<{ error?: string; vehicleId?: string }> {
  try {
    const data = await gqlFetch<{ updateVehicle: Vehicle }>(UPDATE_VEHICLE, {
      input: { id, ...input },
    });
    return { vehicleId: data.updateVehicle.id };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : "Failed to update vehicle",
    };
  }
}

export async function setVehicleStatusAction(
  id: string,
  status: VehicleStatus,
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ updateVehicleStatus: UpdateVehicleStatusResponse }>(
      UPDATE_VEHICLE_STATUS,
      {
        input: { id, status },
      },
    );
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update vehicle status",
    };
  }
}

export async function createVehicleAction(
  input: CreateVehicleInput,
): Promise<{ error?: string; vehicleId?: string }> {
  try {
    const data = await gqlFetch<{ createVehicle: Vehicle }>(CREATE_VEHICLE, {
      input,
    });
    return { vehicleId: data.createVehicle.id };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : "Failed to create vehicle",
    };
  }
}
