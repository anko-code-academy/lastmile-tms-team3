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
  query GetDeliveryRoutes($date: Date, $depotId: UUID) {
    deliveryRoutes(date: $date, depotId: $depotId) {
      id
      name
      status
      date
      driverName
      zoneName
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

  if (!response.ok) throw new Error(`GraphQL request failed: ${response.statusText}`);

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
}): Promise<StageParcelResult> {
  const data = await gqlRequest<{ stageParcel: StageParcelResult }>(
    STAGE_PARCEL_MUTATION,
    { input }
  );
  return data.stageParcel;
}

export async function getDeliveryRoutesAction(date?: string): Promise<DeliveryRoute[]> {
  const data = await gqlRequest<{ deliveryRoutes: DeliveryRoute[] }>(
    GET_DELIVERY_ROUTES_QUERY,
    { date: date ?? null, depotId: null }
  );
  return data.deliveryRoutes;
}

export async function getStagingStatusAction(routeId: string): Promise<StagingStatus | null> {
  const data = await gqlRequest<{ stagingStatus: StagingStatus | null }>(
    GET_STAGING_STATUS_QUERY,
    { routeId }
  );
  return data.stagingStatus;
}
