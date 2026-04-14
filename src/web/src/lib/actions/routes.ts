"use server";
import { gqlFetch } from "@/lib/graphql/fetch";
import {
  CREATE_ROUTE,
  GET_ROUTE,
  GET_ROUTES,
  GET_ROUTES_MAP,
  ADD_PARCELS_TO_ROUTE,
  REMOVE_PARCEL_FROM_ROUTE,
  AUTO_ASSIGN_PARCELS,
  DELETE_ROUTE,
  ASSIGN_DRIVER_TO_ROUTE,
  ASSIGN_VEHICLE_TO_ROUTE,
  UNASSIGN_DRIVER_FROM_ROUTE,
  UNASSIGN_VEHICLE_FROM_ROUTE,
  GET_AVAILABLE_DRIVERS,
  OPTIMIZE_ROUTE_STOPS,
  REORDER_ROUTE_STOPS,
  DISPATCH_ROUTE,
  ADD_PARCELS_TO_ACTIVE_ROUTE,
  REMOVE_PARCEL_FROM_ACTIVE_ROUTE,
} from "@/lib/graphql/queries/routes";
import type {
  CreateRouteInput,
  AddParcelsToRouteInput,
  RemoveParcelFromRouteInput,
  AssignDriverToRouteInput,
  AssignVehicleToRouteInput,
  UnassignFromRouteInput,
  AvailableDriver,
  RouteStatus,
  ReorderStopsInput,
  RouteMapData,
  RouteMapStop,
} from "@/lib/types/route";

export interface RouteFilter {
  date?: { eq: string };
  zoneId?: { eq: string };
  status?: { eq: RouteStatus };
  driverId?: { eq: string };
  vehicleId?: { eq: string };
}

export type RouteSortField = "createdAt" | "date" | "status";

export interface SearchRoutesInput {
  filter?: RouteFilter;
  sortField?: RouteSortField;
  sortDirection?: "ASC" | "DESC";
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
}

export interface SearchRoutesResult {
  items: DeliveryRoute[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
}

interface RoutesConnectionResponse {
  routes: {
    nodes: DeliveryRoute[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

interface RouteResponse {
  route: DeliveryRoute | null;
}

import type { DeliveryRoute } from "@/lib/types/route";

export async function searchRoutesAction(
  input: SearchRoutesInput
): Promise<SearchRoutesResult> {
  const data = await gqlFetch<RoutesConnectionResponse>(GET_ROUTES, {
    first: input.first ?? null,
    after: input.after ?? null,
    last: input.last ?? null,
    before: input.before ?? null,
    where: buildRouteWhere(input.filter),
    order: buildRouteOrder(input.sortField, input.sortDirection),
  });

  const { nodes, pageInfo, totalCount } = data.routes;
  return {
    items: nodes,
    totalCount,
    hasNextPage: pageInfo.hasNextPage,
    hasPreviousPage: pageInfo.hasPreviousPage,
    nextCursor: pageInfo.endCursor,
    previousCursor: pageInfo.startCursor,
  };
}

export async function getRouteAction(
  id: string
): Promise<DeliveryRoute | null> {
  const data = await gqlFetch<RouteResponse>(GET_ROUTE, { id });
  return data.route;
}

export async function createRouteAction(
  input: CreateRouteInput
): Promise<{ error?: string; routeId?: string }> {
  try {
    const data = await gqlFetch<{ createRoute: DeliveryRoute }>(CREATE_ROUTE, {
      input,
    });
    return { routeId: data.createRoute.id };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : "Failed to create route",
    };
  }
}

export async function addParcelsToRouteAction(
  input: AddParcelsToRouteInput
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ addParcelsToRoute: DeliveryRoute }>(ADD_PARCELS_TO_ROUTE, {
      input,
    });
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to add parcels to route",
    };
  }
}

export async function removeParcelFromRouteAction(
  input: RemoveParcelFromRouteInput
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ removeParcelFromRoute: DeliveryRoute }>(
      REMOVE_PARCEL_FROM_ROUTE,
      { input }
    );
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to remove parcel from route",
    };
  }
}

export async function autoAssignParcelsAction(
  routeId: string
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ autoAssignParcels: DeliveryRoute }>(AUTO_ASSIGN_PARCELS, {
      routeId,
    });
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to auto-assign parcels",
    };
  }
}

export async function deleteRouteAction(
  routeId: string
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ deleteRoute: boolean }>(DELETE_ROUTE, { routeId });
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete route",
    };
  }
}

export async function assignDriverToRouteAction(
  input: AssignDriverToRouteInput
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ assignDriverToRoute: DeliveryRoute }>(
      ASSIGN_DRIVER_TO_ROUTE,
      { input }
    );
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to assign driver to route",
    };
  }
}

export async function assignVehicleToRouteAction(
  input: AssignVehicleToRouteInput
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ assignVehicleToRoute: DeliveryRoute }>(
      ASSIGN_VEHICLE_TO_ROUTE,
      { input }
    );
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to assign vehicle to route",
    };
  }
}

export async function unassignDriverFromRouteAction(
  input: UnassignFromRouteInput
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ unassignDriverFromRoute: DeliveryRoute }>(
      UNASSIGN_DRIVER_FROM_ROUTE,
      { input }
    );
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to unassign driver from route",
    };
  }
}

export async function unassignVehicleFromRouteAction(
  input: UnassignFromRouteInput
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ unassignVehicleFromRoute: DeliveryRoute }>(
      UNASSIGN_VEHICLE_FROM_ROUTE,
      { input }
    );
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to unassign vehicle from route",
    };
  }
}

export async function getAvailableDriversAction(
  date: string
): Promise<{ error?: string; drivers?: AvailableDriver[] }> {
  try {
    const data = await gqlFetch<{ availableDrivers: AvailableDriver[] }>(
      GET_AVAILABLE_DRIVERS,
      { date }
    );
    return { drivers: data.availableDrivers };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to fetch available drivers",
    };
  }
}

function buildRouteWhere(filter?: RouteFilter) {
  if (!filter) return null;
  return Object.keys(filter).length > 0 ? filter : null;
}

function buildRouteOrder(
  sortField: RouteSortField = "createdAt",
  sortDirection: "ASC" | "DESC" = "DESC"
) {
  switch (sortField) {
    case "date":
      return [{ date: sortDirection }];
    case "status":
      return [{ status: sortDirection }];
    case "createdAt":
    default:
      return [{ createdAt: sortDirection }];
  }
}

export async function optimizeRouteStopsAction(
  routeId: string
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ optimizeRouteStops: { id: string } }>(
      OPTIMIZE_ROUTE_STOPS,
      { routeId }
    );
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to optimize route stops",
    };
  }
}

export async function reorderRouteStopsAction(
  input: ReorderStopsInput
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ reorderRouteStops: { id: string } }>(
      REORDER_ROUTE_STOPS,
      { input }
    );
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to reorder route stops",
    };
  }
}

export async function dispatchRouteAction(
  routeId: string
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ dispatchRoute: DeliveryRoute }>(DISPATCH_ROUTE, {
      input: { routeId },
    });
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to dispatch route",
    };
  }
}

export async function addParcelsToActiveRouteAction(
  input: AddParcelsToRouteInput
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ addParcelsToActiveRoute: DeliveryRoute }>(
      ADD_PARCELS_TO_ACTIVE_ROUTE,
      { input }
    );
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to add parcels to active route",
    };
  }
}

export async function removeParcelFromActiveRouteAction(
  input: RemoveParcelFromRouteInput
): Promise<{ error?: string }> {
  try {
    await gqlFetch<{ removeParcelFromActiveRoute: DeliveryRoute }>(
      REMOVE_PARCEL_FROM_ACTIVE_ROUTE,
      { input }
    );
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to remove parcel from active route",
    };
  }
}

export async function getRoutesForMapAction(
  date: string
): Promise<{ error?: string; routes?: RouteMapData[] }> {
  try {
    const data = await gqlFetch<{
      routesForMap: {
        id: string;
        name: string;
        status: RouteStatus;
        driverName?: string | null;
        vehiclePlate?: string | null;
        depot: {
          id: string;
          name: string;
          address?: { latitude: number; longitude: number } | null;
        } | null;
        routeParcels: {
          parcelId: string;
          stopOrder: number;
          parcel: {
            id: string;
            trackingNumber: string;
            status: string;
            recipientAddress?: {
              latitude: number;
              longitude: number;
              city: string;
              street1: string;
            } | null;
          };
        }[];
      }[];
    }>(GET_ROUTES_MAP, {
      date,
    });

    const routes: RouteMapData[] = data.routesForMap.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      driverName: r.driverName,
      vehiclePlate: r.vehiclePlate,
      depot: r.depot,
      stops: r.routeParcels
        .filter(
          (rp) =>
            rp.parcel?.recipientAddress?.latitude != null &&
            rp.parcel?.recipientAddress?.longitude != null
        )
        .map((rp) => ({
          parcelId: rp.parcelId,
          stopOrder: rp.stopOrder,
          trackingNumber: rp.parcel.trackingNumber,
          status: rp.parcel.status,
          latitude: rp.parcel.recipientAddress!.latitude,
          longitude: rp.parcel.recipientAddress!.longitude,
          city: rp.parcel.recipientAddress?.city ?? "",
          street1: rp.parcel.recipientAddress?.street1 ?? "",
        })),
    }));

    return { routes };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to fetch routes for map",
    };
  }
}
