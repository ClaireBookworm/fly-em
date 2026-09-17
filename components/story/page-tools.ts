/* Effects bind a stable browser-tool registration to current React handlers. */
/* oxlint-disable react/react-compiler */
'use client';
import { useEffect, useRef } from 'react';
export type PageTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: object;
  execute: (input: unknown) => unknown;
};
export function requireEmpty(input: unknown) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).length
  )
    throw Error('Expected an empty object.');
}
export function usePageTools(tools: PageTool[]) {
  const current = useRef(tools);
  current.current = tools;
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            t: PageTool,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    for (const tool of current.current)
      try {
        void Promise.resolve(
          context.registerTool(
            {
              ...tool,
              execute: (input) =>
                current.current
                  .find((t) => t.name === tool.name)!
                  .execute(input),
            },
            { signal: life.signal },
          ),
        ).catch(() => {});
      } catch {}
    return () => life.abort();
  }, []);
}
