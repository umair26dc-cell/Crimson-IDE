import { LanguageId } from '../types';

export interface FileStructureTemplate {
  id: string;
  name: string;
  description: string;
  extension: string;
  language: LanguageId;
  generate: (baseName: string) => string;
}

/**
 * Converts a filename into a PascalCase component/class name
 */
export function toPascalCase(str: string): string {
  const clean = str.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]+/g, ' ');
  return clean
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') || 'Component';
}

/**
 * Clean minimal templates without premade demo bloat or titles,
 * with an empty CSS block where applicable.
 */
export const STARTER_STRUCTURES: Record<string, (baseName: string) => { content: string; language: LanguageId; structureName: string }> = {
  // React TypeScript Component
  tsx: (name: string) => {
    const componentName = toPascalCase(name);
    return {
      structureName: 'React Component (TSX)',
      language: 'typescript',
      content: `import React from 'react';

export default function ${componentName}() {
  return (
    <div>

    </div>
  );
}
`,
    };
  },

  // TypeScript Module
  ts: () => {
    return {
      structureName: 'TypeScript File',
      language: 'typescript',
      content: `export {};
`,
    };
  },

  // React JavaScript Component
  jsx: (name: string) => {
    const componentName = toPascalCase(name);
    return {
      structureName: 'React Component (JSX)',
      language: 'javascript',
      content: `import React from 'react';

export default function ${componentName}() {
  return (
    <div>

    </div>
  );
}
`,
    };
  },

  // JavaScript
  js: () => {
    return {
      structureName: 'JavaScript File',
      language: 'javascript',
      content: `//
`,
    };
  },

  // Python Script
  py: () => {
    return {
      structureName: 'Python File',
      language: 'python',
      content: `def main():
    pass


if __name__ == "__main__":
    main()
`,
    };
  },

  // Rust
  rs: () => {
    return {
      structureName: 'Rust File',
      language: 'rust',
      content: `fn main() {

}
`,
    };
  },

  // Go
  go: () => {
    return {
      structureName: 'Go File',
      language: 'go',
      content: `package main

func main() {

}
`,
    };
  },

  // HTML5 Document - without title, with an empty CSS block
  html: () => {
    return {
      structureName: 'HTML5 Document',
      language: 'html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>

  </style>
</head>
<body>

</body>
</html>
`,
    };
  },

  // CSS Stylesheet - empty CSS block
  css: () => {
    return {
      structureName: 'CSS Stylesheet',
      language: 'css',
      content: `* {

}
`,
    };
  },

  // JSON Configuration
  json: () => {
    return {
      structureName: 'JSON File',
      language: 'json',
      content: `{}
`,
    };
  },

  // Markdown Document
  md: () => {
    return {
      structureName: 'Markdown Document',
      language: 'markdown',
      content: `# 
`,
    };
  },

  // SQL Schema
  sql: () => {
    return {
      structureName: 'SQL File',
      language: 'sql',
      content: `--
`,
    };
  },

  // Bash Shell Script
  sh: () => {
    return {
      structureName: 'Shell Script',
      language: 'shell',
      content: `#!/usr/bin/env bash

`,
    };
  },

  // YAML Config
  yaml: () => {
    return {
      structureName: 'YAML File',
      language: 'json',
      content: `#
`,
    };
  },
};

/**
 * Given a filename, returns the clean minimal starter structure
 */
export function getStarterStructureForFile(fileName: string): {
  content: string;
  language: LanguageId;
  structureName: string;
} {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (STARTER_STRUCTURES[ext]) {
    return STARTER_STRUCTURES[ext](fileName);
  }

  if (ext === 'yml') {
    return STARTER_STRUCTURES.yaml(fileName);
  }

  return {
    content: '',
    language: 'plaintext',
    structureName: 'Plain Document',
  };
}
