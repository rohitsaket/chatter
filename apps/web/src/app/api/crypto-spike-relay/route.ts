import { NextResponse } from "next/server";

/**
 * SPIKE-ONLY relay. Stands in for Chatter's real transport so the spike can
 * prove server blindness without touching production messaging.
 *
 * It deliberately does the one thing a real E2EE server must do: accept an
 * opaque envelope, store it, hand it back, and be structurally incapable of
 * reading it. It holds no key material and has no decrypt path.
 */
export const dynamic = "force-dynamic";

interface Envelope {
  messageId: string;
  conversationId: string;
  senderDeviceId: string;
  protocolVersion: string;
  ciphertext: string;
}

/** In-memory only — the spike must never persist to the production database. */
const inbox = new Map<string, Envelope[]>();

/**
 * Anything the spike encrypts is tagged with this marker. If it ever appears in
 * a request body, plaintext reached the server and the spike has failed.
 */
const PLAINTEXT_CANARY = "CHATTER_SPIKE_PLAINTEXT_CANARY";

/**
 * Two independent gates.
 *
 * The relay is a mutable store keyed by a caller-supplied mailbox name, so
 * without authentication any anonymous caller could write into — and, because
 * GET drains, delete from — another party's queue. That is unacceptable even
 * for spike data, and even in development.
 */
function guard(req: Request): NextResponse | null {
  if (process.env.NODE_ENV === "production" && process.env.E2EE_SPIKE !== "1") {
    return NextResponse.json({ error: "spike relay disabled" }, { status: 404 });
  }
  // A shared secret, not a session: the spike deliberately runs unauthenticated
  // against the app, so reusing the real session cookie would couple throwaway
  // code to production auth. The token is required regardless.
  const expected = process.env.E2EE_SPIKE_TOKEN ?? "spike-dev-token";
  if (req.headers.get("x-spike-token") !== expected) {
    return NextResponse.json({ error: "spike relay requires x-spike-token" }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  const raw = await req.text();

  // Server-blindness assertion, enforced rather than merely observed.
  if (raw.includes(PLAINTEXT_CANARY)) {
    return NextResponse.json(
      { error: "SPIKE FAILED: plaintext canary observed in request body" },
      { status: 422 },
    );
  }

  const body = JSON.parse(raw) as { to: string; envelope: Envelope };
  const queue = inbox.get(body.to) ?? [];
  queue.push(body.envelope);
  inbox.set(body.to, queue);

  // Echo back only what a real server would legitimately know.
  return NextResponse.json({
    stored: true,
    ciphertextBytes: body.envelope.ciphertext.length,
    protocolVersion: body.envelope.protocolVersion,
  });
}

export async function GET(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  const to = new URL(req.url).searchParams.get("to") ?? "";
  const queue = inbox.get(to) ?? [];
  inbox.set(to, []);
  return NextResponse.json({ envelopes: queue });
}
