import type { ReactNode } from "react";
import Link from "next/link";

const INLINE_PATTERN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      const href = match[2].trim();
      const isExternal = /^https?:\/\//i.test(href);
      if (isExternal) {
        nodes.push(
          <a
            key={`${match.index}-link`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blush underline underline-offset-2 hover:text-blush/80"
          >
            {match[1]}
          </a>
        );
      } else {
        nodes.push(
          <Link
            key={`${match.index}-link`}
            href={href}
            className="text-blush underline underline-offset-2 hover:text-blush/80"
          >
            {match[1]}
          </Link>
        );
      }
    } else if (match[3] !== undefined) {
      nodes.push(
        <strong key={`${match.index}-bold`} className="font-medium text-warm-dark">
          {match[3]}
        </strong>
      );
    }

    lastIndex = INLINE_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export default function FormattedMessage({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => (
        <p key={i} className="leading-relaxed">
          {parseInline(block.replace(/\n/g, " "))}
        </p>
      ))}
    </div>
  );
}
