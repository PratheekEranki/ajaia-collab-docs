// Loads a document and enforces a capability for the caller. Every document route goes through here.
import { prisma } from "./db";
import { can, roleFor, type Capability } from "./permissions";
import { forbidden, notFound } from "./api";

export async function loadDoc(id: string, userId: string, capability: Capability) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { shares: true, owner: { select: { id: true, name: true, email: true } } },
  });
  const role = doc ? roleFor(doc, userId) : null;
  // No access → 404, so ids don't reveal which documents exist.
  if (!doc || !role) throw notFound();
  if (!can(role, capability)) {
    const owner = doc.owner.name;
    const messages: Record<Capability, string> = {
      read: "You don't have access to this document.",
      edit: `You have view-only access. Ask ${owner} for edit access.`,
      requestEdit: "You can already edit this document.",
      manage: `Only the owner (${owner}) can do that.`,
    };
    throw forbidden(messages[capability]);
  }
  return { doc, role };
}
