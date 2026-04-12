import { graphql } from "./graphql";
import type {
  InboundManifest,
  StartReceivingSessionInput,
  StartReceivingSessionResult,
  ReceiveParcelInput,
  ReceiveParcelResult,
  CompleteReceivingSessionInput,
  CompleteReceivingSessionResult,
} from "../types/inboundManifest";

interface InboundManifestsResponse {
  inboundManifests: {
    totalCount: number;
    nodes: InboundManifest[];
  };
}

const INBOUND_MANIFESTS_QUERY = `
  query GetInboundManifests($where: InboundManifestFilterInput) {
    inboundManifests(first: 100, where: $where) {
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
      missingParcels {
        trackingNumber
        status
      }
    }
  }
`;

export async function getInboundManifests(
  where?: Record<string, unknown>,
): Promise<InboundManifestsResponse> {
  return graphql<InboundManifestsResponse>(INBOUND_MANIFESTS_QUERY, {
    where: where ?? null,
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
