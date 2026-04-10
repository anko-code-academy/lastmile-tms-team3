import { useQuery } from "@tanstack/react-query";
import { graphql } from "@/lib/api/graphql";
import {
  GET_DEPOT_DASHBOARD,
  GET_DEPOT_DASHBOARDS,
} from "@/lib/graphql/queries/depotDashboard";
import type { DepotDashboardViewModel } from "@/lib/types/depotDashboard";

interface GetDepotDashboardResponse {
  depot: DepotDashboardViewModel | null;
}

interface GetDepotDashboardsResponse {
  depots: DepotDashboardViewModel[];
}

export function useDepotDashboard(
  depotId: string | null,
  agingThresholdHours: number,
) {
  return useQuery({
    queryKey: ["depot-dashboard", depotId, agingThresholdHours],
    queryFn: async () => {
      const data = await graphql<GetDepotDashboardResponse>(
        GET_DEPOT_DASHBOARD,
        {
          id: depotId,
          agingThresholdHours,
        },
      );

      return data.depot;
    },
    enabled: !!depotId,
    refetchInterval: 60_000,
  });
}

export function useDepotDashboards(agingThresholdHours: number) {
  return useQuery({
    queryKey: ["depot-dashboards", agingThresholdHours],
    queryFn: async () => {
      const data = await graphql<GetDepotDashboardsResponse>(
        GET_DEPOT_DASHBOARDS,
        {
          agingThresholdHours,
          includeInactive: false,
        },
      );

      return data.depots;
    },
    refetchInterval: 60_000,
  });
}
