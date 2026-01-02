import { memo, useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

/**
 * Code block with copy button and syntax highlighting placeholder
 */
const CodeBlock = memo(function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-3 rounded-xl overflow-hidden bg-black/40 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <span className="text-xs text-white/50 font-mono">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
            'transition-all duration-200',
            'hover:bg-white/10',
            copied ? 'text-leo-accent' : 'text-white/50'
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-white/90 leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
});

/**
 * Simple markdown renderer for chat messages
 *
 * Supports:
 * - Code blocks (```)
 * - Inline code (`)
 * - Bold (**text**)
 * - Italic (*text*)
 * - Lists (- item, 1. item)
 * - Headers (# ## ###)
 * - Links [text](url)
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const rendered = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const lines = content.split('\n');
    let codeBlock: { language?: string; lines: string[] } | null = null;
    let listItems: { ordered: boolean; items: string[] } | null = null;
    let key = 0;

    const flushList = () => {
      if (listItems) {
        const ListTag = listItems.ordered ? 'ol' : 'ul';
        elements.push(
          <ListTag
            key={key++}
            className={cn(
              'my-2 pl-5 space-y-1',
              listItems.ordered ? 'list-decimal' : 'list-disc',
              'text-white/90'
            )}
          >
            {listItems.items.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {parseInline(item)}
              </li>
            ))}
          </ListTag>
        );
        listItems = null;
      }
    };

    const parseInline = (text: string): React.ReactNode => {
      // Process inline elements
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let partKey = 0;

      while (remaining.length > 0) {
        // Bold
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        if (boldMatch && boldMatch.index !== undefined) {
          if (boldMatch.index > 0) {
            parts.push(parseRemainingInline(remaining.slice(0, boldMatch.index), partKey++));
          }
          parts.push(
            <strong key={partKey++} className="font-semibold text-white">
              {boldMatch[1]}
            </strong>
          );
          remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
          continue;
        }

        // Italic
        const italicMatch = remaining.match(/\*(.+?)\*/);
        if (italicMatch && italicMatch.index !== undefined) {
          if (italicMatch.index > 0) {
            parts.push(parseRemainingInline(remaining.slice(0, italicMatch.index), partKey++));
          }
          parts.push(
            <em key={partKey++} className="italic text-white/90">
              {italicMatch[1]}
            </em>
          );
          remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
          continue;
        }

        // Inline code
        const codeMatch = remaining.match(/`([^`]+)`/);
        if (codeMatch && codeMatch.index !== undefined) {
          if (codeMatch.index > 0) {
            parts.push(parseRemainingInline(remaining.slice(0, codeMatch.index), partKey++));
          }
          parts.push(
            <code
              key={partKey++}
              className="px-1.5 py-0.5 rounded-md bg-white/10 font-mono text-sm text-leo-accent"
            >
              {codeMatch[1]}
            </code>
          );
          remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
          continue;
        }

        // Link
        const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch && linkMatch.index !== undefined) {
          if (linkMatch.index > 0) {
            parts.push(parseRemainingInline(remaining.slice(0, linkMatch.index), partKey++));
          }
          parts.push(
            <a
              key={partKey++}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-leo-accent hover:underline"
            >
              {linkMatch[1]}
            </a>
          );
          remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
          continue;
        }

        // No more matches, add remaining text
        parts.push(<span key={partKey++}>{remaining}</span>);
        break;
      }

      return parts.length === 1 ? parts[0] : parts;
    };

    const parseRemainingInline = (text: string, baseKey: number): React.ReactNode => {
      return <span key={baseKey}>{text}</span>;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';

      // Code block start/end
      if (line.startsWith('```')) {
        if (codeBlock) {
          // End code block
          flushList();
          elements.push(
            <CodeBlock
              key={key++}
              code={codeBlock.lines.join('\n')}
              language={codeBlock.language}
            />
          );
          codeBlock = null;
        } else {
          // Start code block
          flushList();
          codeBlock = {
            language: line.slice(3).trim() || undefined,
            lines: [],
          };
        }
        continue;
      }

      // Inside code block
      if (codeBlock) {
        codeBlock.lines.push(line);
        continue;
      }

      // Headers
      const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headerMatch && headerMatch[1] && headerMatch[2]) {
        flushList();
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        const HeaderTag = `h${level + 1}` as keyof JSX.IntrinsicElements;
        elements.push(
          <HeaderTag
            key={key++}
            className={cn(
              'font-heading font-semibold text-white mt-4 mb-2',
              level === 1 && 'text-xl',
              level === 2 && 'text-lg',
              level === 3 && 'text-base'
            )}
          >
            {parseInline(text)}
          </HeaderTag>
        );
        continue;
      }

      // Unordered list
      const ulMatch = line.match(/^[-*]\s+(.+)$/);
      if (ulMatch && ulMatch[1]) {
        if (!listItems || listItems.ordered) {
          flushList();
          listItems = { ordered: false, items: [] };
        }
        listItems.items.push(ulMatch[1]);
        continue;
      }

      // Ordered list
      const olMatch = line.match(/^\d+\.\s+(.+)$/);
      if (olMatch && olMatch[1]) {
        if (!listItems || !listItems.ordered) {
          flushList();
          listItems = { ordered: true, items: [] };
        }
        listItems.items.push(olMatch[1]);
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        flushList();
        continue;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={key++} className="leading-relaxed text-white/90 my-1">
          {parseInline(line)}
        </p>
      );
    }

    // Flush remaining
    flushList();
    if (codeBlock) {
      elements.push(
        <CodeBlock
          key={key++}
          code={codeBlock.lines.join('\n')}
          language={codeBlock.language}
        />
      );
    }

    return elements;
  }, [content]);

  return (
    <div className={cn('markdown-content', className)}>
      {rendered}
    </div>
  );
});

export default MarkdownRenderer;
