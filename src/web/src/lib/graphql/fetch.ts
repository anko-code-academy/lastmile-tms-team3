import { auth } from "@/auth";

const GQL_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : "http://localhost:5000/graphql";

export async function gqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const session = await auth();
  const token = session?.accessToken as string;

  const res = await fetch(GQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (!res.ok) {
    const errorMessage =
      json.errors?.[0]?.message || `GraphQL request failed: ${res.status}`;
    throw new Error(errorMessage);
  }

  if (json.errors?.length) {
    const err = json.errors[0];
    const validationErrors = err.extensions?.validationErrors as
      | { PropertyName: string; ErrorMessage: string }[]
      | undefined;
    if (validationErrors?.length) {
      throw new Error(validationErrors.map((e) => e.ErrorMessage).join("; "));
    }
    throw new Error(err.message);
  }

  return json.data as T;
}
