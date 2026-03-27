"use server";
import { gqlFetch } from "@/lib/graphql/fetch";
import {
  GET_DRIVERS,
  GET_DRIVER,
  CREATE_DRIVER,
  UPDATE_DRIVER,
  UPDATE_DRIVER_STATUS,
} from "@/lib/graphql/queries/drivers";
import type {
  CreateDriverInput,
  Driver,
  UpdateDriverInput,
  UpdateDriverStatusInput,
} from "@/lib/types/driver";

export async function getDriversAction(depotId?: string, isActive?: boolean): Promise<Driver[]> {
  const data = await gqlFetch<{ drivers: Driver[] }>(GET_DRIVERS, {
    depotId: depotId ?? null,
    isActive: isActive ?? null,
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
