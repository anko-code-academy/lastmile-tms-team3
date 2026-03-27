// Always use the local API route so NextAuth cookies can be used to attach bearer tokens.
const GRAPHQL_API_URL = "/api/graphql";

interface GraphQLError {
  message: string;
  extensions?: {
    validationErrors?: { PropertyName: string; ErrorMessage: string }[];
  };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
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
    const validationErrors = graphQlJson.errors
      .flatMap((e) => e.extensions?.validationErrors ?? []);
    if (validationErrors.length) {
      throw new Error(validationErrors.map((e) => e.ErrorMessage).join("; "));
    }
    throw new Error(graphQlJson.errors.map((e) => e.message).join(", "));
  }

  if (!graphQlJson.data) {
    throw new Error("No data returned from GraphQL");
  }

  return graphQlJson.data;
}
