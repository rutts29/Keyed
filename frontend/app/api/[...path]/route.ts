import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime (not Edge) for better network compatibility
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = "http://3.219.13.88:3001";

async function handler(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api", "");
  const searchParams = req.nextUrl.search;
  const url = `${BACKEND_URL}/api${path}${searchParams}`;

  console.log(`[Proxy] ${req.method} ${url}`);

  const headers: HeadersInit = {
    "Accept": "application/json",
  };

  // Forward auth header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  // Forward content-type
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  // Forward body for non-GET/HEAD requests
  if (!["GET", "HEAD"].includes(req.method)) {
    try {
      const body = await req.text();
      if (body) {
        fetchOptions.body = body;
      }
    } catch {
      // No body
    }
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.text();

    console.log(`[Proxy] Response: ${response.status}`);

    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[Proxy] Error:", error);
    return NextResponse.json(
      { error: "Backend unavailable", details: String(error) },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
