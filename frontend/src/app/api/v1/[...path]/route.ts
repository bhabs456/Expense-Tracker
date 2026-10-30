import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (path.some((p) => !/^[-a-zA-Z0-9_.]+$/.test(p)))
    return Response.json({ detail: "Invalid path" }, { status: 400 });
  if (!["GET", "HEAD"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
      return Response.json({ detail: "Untrusted origin" }, { status: 403 });
  }
  if (Number(req.headers.get("content-length") || 0) > 21 * 1024 * 1024)
    return Response.json({ detail: "File too large" }, { status: 413 });
  try {
    const upstream = await fetch(
      `${process.env.API_URL || "http://127.0.0.1:8000"}/api/v1/${path.join("/")}${req.nextUrl.search}`,
      {
        method: req.method,
        headers: { "Content-Type": "application/json" },
        body: ["GET", "HEAD"].includes(req.method)
          ? undefined
          : await req.arrayBuffer(),
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      },
    );
    const headers = new Headers({
      "Content-Type":
        upstream.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-store",
    });
    if (upstream.headers.has("Content-Disposition"))
      headers.set(
        "Content-Disposition",
        upstream.headers.get("Content-Disposition")!,
      );
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return Response.json(
      {
        detail:
          "Cannot reach the local backend. Check that FastAPI and PostgreSQL are running.",
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
