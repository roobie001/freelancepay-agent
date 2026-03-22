import { readFileSync } from "fs";
import { createPrivateKey, createPublicKey, sign as cryptoSign } from "crypto";

const PRIVATE_KEY_PATH = process.env.SELF_AGENT_PRIVATE_KEY_PATH;
const PRIVATE_KEY_PEM = process.env.SELF_AGENT_PRIVATE_KEY_PEM;
const PUBLIC_KEY_HEX = process.env.SELF_AGENT_PUBLIC_KEY_HEX;

function loadPrivateKey() {
  if (PRIVATE_KEY_PEM) {
    return createPrivateKey(PRIVATE_KEY_PEM);
  }
  if (PRIVATE_KEY_PATH) {
    const pem = readFileSync(PRIVATE_KEY_PATH, "utf8");
    return createPrivateKey(pem);
  }
  throw new Error(
    "Self agent private key not configured. Set SELF_AGENT_PRIVATE_KEY_PEM or SELF_AGENT_PRIVATE_KEY_PATH.",
  );
}

export function getSelfPublicKeyHex() {
  if (PUBLIC_KEY_HEX) {
    return PUBLIC_KEY_HEX.trim();
  }
  const privateKey = loadPrivateKey();
  const publicKey = createPublicKey(privateKey);
  const pubDer = publicKey.export({ format: "der", type: "spki" });
  const pubRaw = pubDer.slice(-32);
  return pubRaw.toString("hex");
}

export function signSelfPayload(payload) {
  const privateKey = loadPrivateKey();
  let data;
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
      data = Buffer.from(trimmed.slice(2), "hex");
    } else if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      data = Buffer.from(trimmed, "hex");
    } else {
      data = Buffer.from(trimmed);
    }
  } else {
    data = Buffer.from(JSON.stringify(payload));
  }
  const signature = cryptoSign(null, data, privateKey);
  return {
    signatureBase64: signature.toString("base64"),
    signatureHex: signature.toString("hex"),
    publicKeyHex: getSelfPublicKeyHex(),
  };
}
