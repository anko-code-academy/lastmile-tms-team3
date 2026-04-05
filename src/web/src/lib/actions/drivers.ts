"use server";
import { gqlFetch } from "@/lib/graphql/fetch";
import {
  GET_DRIVERS,
  GET_DRIVER,
  CREATE_DRIVER,
  UPDATE_DRIVER,
  UPDATE_DRIVER_STATUS,
  UPDATE_DRIVER_AVAILABILITY,
  LINK_DRIVER_USER,
} from "@/lib/graphql/queries/drivers";
import type {
  CreateDriverInput,
  Driver,
  DriverAvailability,
  LinkDriverUserInput,
  SearchDriversResult,
  UpdateDriverAvailabilityInput,
  UpdateDriverInput,
  UpdateDriverStatusInput,
} from "@/lib/types/driver";

export type DriverSortField =
  | "createdAt"
  | "email"
  | "fullName"
  | "licenseNumber";

export interface SearchDriversInput {
  depotId?: string | null;
  isActive?: boolean | null;
  search?: string | null;
  sortField?: DriverSortField;
  sortDirection?: "ASC" | "DESC";
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
}

interface DriversConnectionResponse {
  drivers: {
    nodes: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      licenseNumber: string;
      depot: { name: string } | null;
      isActive: boolean;
      createdAt: string;
    }[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

export async function searchDriversAction(
  input: SearchDriversInput,
): Promise<SearchDriversResult> {
  const data = await gqlFetch<DriversConnectionResponse>(GET_DRIVERS, {
    search: normalizeSearch(input.search),
    where: buildDriverWhere(input),
    order: buildDriverOrder(input.sortField, input.sortDirection),
    first: input.first ?? null,
    after: input.after ?? null,
    last: input.last ?? null,
    before: input.before ?? null,
  });

  const { nodes, pageInfo, totalCount } = data.drivers;
  return {
    items: nodes.map((node) => ({
      id: node.id,
      fullName: `${node.firstName} ${node.lastName}`.trim(),
      email: node.email,
      licenseNumber: node.licenseNumber,
      depot: node.depot ? { name: node.depot.name } : undefined,
      isActive: node.isActive,
      createdAt: node.createdAt,
    })),
    totalCount,
    hasNextPage: pageInfo.hasNextPage,
    hasPreviousPage: pageInfo.hasPreviousPage,
    startCursor: pageInfo.startCursor,
    endCursor: pageInfo.endCursor,
  };
}

export async function getDriversAction(
  depotId?: string,
  isActive?: boolean,
  search?: string,
  first?: number,
  after?: string,
  last?: number,
  before?: string,
) {
  return searchDriversAction({
    depotId,
    isActive,
    search,
    first,
    after,
    last,
    before,
  });
}

function normalizeSearch(search?: string | null): string | null {
  if (!search) {
    return null;
  }

  const trimmed = search.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildDriverWhere(input: SearchDriversInput) {
  const where: Record<string, unknown> = {};

  if (input.depotId) {
    where.depotId = { eq: input.depotId };
  }

  if (typeof input.isActive === "boolean") {
    where.isActive = { eq: input.isActive };
  }

  return Object.keys(where).length > 0 ? where : null;
}

function buildDriverOrder(
  sortField: DriverSortField = "createdAt",
  sortDirection: "ASC" | "DESC" = "DESC",
) {
  switch (sortField) {
    case "email":
      return [{ email: sortDirection }];
    case "licenseNumber":
      return [{ licenseNumber: sortDirection }];
    case "fullName":
      return [{ firstName: sortDirection }, { lastName: sortDirection }];
    case "createdAt":
    default:
      return [{ createdAt: sortDirection }];
  }
}

export async function getDriverAction(id: string): Promise<Driver | null> {
  const data = await gqlFetch<{ driver: Driver | null }>(GET_DRIVER, { id });
  if (!data.driver) {
    return null;
  }

  return {
    ...data.driver,
    fullName: `${data.driver.firstName} ${data.driver.lastName}`.trim(),
  };
}

export async function createDriverAction(
  input: CreateDriverInput,
): Promise<{ error?: string; driverId?: string }> {
  try {
    const data = await gqlFetch<{ createDriver: Driver }>(CREATE_DRIVER, {
      input,
    });
    return { driverId: data.createDriver.id };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT"))
      throw err;
    return {
      error: err instanceof Error ? err.message : "Failed to create driver",
    };
  }
}

export async function updateDriverAction(
  input: UpdateDriverInput,
): Promise<{ error?: string; driverId?: string }> {
  try {
    const data = await gqlFetch<{ updateDriver: Driver }>(UPDATE_DRIVER, {
      input,
    });
    return { driverId: data.updateDriver.id };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT"))
      throw err;
    return {
      error: err instanceof Error ? err.message : "Failed to update driver",
    };
  }
}

export async function updateDriverStatusAction(
  input: UpdateDriverStatusInput,
): Promise<{ error?: string }> {
  try {
    await gqlFetch(UPDATE_DRIVER_STATUS, { input });
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update driver status",
    };
  }
}

export async function linkDriverUserAction(
  input: LinkDriverUserInput,
): Promise<{ error?: string; userId?: string | null }> {
  try {
    const data = await gqlFetch<{ linkDriverUser: { userId: string | null } }>(
      LINK_DRIVER_USER,
      { input },
    );
    return { userId: data.linkDriverUser.userId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to link user account",
    };
  }
}

export async function updateDriverAvailabilityAction(
  input: UpdateDriverAvailabilityInput,
): Promise<{ error?: string; availability?: DriverAvailability }> {
  try {
    const data = await gqlFetch<{
      updateDriverAvailability: { availability: DriverAvailability };
    }>(UPDATE_DRIVER_AVAILABILITY, { input });
    return { availability: data.updateDriverAvailability.availability };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update availability",
    };
  }
}
