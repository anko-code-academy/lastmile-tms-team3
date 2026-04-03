import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { graphql } from "@/lib/api/graphql";
import { GET_DEPOTS } from "@/lib/graphql/queries/depots";
import {
  getDepots,
  getDepot,
  createDepot,
  updateDepot,
  deleteDepot,
} from "../api/depots";
import { CreateDepotDto, UpdateDepotDto } from "../types/depot";

export function useDepotNames() {
  return useQuery({
    queryKey: ["depots", "names"],
    queryFn: async () => {
      const data = await graphql<{ depots: { id: string; name: string }[] }>(
        GET_DEPOTS,
        { includeInactive: false },
      );
      return data.depots;
    },
  });
}

export function useDepots(includeInactive?: boolean) {
  return useQuery({
    queryKey: ["depots", includeInactive],
    queryFn: () => getDepots(includeInactive),
  });
}

export function useDepot(id: string) {
  return useQuery({
    queryKey: ["depot", id],
    queryFn: () => getDepot(id),
    enabled: !!id,
  });
}

export function useCreateDepot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateDepotDto) => createDepot(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["depots"] });
    },
  });
}

export function useUpdateDepot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateDepotDto) => updateDepot(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      queryClient.invalidateQueries({ queryKey: ["depot", data.id] });
    },
  });
}

export function useDeleteDepot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDepot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["depots"] });
    },
  });
}