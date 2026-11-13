"use client";
import { useEffect, useState } from "react";
import { relativeTime } from "./ui";

// Rendered on the client so times use the viewer's timezone, not the server's.
export function TimeAgo({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => setText(relativeTime(iso)), [iso]);
  return (
    <time className="mono" dateTime={iso} style={{ fontSize: 11 }}>
      {text}
    </time>
  );
}
