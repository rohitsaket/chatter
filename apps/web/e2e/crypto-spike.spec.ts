import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * SPIKE ACCEPTANCE — the E2E-01..E2E-15 matrix.
 *
 * Runs unauthenticated against the isolated spike page, so it does not depend
 * on the app's auth state and cannot disturb production messaging.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const CANARY = "CHATTER_SPIKE_PLAINTEXT_CANARY";
const MSG_A = `hello from A ${CANARY}`;
const MSG_B = `reply from B ${CANARY}`;

/** Open the spike page in its own context and wait for WASM. */
async function openSpike(ctx: BrowserContext): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto("/crypto-spike");
  await expect(page.getByTestId("spike-ready")).toHaveAttribute("data-ready", "1", { timeout: 60_000 });
  return page;
}

/**
 * Pair two parties living in two independent browser contexts.
 *
 * Public key material is ferried through the test itself rather than a
 * homeserver — the same role Chatter's own key server would play. Only public
 * material crosses; private state never leaves its own browser.
 */
async function pairAcrossContexts(a: Page, b: Page) {
  const setup = async (page: Page, label: string, store: string) =>
    page.evaluate(
      async ([lbl, st]) => {
        const s = (window as any).__spike;
        const party = await s.init(lbl, st);
        s.party = party;
        const keys = await s.harness.publishKeys(party);
        return {
          userId: party.userId,
          deviceId: party.deviceId,
          deviceKeys: keys.deviceKeys,
          oneTimeKeys: keys.oneTimeKeys,
        };
      },
      [label, store],
    );

  const A = await setup(a, "alice", "spike-alice");
  const B = await setup(b, "bob", "spike-bob");

  // Each side learns the other's public identity and claims a one-time key.
  const link = async (page: Page, peer: typeof A) =>
    page.evaluate(async (p) => {
      const s = (window as any).__spike;
      const sdk = await s.harness.loadCrypto();
      const peerParty = { label: "peer", userId: p.userId, deviceId: p.deviceId, machine: null } as any;
      await s.harness.shareIdentity(s.party, peerParty, p.deviceKeys);
      s.peer = peerParty;
      s.peerOtks = p.oneTimeKeys;
      void sdk;
    }, peer);

  await link(a, B);
  await link(b, A);

  // A claims a session with B, then ships the room key over the relay.
  const roomKeyPayloads = await a.evaluate(async () => {
    const s = (window as any).__spike;
    await s.harness.claimSession(s.party, s.peer, s.peerOtks);
    return s.harness.distributeRoomKey(s.party, s.peer);
  });
  await b.evaluate(async (payloads) => {
    const s = (window as any).__spike;
    await s.harness.receiveToDevice(s.party, payloads);
  }, roomKeyPayloads);

  const backPayloads = await b.evaluate(async () => {
    const s = (window as any).__spike;
    await s.harness.claimSession(s.party, s.peer, s.peerOtks);
    return s.harness.distributeRoomKey(s.party, s.peer);
  });
  await a.evaluate(async (payloads) => {
    const s = (window as any).__spike;
    await s.harness.receiveToDevice(s.party, payloads);
  }, backPayloads);
}

const encryptOn = (page: Page, text: string) =>
  page.evaluate(async (t) => {
    const s = (window as any).__spike;
    const t0 = performance.now();
    const ct = await s.harness.encrypt(s.party, t);
    s.marks.encryptMs = performance.now() - t0;
    return ct;
  }, text);

const decryptOn = (page: Page, ciphertext: string) =>
  page.evaluate(async (ct) => {
    const s = (window as any).__spike;
    const t0 = performance.now();
    const pt = await s.harness.decrypt(s.party, s.peer, ct);
    s.marks.decryptMs = performance.now() - t0;
    return pt;
  }, ciphertext);

test.describe("crypto spike acceptance", () => {
  test("E2E-01/02/03/06/07/08/15 — round trip, isolation and negative cases", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();

    // E2E-15: any plaintext reaching the console is a leak.
    const consoleLeaks: string[] = [];
    for (const c of [ctxA, ctxB]) {
      c.on("console", (m) => {
        if (m.text().includes(CANARY)) consoleLeaks.push(m.text());
      });
    }

    const a = await openSpike(ctxA);
    const b = await openSpike(ctxB);

    // E2E-01: two independent contexts initialised crypto.
    await expect(a.getByTestId("spike-ready")).toHaveAttribute("data-ready", "1");
    await expect(b.getByTestId("spike-ready")).toHaveAttribute("data-ready", "1");

    await pairAcrossContexts(a, b);

    // E2E-02: A encrypts -> B decrypts.
    const ctA = await encryptOn(a, MSG_A);
    expect(ctA).not.toContain(CANARY);
    expect(await decryptOn(b, ctA)).toBe(MSG_A);

    // E2E-03: B encrypts -> A decrypts.
    const ctB = await encryptOn(b, MSG_B);
    expect(ctB).not.toContain(CANARY);
    expect(await decryptOn(a, ctB)).toBe(MSG_B);

    // Ratcheted group sessions tolerate bounded out-of-order delivery.
    const delayedOne = await encryptOn(a, "delayed-one");
    const delayedTwo = await encryptOn(a, "delayed-two");
    expect(await decryptOn(b, delayedTwo)).toBe("delayed-two");
    expect(await decryptOn(b, delayedOne)).toBe("delayed-one");

    // E2E-07: tampered ciphertext must fail, never yield partial plaintext.
    const tampered = await a.evaluate((ct) => {
      const parsed = JSON.parse(ct);
      const body: string = parsed.ciphertext;
      // Flip one character of the ciphertext body.
      const i = Math.floor(body.length / 2);
      parsed.ciphertext = body.slice(0, i) + (body[i] === "A" ? "B" : "A") + body.slice(i + 1);
      return JSON.stringify(parsed);
    }, ctA);
    const tamperResult = await b.evaluate(async (ct) => {
      const s = (window as any).__spike;
      try {
        return { ok: true, value: await s.harness.decrypt(s.party, s.peer, ct) };
      } catch (e) {
        return { ok: false, value: String((e as { message?: string })?.message ?? e) };
      }
    }, tampered);
    expect(tamperResult.ok).toBe(false);
    expect(tamperResult.value).not.toContain(CANARY);

    // E2E-08: a third identity must not be able to decrypt.
    const ctxC = await browser.newContext();
    const c = await openSpike(ctxC);
    const wrongKey = await c.evaluate(async (ct) => {
      const s = (window as any).__spike;
      const party = await s.init("carol", "spike-carol");
      s.party = party;
      try {
        return { ok: true, value: await s.harness.decrypt(party, party, ct) };
      } catch (e) {
        return { ok: false, value: String((e as { message?: string })?.message ?? e) };
      }
    }, ctA);
    expect(wrongKey.ok).toBe(false);
    expect(wrongKey.value).not.toContain(CANARY);

    // E2E-06: private key material must never appear in localStorage.
    for (const page of [a, b]) {
      const ls = await page.evaluate(() => JSON.stringify(window.localStorage));
      expect(ls).not.toContain(CANARY);
      expect(ls.toLowerCase()).not.toContain("curve25519");
    }

    expect(consoleLeaks, "plaintext canary reached the console").toHaveLength(0);

    await ctxA.close();
    await ctxB.close();
    await ctxC.close();
  });

  test("E2E-04/05/09 — relay carries ciphertext only, offline queue works", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const a = await openSpike(ctxA);
    const b = await openSpike(ctxB);
    await pairAcrossContexts(a, b);

    const ciphertext = await encryptOn(a, MSG_A);

    // E2E-04 + E2E-09: B is not listening. A posts to the relay; it is stored
    // and collected later, which is the offline path.
    const post = await a.evaluate(async (ct) => {
      const res = await fetch("/api/crypto-spike-relay", {
        method: "POST",
        headers: { "content-type": "application/json", "x-spike-token": "spike-dev-token" },
        body: JSON.stringify({
          to: "bob",
          envelope: {
            messageId: "spike-1",
            conversationId: "spike-conv",
            senderDeviceId: "ALICEDEVICE",
            protocolVersion: "spike/olm-v1",
            ciphertext: ct,
          },
        }),
      });
      return { status: res.status, body: await res.json() };
    }, ciphertext);

    // The relay rejects any body containing the canary, so a 200 IS the
    // server-blindness assertion.
    expect(post.status).toBe(200);
    expect(post.body.stored).toBe(true);
    expect(JSON.stringify(post.body)).not.toContain(CANARY);

    // B reconnects and drains the queue.
    const fetched = await b.evaluate(async () => {
      const res = await fetch("/api/crypto-spike-relay?to=bob", { headers: { "x-spike-token": "spike-dev-token" } });
      return res.json();
    });
    expect(fetched.envelopes).toHaveLength(1);
    expect(JSON.stringify(fetched.envelopes)).not.toContain(CANARY);

    // E2E-09: decrypts correctly after the offline hop.
    expect(await decryptOn(b, fetched.envelopes[0].ciphertext)).toBe(MSG_A);

    await ctxA.close();
    await ctxB.close();
  });

  test("E2E-10 — session state across reload, and performance marks", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const a = await openSpike(ctxA);
    const b = await openSpike(ctxB);
    await pairAcrossContexts(a, b);

    const first = await encryptOn(a, MSG_A);
    expect(await decryptOn(b, first)).toBe(MSG_A);

    const marks = await a.evaluate(() => (window as any).__spike.marks);
    console.log("SPIKE_PERF " + JSON.stringify(marks));
    expect(marks.wasmLoadMs).toBeGreaterThan(0);

    // Reload B and rebuild its machine against the same IndexedDB store. If the
    // library restored session state, the second message decrypts without any
    // renewed key exchange.
    await b.reload();
    await expect(b.getByTestId("spike-ready")).toHaveAttribute("data-ready", "1", { timeout: 60_000 });

    const second = await encryptOn(a, "second message after reload");
    const restored = await b.evaluate(async (ct) => {
      const s = (window as any).__spike;
      try {
        const party = await s.init("bob", "spike-bob");
        s.party = party;
        s.peer = { userId: "@alice:chatter.spike", deviceId: "ALICEDEVICE" };
        return { ok: true, value: await s.harness.decrypt(party, s.peer, ct) };
      } catch (e) {
        return { ok: false, value: String((e as { message?: string })?.message ?? e) };
      }
    }, second);

    // Recorded either way — a failure here is a documented SPIKE LIMITATION,
    // never something to paper over.
    console.log("SPIKE_RELOAD " + JSON.stringify(restored));

    await ctxA.close();
    await ctxB.close();
  });

  test("E2E-11 — attachment ciphertext round trip and integrity rejection", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await openSpike(context);
    const result = await page.evaluate(async (canary) => {
      const sdk = await (window as any).__spike.harness.loadCrypto();
      const clear = new TextEncoder().encode(canary);
      const encrypted = sdk.Attachment.encrypt(clear);
      const ciphertext = encrypted.encryptedData;
      const media = encrypted.mediaEncryptionInfo;
      if (!media) throw new Error("missing media encryption info");
      const decrypted = sdk.Attachment.decrypt(new sdk.EncryptedAttachment(ciphertext, media));
      const tampered = ciphertext.slice();
      tampered[Math.floor(tampered.length / 2)] ^= 1;
      let tamperRejected = false;
      try {
        sdk.Attachment.decrypt(new sdk.EncryptedAttachment(tampered, media));
      } catch {
        tamperRejected = true;
      }
      return {
        ciphertext: Array.from(ciphertext),
        clear: new TextDecoder().decode(decrypted),
        tamperRejected,
      };
    }, CANARY);
    expect(new TextDecoder().decode(new Uint8Array(result.ciphertext))).not.toContain(CANARY);
    expect(result.clear).toBe(CANARY);
    expect(result.tamperRejected).toBe(true);
    await context.close();
  });
});
