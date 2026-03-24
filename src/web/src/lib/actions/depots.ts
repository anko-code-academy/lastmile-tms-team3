"use server";

import { gqlFetch } from "@/lib/graphql/fetch";
import { GET_DEPOTS } from "@/lib/graphql/queries/depots";

export interface DepotOption {
  id: string;
  name: string;
}

interface DepotsResponse {
  depots: DepotOption[];
}

export async function getDepotsAction(): Promise<DepotOption[]> {
  const data = await gqlFetch<DepotsResponse>(GET_DEPOTS, {
    includeInactive: false,
  });
  return data.depots;
}
