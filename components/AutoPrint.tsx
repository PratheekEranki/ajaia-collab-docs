"use client";
import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    // Give web fonts a moment to load so the PDF uses the right typefaces.
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  );
}
