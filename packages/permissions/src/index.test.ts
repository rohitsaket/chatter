import { describe, expect, it } from "vitest";
import { can, outranks } from "./index";

describe("can", () => {
  it("lets owners and admins into the admin module, not members", () => {
    expect(can("OWNER", "org.admin")).toBe(true);
    expect(can("ADMIN", "org.admin")).toBe(true);
    expect(can("MODERATOR", "org.admin")).toBe(false);
    expect(can("MEMBER", "org.admin")).toBe(false);
    expect(can("GUEST", "org.admin")).toBe(false);
  });
  it("lets moderators pin messages", () => {
    expect(can("MODERATOR", "message.pin")).toBe(true);
    expect(can("MEMBER", "message.pin")).toBe(false);
  });
  it("restricts retention to owners", () => {
    expect(can("ADMIN", "retention.manage")).toBe(false);
    expect(can("OWNER", "retention.manage")).toBe(true);
  });
});

describe("outranks", () => {
  it("prevents equal-rank management", () => {
    expect(outranks("ADMIN", "ADMIN")).toBe(false);
    expect(outranks("OWNER", "ADMIN")).toBe(true);
  });
});
