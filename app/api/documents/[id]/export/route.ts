import { requireUser, route, invalid } from "@/lib/api";
import { loadDoc } from "@/lib/access";
import { htmlToMarkdown } from "@/lib/content";

const safeName = (title: string) => title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "document";

export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDoc((await params).id, user.id, "read");
  const format = new URL(req.url).searchParams.get("format");
  const name = safeName(doc.title);

  if (format === "md") {
    return download(`# ${doc.title}\n\n${htmlToMarkdown(doc.content)}\n`, `${name}.md`, "text/markdown; charset=utf-8");
  }
  if (format === "html") {
    const escapedTitle = doc.title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapedTitle}</title>
<style>body{max-width:720px;margin:48px auto;padding:0 20px;font:18px/1.65 Georgia,serif;color:#1e2833}h1,h2,h3{line-height:1.25}</style>
</head><body><h1>${escapedTitle}</h1>${doc.content}</body></html>`;
    return download(page, `${name}.html`, "text/html; charset=utf-8");
  }
  if (format === "docx") {
    const { default: HTMLtoDOCX } = await import("html-to-docx");
    const escapedTitle = doc.title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const buffer = (await HTMLtoDOCX(`<h1>${escapedTitle}</h1>${doc.content}`, null, { title: doc.title, font: "Georgia" })) as Buffer;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}.docx"`,
      },
    });
  }
  throw invalid("Choose an export format: md, html or docx. For PDF, use Print / Save as PDF.");
});

function download(body: string, filename: string, type: string) {
  return new Response(body, {
    headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
