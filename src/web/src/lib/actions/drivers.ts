"use server";
import { gqlFetch } from "@/lib/graphql/fetch";
import {
  GET_DRIVERS,
  GET_DRIVER,
  CREATE_DRIVER,
  UPDATE_DRIVER,
  UPDATE_DRIVER_STATUS,
  UPDATE_DRIVER_AVAILABILITY,
} from "@/lib/graphql/queries/drivers";
import type {
  CreateDriverInput,
  Driver,
  DriverAvailability,
  PagedDriversResult,
  UpdateDriverAvailabilityInput,
  UpdateDriverInput,
  UpdateDriverStatusInput,
} from "@/lib/types/driver";

export async function getDriversAction(
  depotId?: string,
  isActive?: boolean,
  search?: string,
  page = 1,
  pageSize = 20,
): Promise<PagedDriversResult> {
  const data = await gqlFetch<{ drivers: PagedDriversResult }>(GET_DRIVERS, {
    depotId: depotId ?? null,
    isActive: isActive ?? null,
    search: search || null,
    page,
    pageSize,
  });
  return data.drivers;
}

export async function getDriverAction(id: string): Promise<Driver | null> {
  const data = await gqlFetch<{ driver: Driver | null }>(GET_DRIVER, { id });
  return data.driver;
}

export async function createDriverAction(
  input: CreateDriverInput,
): Promise<{ error?: string; driverId?: string }> {
  try {
    const data = await gqlFetch<{ createDriver: Driver }>(CREATE_DRIVER, { input });
    return { driverId: data.createDriver.id };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    return { error: err instanceof Error ? err.message : "Failed to create driver" };
  }
}

export async function updateDriverAction(
  input: UpdateDriverInput,
): Promise<{ error?: string; driverId?: string }> {
  try {
    const data = await gqlFetch<{ updateDriver: Driver }>(UPDATE_DRIVER, { input });
    return { driverId: data.updateDriver.id };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    return { error: err instanceof Error ? err.message : "Failed to update driver" };
  }
}

export async function updateDriverStatusAction(
  input: UpdateDriverStatusInput,
): Promise<{ error?: string }> {
  try {
    await gqlFetch(UPDATE_DRIVER_STATUS, { input });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update driver status" };
  }
}

export async function updateDriverAvailabilityAction(
  input: UpdateDriverAvailabilityInput,
): Promise<{ error?: string; availability?: DriverAvailability }> {
  try {
    const data = await gqlFetch<{ updateDriverAvailability: { availability: DriverAvailability } }>(
      UPDATE_DRIVER_AVAILABILITY,
      { input },
    );
    return { availability: data.updateDriverAvailability.availability };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update availability" };
  }
}
