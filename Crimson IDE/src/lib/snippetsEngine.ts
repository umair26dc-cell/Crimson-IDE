/**
 * Code Snippets Engine & Template Expander
 * Provides built-in snippets for standard languages and supports custom user snippets.
 */

import { CustomCodeSnippet, LanguageId } from '../types';

export const DEFAULT_SNIPPETS: CustomCodeSnippet[] = [
  {
    id: 'react-functional-component',
    name: 'React Functional Component',
    prefix: 'rfc',
    language: 'typescript',
    description: 'Generates a React 19 functional component boilerplate with typed props',
    body: `import React from 'react';

interface ComponentProps {
  title?: string;
  className?: string;
}

export const MyComponent: React.FC<ComponentProps> = ({ title = 'Hello', className = '' }) => {
  return (
    <div className={\`p-4 rounded-lg border border-slate-800 bg-slate-900 \${className}\`}>
      <h2 className="text-base font-semibold text-rose-400">{title}</h2>
      <p className="text-xs text-slate-400 mt-1">Component ready.</p>
    </div>
  );
};
`,
  },
  {
    id: 'async-arrow-function',
    name: 'Async Arrow Function',
    prefix: 'aaf',
    language: 'typescript',
    description: 'Generates a typed async arrow function with try/catch error handling',
    body: `const fetchData = async (endpoint: string): Promise<any> => {
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(\`HTTP error! status: \${res.status}\`);
    return await res.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
`,
  },
  {
    id: 'console-log-var',
    name: 'Console Log with Label',
    prefix: 'clg',
    language: 'all',
    description: 'Quick console.log with formatted variable inspection',
    body: `console.log('[DEBUG]', { targetVar });`,
  },
  {
    id: 'css-flex-center',
    name: 'CSS Flexbox Center',
    prefix: 'fcenter',
    language: 'css',
    description: 'CSS rules to perfectly center children with flexbox',
    body: `display: flex;
align-items: center;
justify-content: center;`,
  },
  {
    id: 'html5-boilerplate',
    name: 'HTML5 Boilerplate',
    prefix: 'html5',
    language: 'html',
    description: 'Clean HTML5 document with charset, viewport, and stylesheet link',
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0a0b10; color: #f1f5f9; font-family: sans-serif; }
  </style>
</head>
<body>
  <main id="app">
    <h1>CsCode Workspace</h1>
  </main>
</body>
</html>`,
  },
  {
    id: 'python-main-boilerplate',
    name: 'Python Main Script',
    prefix: 'pymain',
    language: 'python',
    description: 'Python 3 script boilerplate with main entry point and type hints',
    body: `from typing import List, Dict, Any
import sys

def main() -> None:
    print("Execution started...")

if __name__ == "__main__":
    main()
`,
  },
];

export function getSnippetsForLanguage(snippets: CustomCodeSnippet[] | undefined, language: LanguageId): CustomCodeSnippet[] {
  const allSnippets = snippets && snippets.length > 0 ? snippets : DEFAULT_SNIPPETS;
  return allSnippets.filter((s) => s.language === 'all' || s.language === language);
}
