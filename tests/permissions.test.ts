import { describe, expect, it } from "vitest";
import { can, maxShareRole, roleFor, type AccessSubject } from "../lib/permissions";

const doc: AccessSubject = {
  ownerId: "alice",
  shares: [
    { userId: "bob", role: "EDITOR" },
    { userId: "carol", role: "VIEWER" },
  ],
};

describe("roleFor", () => {
  it("gives the owner OWNER even if a share row also exists", () => {
    expect(roleFor({ ...doc, shares: [...doc.shares, { userId: "alice", role: "VIEWER" }] }, "alice")).toBe("OWNER");
  });
  it("returns the share role for shared users", () => {
    expect(roleFor(doc, "bob")).toBe("EDITOR");
    expect(roleFor(doc, "carol")).toBe("VIEWER");
  });
  it("returns null for people with no access", () => {
    expect(roleFor(doc, "mallory")).toBeNull();
  });
});

describe("can", () => {
  it("lets every role read", () => {
    for (const r of ["OWNER", "EDITOR", "VIEWER"] as const) expect(can(r, "read")).toBe(true);
  });
  it("lets editors and owners edit, but not viewers", () => {
    expect(can("OWNER", "edit")).toBe(true);
    expect(can("EDITOR", "edit")).toBe(true);
    expect(can("VIEWER", "edit")).toBe(false);
  });
  it("reserves sharing, link settings and delete for the owner", () => {
    expect(can("OWNER", "manage")).toBe(true);
    expect(can("EDITOR", "manage")).toBe(false);
    expect(can("VIEWER", "manage")).toBe(false);
  });
  it("lets only viewers request edit access", () => {
    expect(can("VIEWER", "requestEdit")).toBe(true);
    expect(can("EDITOR", "requestEdit")).toBe(false);
    expect(can("OWNER", "requestEdit")).toBe(false);
  });
  it("denies everything to someone without access", () => {
    for (const c of ["read", "edit", "requestEdit", "manage"] as const) expect(can(null, c)).toBe(false);
  });
});

describe("maxShareRole (link redemption)", () => {
  it("grants the link role to someone without access", () => {
    expect(maxShareRole(null, "VIEWER")).toBe("VIEWER");
  });
  it("never downgrades an editor who opens a view-only link", () => {
    expect(maxShareRole("EDITOR", "VIEWER")).toBe("EDITOR");
  });
  it("upgrades a viewer who opens an edit link", () => {
    expect(maxShareRole("VIEWER", "EDITOR")).toBe("EDITOR");
  });
});
