/**
 * ESLint Workspace Engine & Rule Definitions for CsCode Crimson IDE
 * Provides customizable standard rules, custom regex rules, ignore pattern matching,
 * and .eslintrc.json / .eslintignore generation.
 */

import { Diagnostic, FileItem, UserSettings, CustomEslintRule, EslintRuleSeverity, StandardEslintRuleDef } from '../types';

export const STANDARD_ESLINT_RULES: StandardEslintRuleDef[] = [
  {
    name: 'no-var',
    category: 'Variables',
    description: 'Require let or const instead of var to enforce block scoping',
    defaultSeverity: 'warn',
  },
  {
    name: 'no-console',
    category: 'Best Practices',
    description: 'Disallow the use of console statements (console.log/warn/error)',
    defaultSeverity: 'warn',
  },
  {
    name: 'no-debugger',
    category: 'Best Practices',
    description: 'Disallow debugger statements in production codebase',
    defaultSeverity: 'error',
  },
  {
    name: 'eqeqeq',
    category: 'Best Practices',
    description: 'Require the use of strict equality === and !== instead of == and !=',
    defaultSeverity: 'warn',
  },
  {
    name: 'no-unused-vars',
    category: 'Variables',
    description: 'Disallow declared variables that are never read or referenced',
    defaultSeverity: 'warn',
  },
  {
    name: 'prefer-const',
    category: 'Variables',
    description: 'Require const declarations for variables that are never modified after declaration',
    defaultSeverity: 'warn',
  },
  {
    name: 'no-trailing-spaces',
    category: 'Style',
    description: 'Disallow trailing whitespace at the ends of lines',
    defaultSeverity: 'warn',
  },
  {
    name: 'semi',
    category: 'Style',
    description: 'Require semicolons at the end of statements',
    defaultSeverity: 'off',
  },
  {
    name: 'no-empty',
    category: 'Best Practices',
    description: 'Disallow empty block statements ({})',
    defaultSeverity: 'warn',
  },
  {
    name: 'no-alert',
    category: 'Best Practices',
    description: 'Disallow the use of alert, prompt, and confirm dialogs',
    defaultSeverity: 'error',
  },
  {
    name: 'no-duplicate-imports',
    category: 'Best Practices',
    description: 'Disallow duplicate module imports from the same source path',
    defaultSeverity: 'error',
  },
  {
    name: 'no-explicit-any',
    category: 'TypeScript',
    description: 'Disallow usage of the : any type in TypeScript files',
    defaultSeverity: 'warn',
  },
  {
    name: 'no-eval',
    category: 'Best Practices',
    description: 'Disallow the use of eval() and eval-like code execution',
    defaultSeverity: 'error',
  },
  {
    name: 'no-constant-condition',
    category: 'Best Practices',
    description: 'Disallow constant expressions in conditions, e.g. if (true) or while (1)',
    defaultSeverity: 'warn',
  },
];

export const DEFAULT_ESLINT_RULES: Record<string, EslintRuleSeverity> = {
  'no-var': 'warn',
  'no-console': 'warn',
  'no-debugger': 'error',
  'eqeqeq': 'warn',
  'no-unused-vars': 'warn',
  'prefer-const': 'warn',
  'no-trailing-spaces': 'warn',
  'semi': 'off',
  'no-empty': 'warn',
  'no-alert': 'error',
  'no-duplicate-imports': 'error',
  'no-explicit-any': 'warn',
  'no-eval': 'error',
  'no-constant-condition': 'warn',
};

export const STRICT_ESLINT_RULES: Record<string, EslintRuleSeverity> = {
  'no-var': 'error',
  'no-console': 'error',
  'no-debugger': 'error',
  'eqeqeq': 'error',
  'no-unused-vars': 'error',
  'prefer-const': 'error',
  'no-trailing-spaces': 'error',
  'semi': 'error',
  'no-empty': 'error',
  'no-alert': 'error',
  'no-duplicate-imports': 'error',
  'no-explicit-any': 'error',
  'no-eval': 'error',
  'no-constant-condition': 'error',
};

export const RELAXED_ESLINT_RULES: Record<string, EslintRuleSeverity> = {
  'no-var': 'warn',
  'no-console': 'off',
  'no-debugger': 'warn',
  'eqeqeq': 'off',
  'no-unused-vars': 'off',
  'prefer-const': 'off',
  'no-trailing-spaces': 'off',
  'semi': 'off',
  'no-empty': 'off',
  'no-alert': 'warn',
  'no-duplicate-imports': 'warn',
  'no-explicit-any': 'off',
  'no-eval': 'error',
  'no-constant-condition': 'off',
};

export const DEFAULT_ESLINT_IGNORE: string[] = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '*.min.js',
  '*.d.ts',
  '*.bundle.js',
];

export const DEFAULT_CUSTOM_RULES: CustomEslintRule[] = [
  {
    id: 'rule-no-hardcoded-keys',
    name: 'no-hardcoded-secrets',
    description: 'Flag hardcoded API keys, tokens, or passwords',
    pattern: '(api[_-]?key|secret|password|access[_-]?token)\\s*[:=]\\s*[\'"][a-zA-Z0-9_\\-]{16,}[\'"]',
    message: 'Potential hardcoded secret or token detected in source file',
    severity: 'error',
    isRegex: true,
    extensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    enabled: true,
  },
  {
    id: 'rule-no-direct-eval',
    name: 'no-inner-html',
    description: 'Disallow dangerous innerHTML assignments to prevent XSS vulnerabilities',
    pattern: '\\.innerHTML\\s*=',
    message: 'Direct innerHTML assignment detected. Use textContent or sanitized markup.',
    severity: 'error',
    isRegex: true,
    extensions: ['ts', 'tsx', 'js', 'jsx'],
    enabled: true,
  },
];

/**
 * Checks whether a given file path matches any pattern in the ignore list.
 * Supports globs such as *.min.js, dist/**, vendor/*, etc.
 */
export function isPathIgnored(filePath: string, ignorePatterns: string[] = []): boolean {
  if (!filePath || !ignorePatterns || ignorePatterns.length === 0) return false;
  const cleanPath = filePath.replace(/^\/+/, '');

  for (const rawPattern of ignorePatterns) {
    const pattern = rawPattern.trim().replace(/^\/+/, '');
    if (!pattern || pattern.startsWith('#')) continue;

    // Direct filename wildcard (e.g. *.min.js or *.d.ts)
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (cleanPath.endsWith(ext) || cleanPath.includes(ext)) return true;
    }

    // Directory wildcard (e.g. node_modules/** or dist/*)
    if (pattern.endsWith('/**')) {
      const dir = pattern.slice(0, -3);
      if (cleanPath.startsWith(dir + '/') || cleanPath === dir || cleanPath.includes('/' + dir + '/')) {
        return true;
      }
    } else if (pattern.endsWith('/*')) {
      const dir = pattern.slice(0, -2);
      if (cleanPath.startsWith(dir + '/') || cleanPath.includes('/' + dir + '/')) {
        return true;
      }
    }

    // Directory or folder prefix
    if (pattern.endsWith('/')) {
      if (cleanPath.startsWith(pattern) || cleanPath.includes('/' + pattern)) return true;
    }

    // Exact match or contains
    if (cleanPath === pattern || cleanPath.includes('/' + pattern) || cleanPath.startsWith(pattern + '/')) {
      return true;
    }
  }

  return false;
}

/**
 * Runs the active ESLint configuration (standard rules + custom rules) on a file.
 * Returns an array of Diagnostic items.
 */
export function runEslintOnContent(
  file: FileItem,
  settings: UserSettings
): Diagnostic[] {
  if (!file || !file.content || file.isFolder) return [];

  // Check if ESLint is globally enabled
  if (settings.eslintEnabled === false) return [];

  // Check if file is ignored
  const ignoreList = settings.eslintIgnorePatterns || DEFAULT_ESLINT_IGNORE;
  if (isPathIgnored(file.path, ignoreList)) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];
  const rules = settings.eslintRules || DEFAULT_ESLINT_RULES;
  const customRules = settings.eslintCustomRules || DEFAULT_CUSTOM_RULES;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isScript = ['typescript', 'javascript'].includes(file.language || '') || ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext);

  const lines = file.content.split('\n');

  // 1. Standard Built-in Rules
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      // Still check trailing spaces even on comments/blanks
      if (rules['no-trailing-spaces'] && rules['no-trailing-spaces'] !== 'off' && (line.endsWith(' ') || line.endsWith('\t'))) {
        diagnostics.push({
          id: `eslint-ws-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: line.length,
          message: 'Trailing whitespace detected (no-trailing-spaces)',
          severity: rules['no-trailing-spaces'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
      return;
    }

    // Trailing spaces
    if (rules['no-trailing-spaces'] && rules['no-trailing-spaces'] !== 'off' && (line.endsWith(' ') || line.endsWith('\t'))) {
      diagnostics.push({
        id: `eslint-ws-${file.id}-${lineNum}`,
        filePath: file.path,
        line: lineNum,
        col: line.length,
        message: 'Trailing whitespace detected (no-trailing-spaces)',
        severity: rules['no-trailing-spaces'] === 'error' ? 'error' : 'warning',
        source: 'ESLint',
      });
    }

    if (!isScript) return;

    // no-var
    if (rules['no-var'] && rules['no-var'] !== 'off') {
      const match = line.match(/\bvar\s+([a-zA-Z0-9_$]+)/);
      if (match && match.index !== undefined) {
        diagnostics.push({
          id: `eslint-var-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: match.index + 1,
          message: 'Unexpected var, use let or const instead (no-var)',
          severity: rules['no-var'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
    }

    // no-console
    if (rules['no-console'] && rules['no-console'] !== 'off') {
      const match = line.match(/\bconsole\.(log|info|debug|warn|error|trace)\s*\(/);
      if (match && match.index !== undefined) {
        diagnostics.push({
          id: `eslint-console-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: match.index + 1,
          message: `Unexpected console.${match[1]} statement (no-console)`,
          severity: rules['no-console'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
    }

    // no-debugger
    if (rules['no-debugger'] && rules['no-debugger'] !== 'off') {
      const match = line.match(/\bdebugger\b/);
      if (match && match.index !== undefined) {
        diagnostics.push({
          id: `eslint-debugger-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: match.index + 1,
          message: 'Unexpected debugger statement (no-debugger)',
          severity: rules['no-debugger'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
    }

    // eqeqeq
    if (rules['eqeqeq'] && rules['eqeqeq'] !== 'off') {
      const match = line.match(/([^=!<>]|^)\s*(==|!=)\s*([^=]|$)/);
      if (match && match.index !== undefined) {
        const op = match[2];
        const strictOp = op === '==' ? '===' : '!==';
        diagnostics.push({
          id: `eslint-eqeqeq-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: match.index + 1,
          message: `Expected '${strictOp}' and instead saw '${op}' (eqeqeq)`,
          severity: rules['eqeqeq'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
    }

    // no-alert
    if (rules['no-alert'] && rules['no-alert'] !== 'off') {
      const match = line.match(/\b(alert|prompt|confirm)\s*\(/);
      if (match && match.index !== undefined) {
        diagnostics.push({
          id: `eslint-alert-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: match.index + 1,
          message: `Unexpected '${match[1]}' dialog statement (no-alert)`,
          severity: rules['no-alert'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
    }

    // no-eval
    if (rules['no-eval'] && rules['no-eval'] !== 'off') {
      const match = line.match(/\beval\s*\(/);
      if (match && match.index !== undefined) {
        diagnostics.push({
          id: `eslint-eval-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: match.index + 1,
          message: 'eval can be harmful, avoid dynamic evaluation (no-eval)',
          severity: rules['no-eval'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
    }

    // no-constant-condition
    if (rules['no-constant-condition'] && rules['no-constant-condition'] !== 'off') {
      const match = line.match(/\b(if|while)\s*\(\s*(true|false|1|0)\s*\)/);
      if (match && match.index !== undefined) {
        diagnostics.push({
          id: `eslint-const-cond-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: match.index + 1,
          message: `Unexpected constant condition '${match[2]}' in ${match[1]} statement (no-constant-condition)`,
          severity: rules['no-constant-condition'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
    }

    // no-explicit-any (TypeScript only)
    if (rules['no-explicit-any'] && rules['no-explicit-any'] !== 'off' && (file.language === 'typescript' || ext === 'ts' || ext === 'tsx')) {
      const match = line.match(/:\s*any\b/);
      if (match && match.index !== undefined) {
        diagnostics.push({
          id: `eslint-any-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: match.index + 1,
          message: 'Unexpected any. Specify a more specific type (no-explicit-any)',
          severity: rules['no-explicit-any'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
    }

    // semi (Missing semicolon on statements)
    if (rules['semi'] && rules['semi'] !== 'off') {
      if (
        (line.startsWith('const ') || line.startsWith('let ') || line.startsWith('import ') || line.startsWith('return ')) &&
        !line.endsWith(';') &&
        !line.endsWith('{') &&
        !line.endsWith('(') &&
        !line.endsWith(',')
      ) {
        diagnostics.push({
          id: `eslint-semi-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: line.length + 1,
          message: 'Missing semicolon at the end of statement (semi)',
          severity: rules['semi'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
    }

    // no-empty
    if (rules['no-empty'] && rules['no-empty'] !== 'off') {
      const match = line.match(/\b(catch|if|for|while)\s*\(.*?\)\s*\{\s*\}/);
      if (match && match.index !== undefined) {
        diagnostics.push({
          id: `eslint-empty-${file.id}-${lineNum}`,
          filePath: file.path,
          line: lineNum,
          col: match.index + 1,
          message: `Empty block statement in ${match[1]} (no-empty)`,
          severity: rules['no-empty'] === 'error' ? 'error' : 'warning',
          source: 'ESLint',
        });
      }
    }
  });

  // 2. Custom User-Defined Workspace Rules
  if (customRules && customRules.length > 0) {
    customRules.forEach((rule) => {
      if (rule.enabled === false) return;
      if (rule.extensions && rule.extensions.length > 0) {
        if (!rule.extensions.includes(ext) && !rule.extensions.includes(file.language || '')) {
          return;
        }
      }

      let regex: RegExp | null = null;
      try {
        regex = rule.isRegex !== false ? new RegExp(rule.pattern, 'gi') : null;
      } catch (err) {
        console.error('Invalid custom ESLint rule regex pattern:', rule.pattern, err);
        return;
      }

      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        if (!line.trim()) return;

        if (regex) {
          regex.lastIndex = 0;
          let match: RegExpExecArray | null = null;
          while ((match = regex.exec(line)) !== null) {
            diagnostics.push({
              id: `custom-rule-${rule.id}-${file.id}-${lineNum}-${match.index}`,
              filePath: file.path,
              line: lineNum,
              col: match.index + 1,
              message: `${rule.message} (${rule.name})`,
              severity: rule.severity,
              source: `ESLint (${rule.name})`,
            });
            if (!regex.global) break;
          }
        } else {
          // Plain text substring
          const col = line.indexOf(rule.pattern);
          if (col !== -1) {
            diagnostics.push({
              id: `custom-rule-${rule.id}-${file.id}-${lineNum}-${col}`,
              filePath: file.path,
              line: lineNum,
              col: col + 1,
              message: `${rule.message} (${rule.name})`,
              severity: rule.severity,
              source: `ESLint (${rule.name})`,
            });
          }
        }
      });
    });
  }

  return diagnostics;
}

/**
 * Generates .eslintrc.json file content based on the user's active configuration.
 */
export function generateEslintRcJson(
  rules: Record<string, EslintRuleSeverity>,
  customRules: CustomEslintRule[] = []
): string {
  const config = {
    root: true,
    env: {
      browser: true,
      es2022: true,
      node: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
    },
    plugins: ['@typescript-eslint'],
    rules: { ...rules },
    _crimsonCustomRules: customRules.map((r) => ({
      name: r.name,
      pattern: r.pattern,
      message: r.message,
      severity: r.severity,
      enabled: r.enabled !== false,
      extensions: r.extensions || ['ts', 'tsx', 'js', 'jsx'],
    })),
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generates .eslintignore file content based on ignore patterns.
 */
export function generateEslintIgnore(patterns: string[]): string {
  const header = '# CsCode Crimson IDE - ESLint Ignore Configuration\n# Files matching these patterns are excluded from lint checks\n\n';
  return header + patterns.join('\n') + '\n';
}
