import { graphql } from "./graphql";
import type {
  DeliveryRoute,
  LoadParcelInput,
  LoadParcelResult,
} from "../types/route";

interface DeliveryRoutesResponse {
  deliveryRoutes: {
    totalCount: number;
    nodes: DeliveryRoute[];
  };
}

const DELIVERY_ROUTES_QUERY = `
  query GetDeliveryRoutes($where: DeliveryRouteFilterInput) {
    deliveryRoutes(first: 100, where: $where) {
      totalCount
      nodes {
        id
        name
        depotId
        depot { id name }
        driverId
        driver { id firstName lastName }
        zoneId
        zone { id name }
        date
        status
        loadedAt
        parcels {
          id
          trackingNumber
          status
          serviceType
          weight
          weightUnit
          declaredValue
          currency
          recipientAddress { city state countryCode }
          contentItemsCount
        }
      }
    }
  }
`;

const LOAD_PARCEL_MUTATION = `
  mutation LoadParcel($input: LoadParcelDtoInput!) {
    loadParcel(input: $input) {
      parcelId
      trackingNumber
      status
      isWrongRoute
      assignedRouteName
      assignedRouteId
    }
  }
`;

export async function getDeliveryRoutes(
  where?: Record<string, unknown>,
): Promise<DeliveryRoutesResponse> {
  return graphql<DeliveryRoutesResponse>(DELIVERY_ROUTES_QUERY, {
    where: where ?? null,
  });
}

export async function loadParcel(
  input: LoadParcelInput,
): Promise<{ loadParcel: LoadParcelResult }> {
  return graphql<{ loadParcel: LoadParcelResult }>(LOAD_PARCEL_MUTATION, {
    input,
  });
}

export async function downloadManifest(routeId: string): Promise<void> {
  const res = await fetch(`/api/manifests/${routeId}`);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Failed to download manifest: ${res.status}`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "manifest.pdf";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
