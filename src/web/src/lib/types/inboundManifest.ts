export enum InboundManifestStatus {
  Open = "OPEN",
  Sealed = "SEALED",
  Closed = "CLOSED",
}

export enum InboundReceivingSessionStatus {
  Open = "OPEN",
  Confirmed = "CONFIRMED",
}

export interface ManifestParcel {
  id: string;
  trackingNumber: string;
  status: string;
  weight: number;
  weightUnit: string;
  serviceType: string;
  recipientAddress: {
    city: string;
    state: string;
  };
}

export interface InboundManifest {
  id: string;
  manifestNumber: string;
  depotId: string;
  depot: { id: string; name: string };
  status: InboundManifestStatus;
  maxParcels: number;
  parcels: ManifestParcel[];
  sessions: InboundReceivingSession[];
  createdAt: string;
}

export interface InboundReceivingSession {
  id: string;
  manifestId: string;
  status: InboundReceivingSessionStatus;
  dockDoor?: string | null;
  startedAt: string;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
}

export interface StartReceivingSessionInput {
  manifestId: string;
  dockDoor?: string | null;
}

export interface StartReceivingSessionResult {
  sessionId: string;
  manifestId: string;
  dockDoor?: string | null;
}

export interface ReceiveParcelInput {
  trackingNumber: string;
  sessionId: string;
  operatorName?: string;
  locationCity?: string;
  locationState?: string;
  locationCountryCode?: string;
}

export interface ReceiveParcelResult {
  parcelId: string;
  trackingNumber: string;
  status: string;
  isUnexpected: boolean;
  isAlreadyReceived: boolean;
  sessionId: string;
}

export interface CompleteReceivingSessionInput {
  sessionId: string;
  confirmedBy?: string;
}

export interface MissingParcel {
  trackingNumber: string;
  status: string;
}

export interface ReceiveWalkInParcelInput {
  trackingNumber: string;
  dockDoor?: string | null;
  operatorName?: string;
  locationCity?: string;
  locationState?: string;
  locationCountryCode?: string;
}

export interface ReceiveWalkInParcelResult {
  parcelId: string;
  trackingNumber: string;
  status: string;
  isMisdirected: boolean;
}

export interface CompleteReceivingSessionResult {
  sessionId: string;
  expectedCount: number;
  receivedCount: number;
  missingCount: number;
  misdirectedCount: number;
  missingParcels: MissingParcel[];
}
