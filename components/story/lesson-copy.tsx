/* Markdown HTML is escaped and links are validated by the inline parser. */
import type { HTMLAttributes, ReactNode } from 'react';
import publishedCopy from '@/content/learn-wording.json';
import { renderInlineMarkdown } from '@/lib/inline-markdown';

export const publishedWording: Record<string, string> = publishedCopy;

export function LessonCopy({
  as: Tag = 'p',
  copyId,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
  copyId: string;
  children: ReactNode;
}) {
  const visible = publishedWording[copyId] ?? children;
  if (typeof visible === 'string' && visible.trim() === '') return null;
  return (
    <Tag {...props} data-copy-id={copyId}>
      {typeof visible === 'string' ? (
        <span
          className="copy-markdown"
          dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(visible) }}
        />
      ) : (
        visible
      )}
    </Tag>
  );
}
