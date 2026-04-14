import { graphql } from "./graphql";
import type {
  InboundManifest,
  StartReceivingSessionInput,
  StartReceivingSessionResult,
  ReceiveParcelInput,
  ReceiveParcelResult,
  CompleteReceivingSessionInput,
  CompleteReceivingSessionResult,
  ReceiveWalkInParcelInput,
  ReceiveWalkInParcelResult,
} from "../types/inboundManifest";

interface InboundManifestsResponse {
  inboundManifests: {
    totalCount: number;
    nodes: InboundManifest[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
  };
}

const INBOUND_MANIFESTS_QUERY = `
  query GetInboundManifests($where: InboundManifestFilterInput, $first: Int, $after: String, $search: String, $order: [InboundManifestSortInput!]) {
    inboundManifests(first: $first, after: $after, where: $where, search: $search, order: $order) {
      totalCount
      nodes {
        id
        manifestNumber
        depotId
        depot { id name }
        status
        maxParcels
        parcels {
          id
          trackingNumber
          status
          weight
          weightUnit
          serviceType
          recipientAddress { city state }
        }
        sessions {
          id
          manifestId
          status
          dockDoor
          startedAt
          confirmedAt
          confirmedBy
        }
        createdAt
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

const START_RECEIVING_SESSION_MUTATION = `
  mutation StartReceivingSession($input: StartReceivingSessionDtoInput!) {
    startReceivingSession(input: $input) {
      sessionId
      manifestId
      dockDoor
    }
  }
`;

const RECEIVE_PARCEL_MUTATION = `
  mutation ReceiveParcel($input: ReceiveParcelDtoInput!) {
    receiveParcel(input: $input) {
      parcelId
      trackingNumber
      status
      isUnexpected
      isAlreadyReceived
      sessionId
    }
  }
`;

const COMPLETE_RECEIVING_SESSION_MUTATION = `
  mutation CompleteReceivingSession($input: CompleteReceivingSessionDtoInput!) {
    completeReceivingSession(input: $input) {
      sessionId
      expectedCount
      receivedCount
      missingCount
      misdirectedCount
      missingParcels {
        trackingNumber
        status
      }
    }
  }
`;

const RECEIVE_WALK_IN_PARCEL_MUTATION = `
  mutation ReceiveWalkInParcel($input: ReceiveWalkInParcelDtoInput!) {
    receiveWalkInParcel(input: $input) {
      parcelId
      trackingNumber
      status
      isMisdirected
    }
  }
`;

export async function getInboundManifests(params?: {
  where?: Record<string, unknown>;
  first?: number;
  after?: string | null;
  search?: string | null;
  order?: Record<string, string>[] | null;
}): Promise<InboundManifestsResponse> {
  return graphql<InboundManifestsResponse>(INBOUND_MANIFESTS_QUERY, {
    where: params?.where ?? null,
    first: params?.first ?? 5,
    after: params?.after ?? null,
    search: params?.search ?? null,
    order: params?.order ?? null,
  });
}

export async function startReceivingSession(
  input: StartReceivingSessionInput,
): Promise<{ startReceivingSession: StartReceivingSessionResult }> {
  return graphql<{ startReceivingSession: StartReceivingSessionResult }>(
    START_RECEIVING_SESSION_MUTATION,
    { input },
  );
}

export async function receiveParcel(
  input: ReceiveParcelInput,
): Promise<{ receiveParcel: ReceiveParcelResult }> {
  return graphql<{ receiveParcel: ReceiveParcelResult }>(
    RECEIVE_PARCEL_MUTATION,
    { input },
  );
}

export async function completeReceivingSession(
  input: CompleteReceivingSessionInput,
): Promise<{ completeReceivingSession: CompleteReceivingSessionResult }> {
  return graphql<{ completeReceivingSession: CompleteReceivingSessionResult }>(
    COMPLETE_RECEIVING_SESSION_MUTATION,
    { input },
  );
}

export async function receiveWalkInParcel(
  input: ReceiveWalkInParcelInput,
): Promise<{ receiveWalkInParcel: ReceiveWalkInParcelResult }> {
  return graphql<{ receiveWalkInParcel: ReceiveWalkInParcelResult }>(
    RECEIVE_WALK_IN_PARCEL_MUTATION,
    { input },
  );
}
