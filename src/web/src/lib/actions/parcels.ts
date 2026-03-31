"use server";

import { gqlFetch } from "@/lib/graphql/fetch";
import { SEARCH_PARCELS, GET_PARCEL } from "@/lib/graphql/queries/parcels";
import type {
  Parcel,
  ParcelListItem,
  PagedResult,
  SearchParcelInput,
} from "@/lib/types/parcel";

interface SearchParcelsResponse {
  searchParcels: PagedResult<ParcelListItem>;
}

interface GetParcelResponse {
  parcel: Parcel;
}

export async function searchParcelsAction(
  input: SearchParcelInput
): Promise<PagedResult<ParcelListItem>> {
  const data = await gqlFetch<SearchParcelsResponse>(SEARCH_PARCELS, {
    input: {
      ...input,
      // Convert "YYYY-MM-DD" → "YYYY-MM-DDT00:00:00Z" for DateTimeOffset scalar
      dateFrom: input.dateFrom ? `${input.dateFrom}T00:00:00Z` : null,
      dateTo: input.dateTo ? `${input.dateTo}T23:59:59Z` : null,
    },
  });
  return data.searchParcels;
}

export async function getParcelAction(id: string): Promise<Parcel> {
  const data = await gqlFetch<GetParcelResponse>(GET_PARCEL, { id });
  if (!data.parcel) {
    throw new Error(`Parcel with ID ${id} not found`);
  }
  return data.parcel;
}
