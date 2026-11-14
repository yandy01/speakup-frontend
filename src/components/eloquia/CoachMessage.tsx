import { Fragment } from "react";
function inline(t: string) {
  return t.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith("*") && p.endsWith("*") && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : <Fragment key={i}>{p}</Fragment>);
}
export function CoachMessage({ content }: { content: string }) {
  return <div className="space-y-1.5">{content.split("\n").map((l, i) => {
    const t = l.trim(); if (!t) return null;
    const li = t.match(/^(?:\d+[.)]|[-*•])\s+(.+)$/);
    if (li) return <div key={i} className="flex gap-2"><span className="text-primary">•</span><div>{inline(li[1] ?? "")}</div></div>;
    if (/^#{1,3}\s/.test(t)) return <p key={i} className="font-semibold">{inline(t.replace(/^#+\s/, ""))}</p>;
    return <p key={i}>{inline(t)}</p>;
  })}</div>;
}
