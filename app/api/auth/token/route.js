import { NextResponse } from "next/server";

const tokenRateLimitMap = new Map();

function tokenRateLimit(identifier, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!tokenRateLimitMap.has(identifier)) {
    tokenRateLimitMap.set(identifier, []);
  }

  const requests = tokenRateLimitMap.get(identifier);
  const validRequests = requests.filter((time) => time > windowStart);

  if (validRequests.length >= limit) {
    return false;
  }

  validRequests.push(now);
  tokenRateLimitMap.set(identifier, validRequests);
  return true;
}

export async function POST(request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0]
      : request.headers.get("x-real-ip") || "unknown";

    if (!tokenRateLimit(`token-${ip}`, 10, 60000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const API_URL = process.env.FASTAPI_URL || "http://localhost:8000";

    const response = await fetch(`${API_URL}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Token request failed: ${response.status} - ${errorText.slice(0, 100)}`,
      );
    }

    const data = await response.json();

    if (!data.token) {
      throw new Error("Token is missing from response");
    }

    const tokenResponse = NextResponse.json({
      token: data.token,
      expires_in: data.expires_in || 10,
    });

    tokenResponse.headers.set("X-Content-Type-Options", "nosniff");
    tokenResponse.headers.set("X-Frame-Options", "DENY");
    tokenResponse.headers.set("X-XSS-Protection", "1; mode=block");
    tokenResponse.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin",
    );
    tokenResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );

    return tokenResponse;
  } catch {
    return NextResponse.json(
      { error: "Token request failed" },
      { status: 500 },
    );
  }
}
