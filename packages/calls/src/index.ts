import { AccessToken } from "livekit-server-sdk";
import { loadEnv, livekitConfigured, type Env } from "@chatter/config";

export interface JoinTokenResult {
  configured: boolean;
  url?: string;
  token?: string;
  reason?: string;
}

export const NOT_CONFIGURED_REASON =
  "Voice/video calls are not configured on this server (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET are unset). Calls are never simulated.";

/**
 * Mint a short-lived LiveKit room token for an authenticated participant.
 * When LiveKit is not configured this returns a truthful failure — the UI
 * must show a configuration error, never a fake call.
 */
export async function createJoinToken(
  opts: { roomName: string; identity: string; name: string },
  env: Env = loadEnv(),
): Promise<JoinTokenResult> {
  if (!livekitConfigured(env)) {
    return { configured: false, reason: NOT_CONFIGURED_REASON };
  }
  const at = new AccessToken(env.LIVEKIT_API_KEY!, env.LIVEKIT_API_SECRET!, {
    identity: opts.identity,
    name: opts.name,
    ttl: "10m",
  });
  at.addGrant({ room: opts.roomName, roomJoin: true, canPublish: true, canSubscribe: true });
  return { configured: true, url: env.LIVEKIT_URL!, token: await at.toJwt() };
}
