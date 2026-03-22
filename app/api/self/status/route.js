import { NextResponse } from "next/server";

const SELF_BASE_URL = "https://app.ai.self.xyz";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing token" },
        { status: 400 },
      );
    }

    const res = await fetch(`${SELF_BASE_URL}/api/agent/register/status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_) {
      json = { raw: text };
    }
    if (!res.ok) {
      const message =
        json?.error || json?.message || `Self API error: ${res.status}`;
      return NextResponse.json(
        { ok: false, error: message },
        { status: res.status },
      );
    }

    return NextResponse.json({ ok: true, status: json });
  } catch (error) {
    const message =
      error?.message || (typeof error === "string" ? error : "Unknown error");
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
