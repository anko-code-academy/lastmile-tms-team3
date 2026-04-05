"use server";

import { gqlFetch } from "@/lib/graphql/fetch";
import { SEARCH_PARCELS, GET_PARCEL, CREATE_PARCEL } from "@/lib/graphql/queries/parcels";
import { parseWktPoint } from "@/lib/graphql/utils";
import type {
  Parcel,
  ParcelListItem,
  ParcelSortBy,
  ParcelStatus,
  PagedResult,
  SearchParcelInput,
  SortDirection,
  CreateParcelInput,
} from "@/lib/types/parcel";

interface SearchParcelsResponse {
  parcels: ParcelConnection;
}

interface GetParcelResponse {
  parcel: Parcel;
}

interface CreateParcelResponse {
  createParcel: Parcel;
}

interface ParcelConnection {
  nodes: ParcelConnectionNode[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
}

interface ParcelConnectionNode {
  id: string;
  trackingNumber: string;
  description?: string | null;
  serviceType: Parcel["serviceType"];
  status: ParcelStatus;
  recipientAddress: {
    contactName?: string | null;
    companyName?: string | null;
    city: string;
  };
  zone?: {
    name?: string | null;
  } | null;
  parcelType?: string | null;
  weight: number;
  weightUnit: Parcel["weightUnit"];
  declaredValue: number;
  currency: string;
  estimatedDeliveryDate?: string | null;
  contentItemsCount: number;
  createdAt: string;
}

export async function searchParcelsAction(
  input: SearchParcelInput,
): Promise<PagedResult<ParcelListItem>> {
  const pageSize = Math.min(Math.max(1, input.pageSize), 100);
  const isBackward = input.pagingDirection === "backward";

  const data = await gqlFetch<SearchParcelsResponse>(SEARCH_PARCELS, {
    first: isBackward ? null : pageSize,
    last: isBackward ? pageSize : null,
    after: !isBackward && input.cursor ? input.cursor : null,
    before: isBackward && input.cursor ? input.cursor : null,
    search: normalizeSearch(input.search),
    where: buildParcelWhere(input),
    order: buildParcelOrder(input.sortBy, input.sortDirection),
  });

  return mapParcelConnection(data.parcels);
}

function normalizeSearch(search: string | null): string | null {
  if (!search) {
    return null;
  }

  const trimmed = search.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildParcelWhere(input: SearchParcelInput) {
  const createdAt: Record<string, string> = {};

  if (input.dateFrom) {
    createdAt.gte = `${input.dateFrom}T00:00:00Z`;
  }

  if (input.dateTo) {
    createdAt.lte = `${input.dateTo}T23:59:59Z`;
  }

  const where: Record<string, unknown> = {};

  if (input.status && input.status.length > 0) {
    where.status = { in: input.status };
  }

  if (Object.keys(createdAt).length > 0) {
    where.createdAt = createdAt;
  }

  const parcelType = input.parcelType?.trim();
  if (parcelType) {
    where.parcelType = { eq: parcelType };
  }

  if (input.zoneIds && input.zoneIds.length > 0) {
    where.or = input.zoneIds.map((zoneId) => ({ zoneId: { eq: zoneId } }));
  }

  return Object.keys(where).length > 0 ? where : null;
}

function buildParcelOrder(sortBy: ParcelSortBy, sortDirection: SortDirection) {
  const direction = sortDirection;

  switch (sortBy) {
    case "TRACKING_NUMBER":
      return [{ trackingNumber: direction }];
    case "STATUS":
      return [{ status: direction }];
    case "CREATED_AT":
    default:
      return [{ createdAt: direction }];
  }
}

function mapParcelConnection(
  connection: ParcelConnection,
): PagedResult<ParcelListItem> {
  return {
    items: connection.nodes.map(mapParcelNodeToListItem),
    totalCount: connection.totalCount,
    hasNextPage: connection.pageInfo.hasNextPage,
    hasPreviousPage: connection.pageInfo.hasPreviousPage,
    nextCursor: connection.pageInfo.endCursor ?? undefined,
    previousCursor: connection.pageInfo.startCursor ?? undefined,
  };
}

function mapParcelNodeToListItem(node: ParcelConnectionNode): ParcelListItem {
  return {
    id: node.id,
    trackingNumber: node.trackingNumber,
    description: node.description ?? undefined,
    serviceType: node.serviceType,
    status: node.status,
    recipientName:
      node.recipientAddress.contactName ??
      node.recipientAddress.companyName ??
      "",
    recipientCity: node.recipientAddress.city,
    zoneName: node.zone?.name ?? undefined,
    parcelType: node.parcelType ?? undefined,
    weight: node.weight,
    weightUnit: node.weightUnit,
    declaredValue: node.declaredValue,
    currency: node.currency,
    estimatedDeliveryDate: node.estimatedDeliveryDate ?? undefined,
    contentItemsCount: node.contentItemsCount,
    createdAt: node.createdAt,
  };
}

export async function getParcelAction(id: string): Promise<Parcel> {
  const data = await gqlFetch<GetParcelResponse>(GET_PARCEL, { id });
  if (!data.parcel) {
    throw new Error(`Parcel with ID ${id} not found`);
  }

  const parcel = data.parcel;

  if (parcel.recipientAddress?.geoLocation) {
    const coords = parseWktPoint(parcel.recipientAddress.geoLocation);
    parcel.recipientAddress.latitude = coords?.latitude;
    parcel.recipientAddress.longitude = coords?.longitude;
  }

  if (parcel.shipperAddress?.geoLocation) {
    const coords = parseWktPoint(parcel.shipperAddress.geoLocation);
    parcel.shipperAddress.latitude = coords?.latitude;
    parcel.shipperAddress.longitude = coords?.longitude;
  }

  if (parcel.deliveryConfirmation?.geoLocation) {
    const coords = parseWktPoint(parcel.deliveryConfirmation.geoLocation);
    parcel.deliveryConfirmation.latitude = coords?.latitude;
    parcel.deliveryConfirmation.longitude = coords?.longitude;
  }

  return parcel;
}

export async function createParcelAction(
  input: CreateParcelInput
): Promise<{ parcel?: Parcel; error?: string }> {
  try {
    const data = await gqlFetch<CreateParcelResponse>(CREATE_PARCEL, { input });
    return { parcel: data.createParcel };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create parcel" };
  }
}
