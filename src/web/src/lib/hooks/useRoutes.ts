import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDeliveryRoutes,
  loadParcel,
  completeLoading,
} from "../api/routes";
import type { LoadParcelInput, CompleteLoadingInput } from "../types/route";
import {
  searchRoutesAction,
  type SearchRoutesInput,
} from "@/lib/actions/routes";

// Load-out hooks (PR #28)
export function useDeliveryRoutes(where?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["delivery-routes", where],
    queryFn: () => getDeliveryRoutes(where),
    select: (data) => data.deliveryRoutes,
  });
}

export function useLoadParcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoadParcelInput) =>
      loadParcel(input).then((res) => res.loadParcel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-routes"] });
    },
  });
}

export function useCompleteLoading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompleteLoadingInput) =>
      completeLoading(input).then((res) => res.completeLoading),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-routes"] });
    },
  });
}

// Route search hooks (LMTT3-40)
export function useSearchRoutes(input: SearchRoutesInput) {
  return useQuery({
    queryKey: ["routes", "search", input],
    queryFn: () => searchRoutesAction(input),
  });
}
