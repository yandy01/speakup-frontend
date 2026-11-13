import { Fragment } from 'react';

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** Small safe renderer for the coach's common Markdown: bold, emphasis, code and lists. */
export function CoachMessage({ content }: { content: string }) {
  const lines = content.replace(/\r/g, '').split('\n');
  return <div className="coach-markdown">{lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div className="markdown-spacer" key={index} />;
    const numbered = trimmed.match(/^(?:\d+[.)]|[-*])\s+(.+)$/);
    if (numbered) return <div className="markdown-list-item" key={index}><span>{/^\d/.test(trimmed) ? trimmed.match(/^\d+/)?.[0] : '•'}</span><div>{inline(numbered[1])}</div></div>;
    if (/^#{1,3}\s/.test(trimmed)) return <h4 key={index}>{inline(trimmed.replace(/^#{1,3}\s/, ''))}</h4>;
    return <p key={index}>{inline(trimmed)}</p>;
  })}</div>;
}
