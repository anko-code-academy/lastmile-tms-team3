import { useQuery } from "@tanstack/react-query";
import {
  searchVehiclesAction,
  type SearchVehiclesInput,
} from "@/lib/actions/vehicles";

export function useSearchVehicles(input: SearchVehiclesInput) {
  return useQuery({
    queryKey: ["vehicles", "search", input],
    queryFn: () => searchVehiclesAction(input),
  });
}
