/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { escapeHtml, html, getTopicDisplayName } from '../utils/dom.js';

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('preserves quotes in text (DOM textContent → innerHTML)', () => {
    const out = escapeHtml('"hello"');
    expect(out).toContain('hello');
    expect(out).not.toContain('<');
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('passes through safe strings unchanged', () => {
    expect(escapeHtml('Hello world')).toBe('Hello world');
  });
});

describe('html tagged template', () => {
  it('auto-escapes interpolated values', () => {
    const val = '<b>bold</b>';
    const result = html`<p>${val}</p>`;
    expect(result).toBe('<p>&lt;b&gt;bold&lt;/b&gt;</p>');
  });

  it('passes raw values through unescaped', () => {
    const rawVal = '<b>bold</b>';
    const result = html`<p>${html.raw(rawVal)}</p>`;
    expect(result).toBe('<p><b>bold</b></p>');
  });

  it('handles null values gracefully', () => {
    const result = html`<p>${null}</p>`;
    expect(result).toBe('<p></p>');
  });

  it('handles multiple interpolations', () => {
    const a = 'Hello';
    const b = '<World>';
    const result = html`<p>${a} ${b}</p>`;
    expect(result).toBe('<p>Hello &lt;World&gt;</p>');
  });
});

describe('getTopicDisplayName', () => {
  it('returns nameShort when compact and available', () => {
    const topic = { name: 'Full Name', nameShort: 'Short' };
    expect(getTopicDisplayName(topic, true)).toBe('Short');
  });

  it('returns full name when compact but no nameShort', () => {
    const topic = { name: 'Full Name' };
    expect(getTopicDisplayName(topic, true)).toBe('Full Name');
  });

  it('returns full name when compact is false', () => {
    const topic = { name: 'Full Name', nameShort: 'Short' };
    expect(getTopicDisplayName(topic, false)).toBe('Full Name');
  });

  it('returns empty string for null topic', () => {
    expect(getTopicDisplayName(null)).toBe('');
  });
});
