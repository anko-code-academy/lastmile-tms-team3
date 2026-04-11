"use server";

import { gqlFetch } from "@/lib/graphql/fetch";
import { SORT_PARCEL } from "@/lib/graphql/queries/sort";

export interface SortParcelInput {
  trackingNumber: string;
  scannedZoneId?: string | null;
  operatorName?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountryCode?: string | null;
}

export interface SortParcelResult {
  parcelId: string;
  trackingNumber: string;
  status: string;
  zoneId: string | null;
  zoneName: string | null;
  binId: string | null;
  binCode: string | null;
  isMissort: boolean;
  isUnsortable: boolean;
  trackingEvents: {
    timestamp: string;
    eventType: string;
    operator: string | null;
    locationCity: string | null;
  }[];
}

interface SortParcelResponse {
  sortParcel: SortParcelResult;
}

export async function sortParcelAction(
  input: SortParcelInput
): Promise<SortParcelResult> {
  const data = await gqlFetch<SortParcelResponse>(SORT_PARCEL, { input });
  return data.sortParcel;
}
