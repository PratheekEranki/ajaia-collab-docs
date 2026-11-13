// End-to-end API checks against a running app (local `npm run dev` or the deployed URL).
// Proves permissions are enforced by the SERVER, not just hidden in the UI.
//   APP_URL=https://<your-app>.vercel.app npm test
// Skipped automatically when APP_URL isn't set. Uses seeded users (alice, bob, carol)
// and creates/deletes its own document, so it is safe to run repeatedly.
import { afterAll, describe, expect, it } from "vitest";

const BASE = process.env.APP_URL?.replace(/\/$/, "");

async function signIn(userId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  expect(res.status).toBe(200);
  const cookie = res.headers.get("set-cookie");
  expect(cookie).toBeTruthy();
  return cookie!.split(";")[0];
}

function call(cookie: string, path: string, init: RequestInit = {}) {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), cookie, ...init.headers },
  });
}

describe.skipIf(!BASE)("API permissions (e2e)", () => {
  let alice = "";
  let bob = "";
  let carol = "";
  let docId = "";

  afterAll(async () => {
    if (docId && alice) await call(alice, `/api/documents/${docId}`, { method: "DELETE" });
  });

  it("rejects unauthenticated requests with 401", async () => {
    const res = await fetch(`${BASE}/api/documents`);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a tampered session cookie", async () => {
    const res = await fetch(`${BASE}/api/documents`, { headers: { cookie: "ajaia_session=alice.forged-signature" } });
    expect(res.status).toBe(401);
  });

  it("lets the owner create and format a document that persists", async () => {
    alice = await signIn("alice");
    bob = await signIn("bob");
    carol = await signIn("carol");
    const created = await call(alice, "/api/documents", { method: "POST", body: JSON.stringify({ title: "E2E test doc" }) });
    expect(created.status).toBe(201);
    docId = (await created.json()).document.id;

    const html = "<h2>Heading</h2><p><strong>bold</strong> <em>it</em> <u>under</u></p><ul><li><p>item</p></li></ul>";
    const saved = await call(alice, `/api/documents/${docId}`, { method: "PATCH", body: JSON.stringify({ content: html }) });
    expect(saved.status).toBe(200);
    const reopened = await (await call(alice, `/api/documents/${docId}`)).json();
    expect(reopened.document.content).toBe(html);
    expect(reopened.role).toBe("OWNER");
  });

  it("strips script injection on save", async () => {
    await call(alice, `/api/documents/${docId}`, { method: "PATCH", body: JSON.stringify({ content: '<p>ok<script>alert(1)</script><img src=x onerror="alert(1)"></p>' }) });
    const doc = await (await call(alice, `/api/documents/${docId}`)).json();
    expect(doc.document.content).toBe("<p>ok</p>");
  });

  it("hides the document from people without access (404, not 403)", async () => {
    const res = await call(bob, `/api/documents/${docId}`);
    expect(res.status).toBe(404);
  });

  it("lets a viewer read but blocks their edits with 403", async () => {
    const shared = await call(alice, `/api/documents/${docId}/shares`, { method: "PUT", body: JSON.stringify({ email: "bob@ajaia.dev", role: "VIEWER" }) });
    expect(shared.status).toBe(200);
    expect((await call(bob, `/api/documents/${docId}`)).status).toBe(200);
    const edit = await call(bob, `/api/documents/${docId}`, { method: "PATCH", body: JSON.stringify({ title: "hijacked" }) });
    expect(edit.status).toBe(403);
    expect((await edit.json()).error.code).toBe("FORBIDDEN");
  });

  it("blocks non-owners from sharing or deleting", async () => {
    const share = await call(bob, `/api/documents/${docId}/shares`, { method: "PUT", body: JSON.stringify({ email: "carol@ajaia.dev", role: "EDITOR" }) });
    expect(share.status).toBe(403);
    expect((await call(bob, `/api/documents/${docId}`, { method: "DELETE" })).status).toBe(403);
  });

  it("runs the request → approve flow: viewer becomes editor", async () => {
    const req = await call(bob, `/api/documents/${docId}/requests`, { method: "POST" });
    expect(req.status).toBe(201);
    const { requests } = await (await call(alice, `/api/documents/${docId}/shares`)).json();
    expect(requests).toHaveLength(1);
    const approve = await call(alice, `/api/requests/${requests[0].id}`, { method: "PATCH", body: JSON.stringify({ decision: "APPROVE" }) });
    expect(approve.status).toBe(200);
    const edit = await call(bob, `/api/documents/${docId}`, { method: "PATCH", body: JSON.stringify({ title: "Edited by Bob" }) });
    expect(edit.status).toBe(200);
  });

  it("returns a helpful 404 when sharing with an unknown email", async () => {
    const res = await call(alice, `/api/documents/${docId}/shares`, { method: "PUT", body: JSON.stringify({ email: "nobody@example.com", role: "VIEWER" }) });
    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toMatch(/No account uses/);
  });

  it("rejects empty titles with 400", async () => {
    const res = await call(alice, `/api/documents/${docId}`, { method: "PATCH", body: JSON.stringify({ title: "   " }) });
    expect(res.status).toBe(400);
  });

  it("imports markdown as a new document and rejects unsupported files", async () => {
    const good = new FormData();
    good.append("file", new File(["# Imported\n\n- **one**"], "notes.md", { type: "text/markdown" }));
    const ok = await call(carol, "/api/import", { method: "POST", body: good });
    expect(ok.status).toBe(201);
    const imported = (await ok.json()).document;
    const doc = await (await call(carol, `/api/documents/${imported.id}`)).json();
    expect(doc.document.content).toContain("<h1>Imported</h1>");
    await call(carol, `/api/documents/${imported.id}`, { method: "DELETE" });

    const bad = new FormData();
    bad.append("file", new File(["%PDF-1.4"], "deck.pdf", { type: "application/pdf" }));
    const rejected = await call(carol, "/api/import", { method: "POST", body: bad });
    expect(rejected.status).toBe(415);
  });

  it("link sharing grants access but never downgrades an editor", async () => {
    const link = await (await call(alice, `/api/documents/${docId}/link`, { method: "PATCH", body: JSON.stringify({ role: "VIEWER" }) })).json();
    // Carol (no access) redeems the link → becomes a viewer.
    const redeem = await call(carol, `/share/${link.link.token}`, { redirect: "manual" });
    expect([303, 307, 308]).toContain(redeem.status);
    expect((await (await call(carol, `/api/documents/${docId}`)).json()).role).toBe("VIEWER");
    // Bob (editor) redeems the view link → stays editor.
    await call(bob, `/share/${link.link.token}`, { redirect: "manual" });
    expect((await (await call(bob, `/api/documents/${docId}`)).json()).role).toBe("EDITOR");
  });

  it("exports markdown and html", async () => {
    const md = await call(alice, `/api/documents/${docId}/export?format=md`);
    expect(md.headers.get("content-disposition")).toMatch(/\.md"/);
    const html = await call(alice, `/api/documents/${docId}/export?format=html`);
    expect(await html.text()).toContain("<!doctype html>");
  });
});
