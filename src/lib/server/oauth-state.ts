import { createHmac, timingSafeEqual } from "node:crypto";
import { SECURITY_CONFIG } from "$lib/constants";
import { env } from "$lib/env";

export type OAuthState = {
  orgId: string;
  next: string;
};

function getSecret(): string | null {
  const secret = env.oauthStateSecret.trim();
  return secret.length >= 32 ? secret : null;
}

export function sanitizeNext(value: string | null): string {
  if (typeof value !== "string" || !value.startsWith("/dashboard")) {
    return "/dashboard";
  }

  return value;
}

export function buildOAuthState(orgId: string, next: string): string {
  const payload = JSON.stringify({
    orgId,
    next: sanitizeNext(next),
    ts: Date.now(),
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const secret = getSecret();

  if (!secret) {
    return encoded;
  }

  const signature = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${signature}`;
}

export function parseOAuthState(state: string | null): OAuthState | null {
  if (!state) {
    return null;
  }

  const [encoded, signature] = state.split(".");
  const secret = getSecret();

  if (!encoded) {
    return null;
  }

  if (secret) {
    if (!signature) {
      return null;
    }

    const expected = createHmac("sha256", secret).update(encoded).digest("hex");

    try {
      if (
        !timingSafeEqual(
          Buffer.from(signature, "hex"),
          Buffer.from(expected, "hex"),
        )
      ) {
        return null;
      }
    } catch {
      return null;
    }
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as {
      orgId?: unknown;
      next?: unknown;
      ts?: unknown;
    };

    if (
      typeof decoded.orgId !== "string" ||
      typeof decoded.next !== "string" ||
      !decoded.next.startsWith("/dashboard")
    ) {
      return null;
    }

    if (
      typeof decoded.ts === "number" &&
      Date.now() - decoded.ts > SECURITY_CONFIG.OAUTH_STATE_TTL_MS
    ) {
      return null;
    }

    return {
      orgId: decoded.orgId,
      next: decoded.next,
    };
  } catch {
    return null;
  }
}
