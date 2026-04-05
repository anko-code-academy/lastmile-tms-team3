import { useQuery } from "@tanstack/react-query";
import {
  searchDriversAction,
  type SearchDriversInput,
} from "@/lib/actions/drivers";

export function useSearchDrivers(input: SearchDriversInput) {
  return useQuery({
    queryKey: ["drivers", "search", input],
    queryFn: () => searchDriversAction(input),
  });
}
