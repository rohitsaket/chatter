import { describe, expect, it } from "vitest";
import { SOCKET_LIMITS, allow, type Bucket } from "../src/realtime/socket-rate-limit";

const fresh = () => new Map<string, Bucket>();

describe("socket rate limiting", () => {
  it("allows a burst then blocks, per event", () => {
    const b = fresh();
    const burst = SOCKET_LIMITS["message:sync"].burst;
    for (let i = 0; i < burst; i++) expect(allow(b, "message:sync", 1000)).toBe(true);
    expect(allow(b, "message:sync", 1000)).toBe(false);
  });

  it("refills over time at the configured rate", () => {
    const b = fresh();
    const burst = SOCKET_LIMITS["message:sync"].burst;
    for (let i = 0; i < burst; i++) allow(b, "message:sync", 1000);
    expect(allow(b, "message:sync", 1000)).toBe(false);
    // 0.2/s => one token back after 5s.
    expect(allow(b, "message:sync", 6000)).toBe(true);
  });

  it("never exceeds burst capacity however long it idles", () => {
    const b = fresh();
    allow(b, "typing", 0);
    let granted = 0;
    for (let i = 0; i < 100; i++) if (allow(b, "typing", 10_000_000)) granted++;
    expect(granted).toBe(SOCKET_LIMITS.typing.burst);
  });

  it("budgets each event independently", () => {
    const b = fresh();
    for (let i = 0; i < SOCKET_LIMITS["message:sync"].burst; i++) allow(b, "message:sync", 1000);
    expect(allow(b, "message:sync", 1000)).toBe(false);
    // Exhausting sync must not starve delivery ACKs.
    expect(allow(b, "message:delivered", 1000)).toBe(true);
  });

  it("bounds the expensive sync handler harder than the cheap ones", () => {
    expect(SOCKET_LIMITS["message:sync"].perSecond).toBeLessThan(SOCKET_LIMITS.typing.perSecond);
    expect(SOCKET_LIMITS["message:sync"].burst).toBeLessThan(SOCKET_LIMITS["message:delivered"].burst);
  });
});
