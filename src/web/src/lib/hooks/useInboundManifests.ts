import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInboundManifests,
  startReceivingSession,
  receiveParcel,
  completeReceivingSession,
  receiveWalkInParcel,
} from "../api/inboundManifests";
import type {
  StartReceivingSessionInput,
  ReceiveParcelInput,
  CompleteReceivingSessionInput,
  ReceiveWalkInParcelInput,
} from "../types/inboundManifest";

export function useInboundManifests(params?: {
  search?: string;
  after?: string | null;
}) {
  return useQuery({
    queryKey: ["inbound-manifests", params?.search ?? "", params?.after ?? null],
    queryFn: () =>
      getInboundManifests({
        where: { status: { neq: "CLOSED" } },
        first: 5,
        after: params?.after ?? null,
        search: params?.search ?? null,
        order: [{ createdAt: "DESC" }],
      }).then((res) => res.inboundManifests),
  });
}

export function useStartReceivingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartReceivingSessionInput) =>
      startReceivingSession(input).then((res) => res.startReceivingSession),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound-manifests"] });
    },
  });
}

export function useReceiveParcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReceiveParcelInput) =>
      receiveParcel(input).then((res) => res.receiveParcel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound-manifests"] });
    },
  });
}

export function useCompleteReceivingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompleteReceivingSessionInput) =>
      completeReceivingSession(input).then(
        (res) => res.completeReceivingSession,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound-manifests"] });
    },
  });
}

export function useReceiveWalkInParcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReceiveWalkInParcelInput) =>
      receiveWalkInParcel(input).then((res) => res.receiveWalkInParcel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound-manifests"] });
    },
  });
}
