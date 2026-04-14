"use server";

import { auth } from "@/auth";

const GQL_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : "http://localhost:8080/graphql";

export interface StageParcelResult {
  parcelId: string;
  trackingNumber: string;
  status: string;
  routeId: string;
  routeName: string;
  isMisstage: boolean;
  assignedRouteName: string | null;
}

export interface DeliveryRoute {
  id: string;
  name: string;
  status: string;
  date: string;
  driverName: string | null;
  zoneName: string | null;
}

export interface StagingStatus {
  routeId: string;
  routeName: string;
  expectedCount: number;
  stagedCount: number;
}

export interface StagingParcel {
  id: string;
  trackingNumber: string;
  status: string;
  weight: number | null;
  weightUnit: string | null;
  serviceType: string | null;
  city: string | null;
  state: string | null;
}

const STAGE_PARCEL_MUTATION = `
  mutation StageParcel($input: StageParcelDtoInput!) {
    stageParcel(input: $input) {
      parcelId
      trackingNumber
      status
      routeId
      routeName
      isMisstage
      assignedRouteName
    }
  }
`;

const GET_DELIVERY_ROUTES_QUERY = `
  query GetDeliveryRoutes($where: DeliveryRouteFilterInput) {
    deliveryRoutes(first: 100, where: $where) {
      nodes {
        id
        name
        status
        date
        driver { id firstName lastName }
        zone { id name }
      }
    }
  }
`;

const GET_STAGING_STATUS_QUERY = `
  query GetStagingStatus($routeId: UUID!) {
    stagingStatus(routeId: $routeId) {
      routeId
      routeName
      expectedCount
      stagedCount
    }
  }
`;

const GET_STAGING_PARCELS_QUERY = `
  query GetStagingParcels($where: ParcelFilterInput) {
    parcels(first: 100, where: $where) {
      nodes {
        id
        trackingNumber
        status
        weight
        weightUnit
        serviceType
        recipientAddress { city state }
      }
    }
  }
`;

async function gqlRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = (await auth())?.accessToken;
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(GQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText} — ${body}`);
  }

  const json = await response.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "GraphQL error");

  return json.data as T;
}

export async function stageParcelAction(input: {
  trackingNumber: string;
  routeId: string;
  operatorName: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountryCode: string | null;
  forceStage?: boolean;
}): Promise<StageParcelResult> {
  const data = await gqlRequest<{ stageParcel: StageParcelResult }>(
    STAGE_PARCEL_MUTATION,
    { input }
  );
  return data.stageParcel;
}

interface DeliveryRouteRaw {
  id: string;
  name: string;
  status: string;
  date: string;
  driver: { firstName: string; lastName: string } | null;
  zone: { name: string } | null;
}

export async function getDeliveryRoutesAction(date?: string): Promise<DeliveryRoute[]> {
  const where = date ? { date: { eq: date }, status: { eq: "DRAFT" } } : { status: { eq: "DRAFT" } };
  const data = await gqlRequest<{ deliveryRoutes: { nodes: DeliveryRouteRaw[] } }>(
    GET_DELIVERY_ROUTES_QUERY,
    { where }
  );
  return data.deliveryRoutes.nodes.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    date: r.date,
    driverName: r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : null,
    zoneName: r.zone?.name ?? null,
  }));
}

export async function getStagingStatusAction(routeId: string): Promise<StagingStatus | null> {
  const data = await gqlRequest<{ stagingStatus: StagingStatus | null }>(
    GET_STAGING_STATUS_QUERY,
    { routeId }
  );
  return data.stagingStatus;
}

interface ParcelRaw {
  id: string;
  trackingNumber: string;
  status: string;
  weight: number | null;
  weightUnit: string | null;
  serviceType: string | null;
  recipientAddress: { city: string | null; state: string | null } | null;
}

export async function getStagingParcelsAction(routeId: string): Promise<StagingParcel[]> {
  const data = await gqlRequest<{ parcels: { nodes: ParcelRaw[] } }>(
    GET_STAGING_PARCELS_QUERY,
    { where: { routeId: { eq: routeId } } }
  );
  return data.parcels.nodes.map((p) => ({
    id: p.id,
    trackingNumber: p.trackingNumber,
    status: p.status,
    weight: p.weight,
    weightUnit: p.weightUnit,
    serviceType: p.serviceType,
    city: p.recipientAddress?.city ?? null,
    state: p.recipientAddress?.state ?? null,
  }));
}
