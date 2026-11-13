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
