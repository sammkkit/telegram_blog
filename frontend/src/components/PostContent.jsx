"use client";

import { marked } from "marked";

export default function PostContent({ content }) {
  // Configure marked for safe rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  const html = marked.parse(content || "");

  return (
    <div
      className="article-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
