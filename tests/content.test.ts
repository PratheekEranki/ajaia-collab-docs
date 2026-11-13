import { describe, expect, it } from "vitest";
import { fileToHtml, htmlToMarkdown, markdownToHtml, previewText, sanitize, titleFromFilename } from "../lib/content";

describe("sanitize (XSS boundary)", () => {
  it("strips scripts and event handlers but keeps formatting", () => {
    const out = sanitize('<p onclick="x()">Hi <strong>there</strong><script>alert(1)</script><img src=x onerror=alert(1)></p>');
    expect(out).toBe("<p>Hi <strong>there</strong></p>");
  });
  it("drops javascript: links but keeps safe ones", () => {
    expect(sanitize('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitize('<a href="https://ajaia.dev">x</a>')).toBe('<a href="https://ajaia.dev">x</a>');
  });
  it("normalizes b/i to strong/em and deep headings to h3", () => {
    expect(sanitize("<b>B</b><i>I</i><h5>H</h5>")).toBe("<strong>B</strong><em>I</em><h3>H</h3>");
  });
});

describe("rich formatting survives sanitizing", () => {
  it("keeps font family, size, colour, highlight and alignment", () => {
    const html =
      '<p style="text-align: center"><span style="color: #c0392b; font-family: Georgia; font-size: 24px">Big red</span> ' +
      '<mark data-color="#fef08a" style="background-color: #fef08a; color: inherit">marked</mark></p>';
    const out = sanitize(html);
    expect(out).toContain('style="text-align:center"');
    expect(out).toContain("color:#c0392b");
    expect(out).toContain("font-family:Georgia");
    expect(out).toContain("font-size:24px");
    expect(out).toContain("background-color:#fef08a");
  });
  it("drops dangerous or unknown style values", () => {
    const out = sanitize(
      '<span style="color: red; background: url(javascript:alert(1)); position: fixed; font-size: 9999px">x</span>' +
        '<p style="text-align: expression(alert(1))">y</p>',
    );
    expect(out).not.toMatch(/url|position|expression|9999/);
    expect(out).toContain("<span>x</span>");
  });
});

describe("imports", () => {
  it("turns markdown headings, lists and emphasis into HTML", () => {
    const html = markdownToHtml("# Plan\n\n- **one**\n- _two_\n\n1. first");
    expect(html).toContain("<h1>Plan</h1>");
    expect(html).toContain("<li><strong>one</strong></li>");
    expect(html).toContain("<li><em>two</em></li>");
    expect(html).toContain("<ol>");
  });
  it("turns plain text paragraphs into <p> and escapes markup", async () => {
    const html = await fileToHtml("notes.txt", Buffer.from("Line <b>one</b>\n\nSecond para"));
    expect(html).toBe("<p>Line &lt;b&gt;one&lt;/b&gt;</p><p>Second para</p>");
  });
  it("rejects unsupported file types with a clear message", async () => {
    await expect(fileToHtml("deck.pdf", Buffer.from("%PDF"))).rejects.toThrow(/\.txt, \.md or \.docx/);
  });
  it("derives a readable title from the file name", () => {
    expect(titleFromFilename("meeting_notes-2026.md")).toBe("meeting notes 2026");
  });
});

describe("exports", () => {
  it("converts HTML to markdown", () => {
    expect(htmlToMarkdown("<h2>Title</h2><ul><li><p>a</p></li></ul>")).toMatch(/## Title\n\n-\s+a/);
  });
  it("builds a plain-text preview", () => {
    expect(previewText("<h2>Goal</h2><p>Ship &amp; learn</p>")).toBe("Goal Ship & learn");
  });
});

import { isAllowedAttachment } from "../lib/content";
describe("attachments allowlist", () => {
  it("accepts common document and image types, case-insensitively", () => {
    for (const f of ["spec.PDF", "budget.xlsx", "photo.jpeg", "notes.md", "bundle.zip"]) expect(isAllowedAttachment(f)).toBe(true);
  });
  it("rejects executables, scripts and files without an extension", () => {
    for (const f of ["setup.exe", "run.sh", "page.html", "image.svg", "README"]) expect(isAllowedAttachment(f)).toBe(false);
  });
});
