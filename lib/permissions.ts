// The security core. Pure functions only — no DB, no I/O — so every rule is unit-tested.
// Routes load the doc + shares, then ask these functions what the caller may do.

export type ShareRole = "VIEWER" | "EDITOR";
export type EffectiveRole = "OWNER" | ShareRole;

export interface AccessSubject {
  ownerId: string;
  shares: { userId: string; role: ShareRole }[];
}

const rank: Record<EffectiveRole, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };

/** The caller's role on a document, or null when they have no access. */
export function roleFor(doc: AccessSubject, userId: string): EffectiveRole | null {
  if (doc.ownerId === userId) return "OWNER";
  return doc.shares.find((s) => s.userId === userId)?.role ?? null;
}

export type Capability =
  | "read" // open, export, make a copy
  | "edit" // change title/content, manage attachments
  | "requestEdit" // ask the owner for edit access
  | "manage"; // share, change roles, link settings, resolve requests, delete

export function can(role: EffectiveRole | null, capability: Capability): boolean {
  if (!role) return false;
  switch (capability) {
    case "read":
      return true;
    case "edit":
      return rank[role] >= rank.EDITOR;
    case "requestEdit":
      return role === "VIEWER";
    case "manage":
      return role === "OWNER";
  }
}

/** Link redemption never downgrades existing access and can never grant ownership. */
export function maxShareRole(existing: ShareRole | null, granted: ShareRole): ShareRole {
  if (!existing) return granted;
  return rank[existing] >= rank[granted] ? existing : granted;
}

export const roleLabel: Record<EffectiveRole, string> = { OWNER: "Owner", EDITOR: "Editor", VIEWER: "Viewer" };
