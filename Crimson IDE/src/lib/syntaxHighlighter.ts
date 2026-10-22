/**
 * Extensible Multi-Language Syntax Highlighting Engine
 * Powered by Prism.js with custom Crimson token rendering and extension registry
 */

import Prism from 'prismjs';

// Base and common language grammars
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

import { LanguageId } from '../types';

export interface CustomGrammarExtension {
  id: string;
  name: string;
  language: string;
  tokens: Record<string, RegExp | { pattern: RegExp; alias?: string; greedy?: boolean }>;
}

class SyntaxHighlighterRegistry {
  private customGrammars: Map<string, CustomGrammarExtension> = new Map();

  constructor() {
    this.registerCustomCrimsonKeywords();
  }

  /**
   * Enhances default languages with crimson highlighted keywords and decorators
   */
  private registerCustomCrimsonKeywords() {
    // Add special highlighting for async, await, return, import, export
    const ts = Prism.languages.typescript || Prism.languages.javascript;
    if (ts && ts.keyword) {
      // Prism allows extending tokens
    }
  }

  /**
   * Extensibility API: Allows plugins to register new language grammars or override existing ones
   */
  public registerLanguageGrammar(extension: CustomGrammarExtension): boolean {
    try {
      this.customGrammars.set(extension.id, extension);
      Prism.languages[extension.language] = Prism.languages.extend(
        'clike',
        extension.tokens as any
      );
      return true;
    } catch {
      return false;
    }
  }

  public unregisterLanguageGrammar(id: string): void {
    const ext = this.customGrammars.get(id);
    if (ext) {
      this.customGrammars.delete(id);
    }
  }

  /**
   * Highlights code string and returns HTML with Crimson-tuned token classes
   */
  public highlightCode(code: string, language: LanguageId | string): string {
    const langKey = this.mapLanguageKey(language);
    const grammar = Prism.languages[langKey] || Prism.languages.javascript || Prism.languages.clike;
    
    try {
      return Prism.highlight(code, grammar, langKey);
    } catch {
      // Fallback: escape HTML
      return code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }

  public mapLanguageKey(language: string): string {
    switch (language) {
      case 'typescript':
        return Prism.languages.tsx ? 'tsx' : 'typescript';
      case 'javascript':
        return Prism.languages.jsx ? 'jsx' : 'javascript';
      case 'python':
        return 'python';
      case 'rust':
        return 'rust';
      case 'go':
        return 'go';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'markdown':
        return 'markdown';
      case 'shell':
        return 'bash';
      case 'sql':
        return 'sql';
      case 'yaml':
        return 'yaml';
      case 'cpp':
        return 'cpp';
      default:
        return 'javascript';
    }
  }
}

export const syntaxEngine = new SyntaxHighlighterRegistry();

/**
 * Minimap Syntax Theme Color Palettes
 * Grounded in the existing Prism.js Crimson theme from index.css,
 * dynamically modulated for each crimson shade preference.
 */
export interface PrismMinimapTheme {
  comment: string;
  punctuation: string;
  keyword: string;
  function: string;
  className: string;
  string: string;
  number: string;
  operator: string;
  property: string;
  variable: string;
  tag: string;
  default: string;
}

export const PRISM_CRIMSON_THEMES: Record<'classic' | 'ruby' | 'neon' | 'garnet', PrismMinimapTheme> = {
  classic: {
    comment: '#64748b',
    punctuation: '#94a3b8',
    keyword: '#ff2a5f',
    function: '#fb7185',
    className: '#f43f5e',
    string: '#fda4af',
    number: '#f87171',
    operator: '#cbd5e1',
    property: '#f87171',
    variable: '#f43f5e',
    tag: '#fb7185',
    default: '#cbd5e1',
  },
  ruby: {
    comment: '#64748b',
    punctuation: '#94a3b8',
    keyword: '#ef4444',
    function: '#f87171',
    className: '#dc2626',
    string: '#fca5a5',
    number: '#fb923c',
    operator: '#cbd5e1',
    property: '#f87171',
    variable: '#ef4444',
    tag: '#f87171',
    default: '#cbd5e1',
  },
  neon: {
    comment: '#64748b',
    punctuation: '#94a3b8',
    keyword: '#ec4899',
    function: '#f472b6',
    className: '#db2777',
    string: '#fbcfe8',
    number: '#fb7185',
    operator: '#e2e8f0',
    property: '#fb7185',
    variable: '#ec4899',
    tag: '#f472b6',
    default: '#e2e8f0',
  },
  garnet: {
    comment: '#64748b',
    punctuation: '#94a3b8',
    keyword: '#e11d48',
    function: '#f43f5e',
    className: '#be123c',
    string: '#fda4af',
    number: '#e11d48',
    operator: '#cbd5e1',
    property: '#fda4af',
    variable: '#be123c',
    tag: '#f43f5e',
    default: '#cbd5e1',
  },
};

/**
 * Maps a Prism token type string to a specific theme color hex
 */
export function getMinimapTokenColor(type: string, theme: PrismMinimapTheme): string {
  switch (type) {
    case 'comment':
    case 'prolog':
    case 'doctype':
    case 'cdata':
      return theme.comment;
    case 'punctuation':
      return theme.punctuation;
    case 'keyword':
    case 'atrule':
    case 'attr-value':
      return theme.keyword;
    case 'function':
      return theme.function;
    case 'class-name':
    case 'type':
      return theme.className;
    case 'string':
    case 'char':
    case 'selector':
    case 'builtin':
    case 'inserted':
    case 'attr-name':
      return theme.string;
    case 'number':
    case 'boolean':
    case 'constant':
    case 'symbol':
      return theme.number;
    case 'operator':
    case 'entity':
    case 'url':
      return theme.operator;
    case 'property':
    case 'deleted':
      return theme.property;
    case 'variable':
    case 'regex':
    case 'important':
      return theme.variable;
    case 'tag':
      return theme.tag;
    default:
      return theme.default;
  }
}

export interface MinimapTokenSegment {
  charStart: number;
  charEnd: number;
  color: string;
  type: string;
}

export interface MinimapLineTokens {
  lineNumber: number; // 1-indexed
  segments: MinimapTokenSegment[];
  totalLength: number;
  indent: number;
}

/**
 * Tokenizes source code using Prism.js and flattens it into per-line token segments
 * formatted for high-performance canvas minimap rendering.
 */
export function tokenizeForMinimap(
  code: string,
  language: string,
  shade: 'classic' | 'ruby' | 'neon' | 'garnet' = 'ruby'
): MinimapLineTokens[] {
  if (!code) return [];

  const langKey = syntaxEngine.mapLanguageKey(language);
  const grammar = Prism.languages[langKey] || Prism.languages.javascript || Prism.languages.clike;
  const theme = PRISM_CRIMSON_THEMES[shade] || PRISM_CRIMSON_THEMES.ruby;

  let rawTokens: (string | Prism.Token)[];
  try {
    rawTokens = Prism.tokenize(code, grammar);
  } catch {
    // Graceful fallback: produce simple line representations
    return code.split('\n').map((line, idx) => {
      const leadingSpaces = line.search(/\S/);
      const indent = leadingSpaces === -1 ? 0 : leadingSpaces;
      return {
        lineNumber: idx + 1,
        segments: line.trim()
          ? [
              {
                charStart: indent,
                charEnd: line.length,
                color: theme.default,
                type: 'text',
              },
            ]
          : [],
        totalLength: line.length,
        indent,
      };
    });
  }

  const lines: MinimapTokenSegment[][] = [[]];
  let currentLineIdx = 0;
  let currentCol = 0;

  function addSegment(text: string, type: string) {
    if (!text) return;
    const parts = text.split('\n');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i > 0) {
        currentLineIdx++;
        lines[currentLineIdx] = [];
        currentCol = 0;
      }
      if (part.length > 0) {
        // Extract non-whitespace runs so spaces don't draw as colored blocks
        const regex = /\S+/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(part)) !== null) {
          const word = match[0];
          const wordStart = currentCol + match.index;
          const wordEnd = wordStart + word.length;
          const color = getMinimapTokenColor(type, theme);
          lines[currentLineIdx].push({
            charStart: wordStart,
            charEnd: wordEnd,
            color,
            type,
          });
        }
        currentCol += part.length;
      }
    }
  }

  function walk(tokenList: (string | Prism.Token)[], parentType?: string) {
    for (const tok of tokenList) {
      if (typeof tok === 'string') {
        addSegment(tok, parentType || 'text');
      } else {
        const type = tok.type || parentType || 'text';
        if (typeof tok.content === 'string') {
          addSegment(tok.content, type);
        } else if (Array.isArray(tok.content)) {
          walk(tok.content, type);
        } else if (tok.content && typeof tok.content === 'object') {
          walk([tok.content as any], type);
        }
      }
    }
  }

  walk(rawTokens);

  // Guarantee line count matches actual file lines
  const rawLineCount = code.split('\n').length;
  while (lines.length < rawLineCount) {
    lines.push([]);
  }

  return lines.map((segments, idx) => {
    let indent = 0;
    let totalLen = 0;
    if (segments.length > 0) {
      indent = segments[0].charStart;
      totalLen = segments[segments.length - 1].charEnd;
    }
    return {
      lineNumber: idx + 1,
      segments,
      totalLength: totalLen,
      indent,
    };
  });
}
