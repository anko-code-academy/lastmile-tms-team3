import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAisle,
  createBin,
  deleteAisle,
  deleteBin,
  getWarehouseBins,
  updateAisle,
  updateBin,
} from "../api/bins";
import {
  CreateAisleDto,
  CreateBinDto,
  UpdateAisleDto,
  UpdateBinDto,
} from "../types/warehouse";

export function useWarehouseBins(depotId?: string) {
  return useQuery({
    queryKey: ["warehouse-bins", depotId],
    queryFn: () => getWarehouseBins(depotId),
  });
}

export function useCreateAisle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAisleDto) => createAisle(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-bins"] });
    },
  });
}

export function useUpdateAisle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateAisleDto) => updateAisle(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-bins"] });
    },
  });
}

export function useCreateBin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBinDto) => createBin(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-bins"] });
    },
  });
}

export function useUpdateBin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateBinDto) => updateBin(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-bins"] });
    },
  });
}

export function useDeleteAisle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAisle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-bins"] });
    },
  });
}

export function useDeleteBin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-bins"] });
    },
  });
}
