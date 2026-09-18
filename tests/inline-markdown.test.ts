import test from 'node:test';
import assert from 'node:assert/strict';
import { renderInlineMarkdown } from '../lib/inline-markdown.ts';

void test('author emphasis and nested bold render without adding paragraph wrappers', () => {
  assert.equal(
    renderInlineMarkdown(
      'The *Sodium channels* respond to a **strong *input***.',
    ),
    'The <em>Sodium channels</em> respond to a <strong>strong <em>input</em></strong>.',
  );
});
void test('literal stars, code and cell comparison text survive intact', () => {
  assert.equal(
    renderInlineMarkdown('Cell <> Cell; \\*literal\\*; `*code*`'),
    'Cell &lt;&gt; Cell; *literal*; <code>*code*</code>',
  );
});
void test('inline links and line breaks work while HTML and script links stay inert', () => {
  assert.equal(
    renderInlineMarkdown('[Source](https://example.com)\nnext line'),
    '<a href="https://example.com">Source</a><br>\nnext line',
  );
  const unsafe = renderInlineMarkdown(
    '<img src=x onerror=alert(1)> [bad](javascript:alert(1)) ![pic](https://example.com/image.png)',
  );
  assert.ok(!unsafe.includes('<img'));
  assert.ok(!unsafe.includes('href="javascript:'));
  assert.ok(unsafe.includes('&lt;img'));
});
