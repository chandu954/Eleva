import { describe, expect, it } from 'vitest';
import { sanitizeRichTextHtml, toSafeJsonScript } from './html-safety';

describe('sanitizeRichTextHtml', () => {
  it('keeps benign rich text intact', () => {
    const html = '<p class="lead">Hello <b>world</b> &amp; welcome</p><a href="https://eleva.example">docs</a>';
    expect(sanitizeRichTextHtml(html)).toBe(html);
  });

  it('strips script, style, iframe, object, embed and unsafe-element wrappers with their contents', () => {
    const html = [
      'before<script>evil()</script>after',
      'a<style>.evil{}</style>b',
      'c<iframe src="//x"></iframe>d',
      'e<object data="//x"></object>f',
      'g<embed src="//x"></embed>h',
    ].join('');
    expect(sanitizeRichTextHtml(html)).toBe('beforeafterabcdefgh');
  });

  it('strips svg and math wrappers, unclosed void elements and form elements', () => {
    const html = '<svg><circle/></svg>ok<form action="/x"><input type="text"></form>';
    // input has a void pattern (<input[^>]*>); form/svg strip with contents
    expect(sanitizeRichTextHtml(html)).toBe('ok');
  });

  it('removes strip-listed button, link, meta and base elements', () => {
    const html = 'a<button onclick="x">b</button>c<link rel="stylesheet" href="//x">d<meta charset="utf-8">e<base href="//x">f';
    expect(sanitizeRichTextHtml(html)).toBe('acdef');
  });

  it('removes inline event handlers (on*) everywhere', () => {
    expect(sanitizeRichTextHtml('<a href="/ok" onclick="evil()" onmouseover=a>E</a>')).toBe('<a href="/ok">E</a>');
  });

  it('removes srcdoc from iframes', () => {
    const html = '<iframe srcdoc="&lt;script&gt;evil()&lt;/script&gt;" src="/ok"></iframe>';
    expect(sanitizeRichTextHtml(html)).not.toContain('srcdoc');
  });

  it('removes javascript: and data:text/html URLs from href, src and xlink:href', () => {
    expect(sanitizeRichTextHtml('<a href="javascript:evil()">E</a>')).toBe('<a>E</a>');
    expect(sanitizeRichTextHtml('<a href="  javascript:evil()">E</a>')).toBe('<a>E</a>');
    expect(sanitizeRichTextHtml("<a href='javascript:evil()'>E</a>")).toBe('<a>E</a>');
    expect(sanitizeRichTextHtml('<A HREF="JAVASCRIPT:evil()">E</A>')).toBe('<A>E</A>');
    expect(sanitizeRichTextHtml('<img src="data:text/html;base64,PGI+">')).toBe('<img>');
    expect(sanitizeRichTextHtml('<use xlink:href="javascript:evil()" />')).toBe('<use />');
  });

  it('leaves non-javascript data: URLs and other schemes untouched', () => {
    const html = '<img src="data:image/png;base64,abc"><a href="mailto:hi@example.com">m</a>';
    expect(sanitizeRichTextHtml(html)).toBe(html);
  });
});

describe('toSafeJsonScript', () => {
  it('escapes angle brackets and ampersands; slashes are left as-is', () => {
    expect(toSafeJsonScript('<script>&</script>')).toBe('"\\u003cscript\\u003e\\u0026\\u003c/script\\u003e"');
  });

  it('escapes U+2028 and U+2029 line separators that would terminate a script block', () => {
    const out = toSafeJsonScript('a\u2028b\u2029c');
    expect(out).toBe('"a\\u2028b\\u2029c"');
    expect(out).not.toContain('\u2028');
  });

  it('parses back to the same value and never contains raw angle brackets or ampersands', () => {
    const value = { a: '<>', amp: '&', sep: '\u2028\u2029' };
    const out = toSafeJsonScript(value);
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out)).toEqual(value);
  });
});
