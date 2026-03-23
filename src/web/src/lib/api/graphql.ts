const GRAPHQL_API_URL = "/api/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function graphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(GRAPHQL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status}`);
  }

  const json: GraphQLResponse<T> = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(", "));
  }

  if (!json.data) {
    throw new Error("No data returned from GraphQL");
  }

  return json.data;
}
