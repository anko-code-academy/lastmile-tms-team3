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
  VehicleType,
} from "@/lib/types/vehicle";

export interface VehicleFilter {
  depotId?: { eq: string };
  status?: { eq: VehicleStatus };
  type?: { eq: VehicleType };
}

export type VehicleSortField =
  | "createdAt"
  | "registrationPlate"
  | "status"
  | "type";

export interface SearchVehiclesInput {
  filter?: VehicleFilter;
  search?: string | null;
  sortField?: VehicleSortField;
  sortDirection?: "ASC" | "DESC";
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
}

export interface SearchVehiclesResult {
  items: Vehicle[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
}

interface VehiclesResponse {
  vehicles: {
    nodes: Vehicle[];
  };
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
  return data.vehicles.nodes;
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

interface VehiclesConnectionResponse {
  vehicles: {
    nodes: Vehicle[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

export async function searchVehiclesAction(
  input: SearchVehiclesInput,
): Promise<SearchVehiclesResult> {
  const data = await gqlFetch<VehiclesConnectionResponse>(GET_VEHICLES, {
    first: input.first ?? null,
    after: input.after ?? null,
    last: input.last ?? null,
    before: input.before ?? null,
    search: normalizeSearch(input.search),
    where: buildVehicleWhere(input.filter),
    order: buildVehicleOrder(input.sortField, input.sortDirection),
  });

  const { nodes, pageInfo, totalCount } = data.vehicles;
  return {
    items: nodes,
    totalCount,
    hasNextPage: pageInfo.hasNextPage,
    hasPreviousPage: pageInfo.hasPreviousPage,
    nextCursor: pageInfo.endCursor,
    previousCursor: pageInfo.startCursor,
  };
}

function normalizeSearch(search?: string | null): string | null {
  if (!search) {
    return null;
  }

  const trimmed = search.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildVehicleWhere(filter?: VehicleFilter) {
  if (!filter) {
    return null;
  }

  return Object.keys(filter).length > 0 ? filter : null;
}

function buildVehicleOrder(
  sortField: VehicleSortField = "createdAt",
  sortDirection: "ASC" | "DESC" = "DESC",
) {
  switch (sortField) {
    case "registrationPlate":
      return [{ registrationPlate: sortDirection }];
    case "status":
      return [{ status: sortDirection }];
    case "type":
      return [{ type: sortDirection }];
    case "createdAt":
    default:
      return [{ createdAt: sortDirection }];
  }
}
