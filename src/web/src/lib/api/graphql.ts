// Always use the local API route so NextAuth cookies can be used to attach bearer tokens.
const GRAPHQL_API_URL = "/api/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function graphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(GRAPHQL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (!res.ok) {
    const proxyError = typeof json?.error === "string" ? json.error : null;
    const detail = typeof json?.detail === "string" ? json.detail : null;
    throw new Error(
      detail ?? proxyError ?? `GraphQL request failed: ${res.status}`,
    );
  }

  const graphQlJson = json as GraphQLResponse<T>;

  if (graphQlJson.errors?.length) {
    throw new Error(graphQlJson.errors.map((e) => e.message).join(", "));
  }

  if (!graphQlJson.data) {
    throw new Error("No data returned from GraphQL");
  }

  return graphQlJson.data;
}
