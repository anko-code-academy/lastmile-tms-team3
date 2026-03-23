import { auth } from "@/auth";

const GRAPHQL_URL = process.env.AUTH_API_URL
  ? `${process.env.AUTH_API_URL}/graphql`
  : "http://localhost:5000/graphql";

export async function POST(request: Request) {
  let token: string | undefined;

  try {
    const session = await auth();
    token = session?.accessToken;
  } catch (e) {
    console.error("Auth error:", e);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  console.log("Forwarding to backend:", GRAPHQL_URL, "Auth:", token ? "Bearer [token]" : "NONE", "Body:", JSON.stringify(body).substring(0, 200));

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("GraphQL error:", res.status, text);
    return Response.json({ error: `GraphQL request failed: ${res.status}`, detail: text }, { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}
