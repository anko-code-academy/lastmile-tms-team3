import { auth } from "@/auth";

const API_BASE = process.env.AUTH_API_URL
  ? `${process.env.AUTH_API_URL}`
  : "http://localhost:5000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ routeId: string }> },
) {
  const { routeId } = await params;

  let token: string | undefined;
  try {
    const session = await auth();
    token = session?.accessToken;
  } catch (e) {
    console.error("Auth error:", e);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/manifests/${routeId}/pdf`, {
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(text, { status: res.status });
  }

  const contentType = res.headers.get("Content-Type") ?? "application/pdf";
  const disposition = res.headers.get("Content-Disposition");

  const responseHeaders: Record<string, string> = {
    "Content-Type": contentType,
  };
  if (disposition) {
    responseHeaders["Content-Disposition"] = disposition;
  }

  return new Response(res.body, {
    status: 200,
    headers: responseHeaders,
  });
}
