// End-to-end API checks against a running app (local `npm run dev` or the deployed URL).
// Proves permissions are enforced by the SERVER, not just hidden in the UI.
//   APP_URL=https://<your-app>.vercel.app npm test
// Skipped automatically when APP_URL isn't set. Uses seeded users (alice, bob, carol)
// and creates/deletes its own document, so it is safe to run repeatedly.
import { afterAll, describe, expect, it } from "vitest";

const BASE = process.env.APP_URL?.replace(/\/$/, "");

const DEMO_PASSWORD = "ajaia-demo"; // public demo credential, shown on the sign-in page

function postSession(email: string, password: string) {
  return fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

async function signIn(userId: string): Promise<string> {
  const res = await postSession(`${userId}@ajaia.dev`, DEMO_PASSWORD);
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
    const docx = await call(alice, `/api/documents/${docId}/export?format=docx`);
    expect(docx.status).toBe(200);
    expect(Buffer.from(await docx.arrayBuffer()).subarray(0, 2).toString()).toBe("PK"); // .docx is a zip
  });

  it("attachments: editors upload, viewers download only, bad types rejected", async () => {
    const form = new FormData();
    form.append("file", new File(["a,b\n1,2"], "data.csv", { type: "text/csv" }));
    const up = await call(alice, `/api/documents/${docId}/attachments`, { method: "POST", body: form });
    expect(up.status).toBe(201);
    const att = (await up.json()).attachment;
    // Carol is a viewer (from the link test): can download, can't delete or upload.
    const dl = await call(carol, `/api/documents/${docId}/attachments/${att.id}`);
    expect(dl.status).toBe(200);
    expect(dl.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await dl.text()).toBe("a,b\n1,2");
    expect((await call(carol, `/api/documents/${docId}/attachments/${att.id}`, { method: "DELETE" })).status).toBe(403);
    const exe = new FormData();
    exe.append("file", new File(["MZ"], "setup.exe"));
    expect((await call(alice, `/api/documents/${docId}/attachments`, { method: "POST", body: exe })).status).toBe(415);
    expect((await call(alice, `/api/documents/${docId}/attachments/${att.id}`, { method: "DELETE" })).status).toBe(204);
  });

  it("rejects a wrong password with a generic message", async () => {
    const res = await postSession("alice@ajaia.dev", "not-the-password");
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toBe("Email or password is incorrect.");
  });

  it("runs sign-up → pending → admin approval → sign-in", async () => {
    const email = `e2e-${Date.now()}@example.com`;
    const signup = await fetch(`${BASE}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "E2E Person", email, password: "longenough1" }),
    });
    expect(signup.status).toBe(201);
    // Pending accounts can't sign in yet.
    expect((await postSession(email, "longenough1")).status).toBe(403);
    // Non-admins can't see or approve requests.
    expect((await call(bob, "/api/admin/users")).status).toBe(403);
    const { users } = await (await call(alice, "/api/admin/users")).json();
    const pending = users.find((u: { email: string }) => u.email === email);
    expect(pending.status).toBe("PENDING");
    expect((await call(bob, `/api/admin/users/${pending.id}`, { method: "PATCH", body: JSON.stringify({ action: "approve" }) })).status).toBe(403);
    expect((await call(alice, `/api/admin/users/${pending.id}`, { method: "PATCH", body: JSON.stringify({ action: "approve" }) })).status).toBe(200);
    expect((await postSession(email, "longenough1")).status).toBe(200);
  });

  it("lets an admin deny a request (removes it) and reject duplicates", async () => {
    const email = `e2e-deny-${Date.now()}@example.com`;
    const body = JSON.stringify({ name: "Deny Me", email, password: "longenough1" });
    await fetch(`${BASE}/api/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    const dup = await fetch(`${BASE}/api/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    expect(dup.status).toBe(409);
    const { users } = await (await call(alice, "/api/admin/users")).json();
    const id = users.find((u: { email: string }) => u.email === email).id;
    expect((await call(alice, `/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ action: "deny" }) })).status).toBe(200);
    expect((await postSession(email, "longenough1")).status).toBe(401);
  });

  it("comments: viewers can comment, only author/editors resolve, only author/owner delete", async () => {
    const created = await call(alice, "/api/documents", { method: "POST", body: JSON.stringify({ title: "Comments e2e" }) });
    const id = (await created.json()).document.id;
    await call(alice, `/api/documents/${id}/shares`, { method: "PUT", body: JSON.stringify({ email: "carol@ajaia.dev", role: "VIEWER" }) });
    const posted = await call(carol, `/api/documents/${id}/comments`, { method: "POST", body: JSON.stringify({ body: "Typo here?", quote: "teh" }) });
    expect(posted.status).toBe(201);
    const c = (await posted.json()).comment;
    expect((await call(bob, `/api/documents/${id}/comments`)).status).toBe(404); // no access
    expect((await call(carol, `/api/documents/${id}/comments`, { method: "POST", body: JSON.stringify({ body: "  " }) })).status).toBe(400);
    expect((await call(alice, `/api/documents/${id}/comments/${c.id}`, { method: "PATCH", body: JSON.stringify({ resolved: true }) })).status).toBe(200);
    const list = await (await call(carol, `/api/documents/${id}/comments`)).json();
    expect(list.comments[0]).toMatchObject({ body: "Typo here?", quote: "teh", resolved: true });
    expect((await call(alice, `/api/documents/${id}/comments/${c.id}`, { method: "DELETE" })).status).toBe(204);
    await call(alice, `/api/documents/${id}`, { method: "DELETE" });
  });

  it("version history: edits create a snapshot, viewers can't restore, editors can", async () => {
    const created = await call(alice, "/api/documents", { method: "POST", body: JSON.stringify({ title: "History e2e" }) });
    const id = (await created.json()).document.id;
    await call(alice, `/api/documents/${id}`, { method: "PATCH", body: JSON.stringify({ content: "<p>first draft</p>" }) });
    const { versions } = await (await call(alice, `/api/documents/${id}/versions`)).json();
    expect(versions).toHaveLength(1);
    await call(alice, `/api/documents/${id}`, { method: "PATCH", body: JSON.stringify({ content: "<p>oops, overwritten</p>" }) });
    await call(alice, `/api/documents/${id}/shares`, { method: "PUT", body: JSON.stringify({ email: "carol@ajaia.dev", role: "VIEWER" }) });
    expect((await call(carol, `/api/documents/${id}/versions/${versions[0].id}`, { method: "POST" })).status).toBe(403);
    expect((await call(alice, `/api/documents/${id}/versions/${versions[0].id}`, { method: "POST" })).status).toBe(200);
    const doc = await (await call(alice, `/api/documents/${id}`)).json();
    expect(doc.document.content).toBe("<p>first draft</p>");
    // The pre-restore state was kept, so the restore is undoable.
    expect((await (await call(alice, `/api/documents/${id}/versions`)).json()).versions.length).toBe(2);
    await call(alice, `/api/documents/${id}`, { method: "DELETE" });
  });
});
