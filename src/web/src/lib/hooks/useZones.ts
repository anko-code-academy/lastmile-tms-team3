import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getZones, getZone, createZone, updateZone, deleteZone } from "../api/zones";
import { CreateZoneDto, UpdateZoneDto } from "../types/zone";

export function useZones(depotId?: string, includeInactive?: boolean) {
  return useQuery({
    queryKey: ["zones", depotId, includeInactive],
    queryFn: () => getZones(depotId, includeInactive),
  });
}

export function useZone(id: string) {
  return useQuery({
    queryKey: ["zone", id],
    queryFn: () => getZone(id),
    enabled: !!id,
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateZoneDto) => createZone(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateZoneDto) => updateZone(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      queryClient.invalidateQueries({ queryKey: ["zone", data.id] });
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
  });
}