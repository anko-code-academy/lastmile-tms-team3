"use server";
import { gqlFetch } from "@/lib/graphql/fetch";
import {
  CREATE_ROUTE,
  GET_ROUTE,
  GET_ROUTES,
  ADD_PARCELS_TO_ROUTE,
  REMOVE_PARCEL_FROM_ROUTE,
  AUTO_ASSIGN_PARCELS,
  DELETE_ROUTE,
} from "@/lib/graphql/queries/routes";
import type {
  CreateRouteInput,
  AddParcelsToRouteInput,
  RemoveParcelFromRouteInput,
  RouteStatus,
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
