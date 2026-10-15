import { cookies } from "next/headers";

import { API_BASE_URL, SESSION_COOKIE } from "@/lib/api-auth";

/**
 * Same-origin proxy for browser mutations: `/api/proxy/api/<path>` forwards
 * method, query string, body and content type to the backend's `/api/<path>`
 * and adds the signed-in user's token from the httpOnly `session` cookie, so
 * client JS never sees it and every write lands in the right account.
 */
async function forward(request: Request, ctx: RouteContext<"/api/proxy/[...path]">): Promise<Response> {
  const { path } = await ctx.params;
  if (path[0] !== "api" || path.some((segment) => segment === ".." || segment.includes(":"))) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const target = `${API_BASE_URL}/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
  const headers: Record<string, string> = {};
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) headers.authorization = `Bearer ${token}`;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    const type = response.headers.get("content-type");
    if (type) responseHeaders.set("content-type", type);
    return new Response(response.status === 204 ? null : await response.arrayBuffer(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: "backend unreachable" }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
