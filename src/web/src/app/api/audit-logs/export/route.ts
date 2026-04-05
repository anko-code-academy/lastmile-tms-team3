import { auth } from "@/auth";

const API_BASE_URL =
  process.env.AUTH_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

export async function GET(request: Request) {
  const session = await auth();
  const token = session?.accessToken;

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const backendUrl = new URL(`${API_BASE_URL}/api/audit-logs/export`);
  backendUrl.search = url.search;

  const response = await fetch(backendUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/csv",
    },
  });

  if (!response.ok) {
    return new Response(await response.text(), { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  const headers = new Headers();
  headers.set(
    "Content-Type",
    response.headers.get("Content-Type") ?? "text/csv; charset=utf-8",
  );

  const disposition = response.headers.get("Content-Disposition");
  if (disposition) {
    headers.set("Content-Disposition", disposition);
  }

  return new Response(buffer, {
    status: 200,
    headers,
  });
}
