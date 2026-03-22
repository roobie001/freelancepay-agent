import { NextResponse } from "next/server";
import { signSelfPayload, getSelfPublicKeyHex } from "../../../../lib/selfSigning";

const SELF_BASE_URL = "https://app.ai.self.xyz";
const DEFAULT_NETWORK = process.env.SELF_AGENT_NETWORK || "testnet";

async function postJson(path, body) {
  const res = await fetch(`${SELF_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
    throw new Error(message);
  }
  return json;
}

function buildDisclosures(input) {
  if (!input || typeof input !== "object") return undefined;
  const out = {};
  const allow = [
    "minimumAge",
    "ofac",
    "nationality",
    "name",
    "date_of_birth",
    "gender",
    "issuing_state",
  ];
  for (const key of allow) {
    if (key in input) out[key] = input[key];
  }
  return Object.keys(out).length ? out : undefined;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pubkey = (body.ed25519Pubkey || getSelfPublicKeyHex()).trim();
    const network = body.network || DEFAULT_NETWORK;
    const humanAddress = body.humanAddress;
    const disclosures = buildDisclosures(body.disclosures);

    const challenge = await postJson("/api/agent/register/ed25519-challenge", {
      pubkey,
      network,
      ...(humanAddress ? { humanAddress } : {}),
    });

    const challengeHash = challenge?.challengeHash;
    if (!challengeHash || typeof challengeHash !== "string") {
      throw new Error("Missing challengeHash from Self API.");
    }

    const { signatureHex } = signSelfPayload(challengeHash);

    const registration = await postJson("/api/agent/register", {
      mode: humanAddress ? "ed25519-linked" : "ed25519",
      network,
      ...(humanAddress ? { humanAddress } : {}),
      ed25519Pubkey: pubkey,
      ed25519Signature: signatureHex,
      ...(disclosures ? { disclosures } : {}),
    });

    return NextResponse.json({
      ok: true,
      network,
      pubkey,
      registration,
    });
  } catch (error) {
    const message =
      error?.message || (typeof error === "string" ? error : "Unknown error");
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
