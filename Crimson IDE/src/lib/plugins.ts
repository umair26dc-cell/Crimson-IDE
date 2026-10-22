/**
 * Modular Plugin System & Marketplace Registry for CsCode Crimson Code
 * Supports packaging, distribution, installation, updates, uninstallation,
 * and security sandboxing across Language Support, Linters, Debuggers, and UI Enhancements.
 */

import { PluginDefinition, PluginPackageDraft, PluginCategory } from '../types';

export const MARKETPLACE_CATALOGUE: PluginDefinition[] = [
  // LANGUAGE SUPPORT
  {
    id: 'python-lsp',
    name: 'Python Language Server',
    version: '3.2.0',
    latestVersion: '3.2.1', // update available!
    installedVersion: '3.2.0',
    author: 'PyDev Foundation',
    description: 'Rich Python syntax highlighting, PyRight type checking, auto-imports, and docstring hover tooltips.',
    category: 'Language Support',
    icon: 'python',
    enabled: true,
    installed: true,
    downloads: '340k',
    rating: 4.9,
    permissions: ['workspace:read', 'diagnostics'],
    readme: `# Python LSP\n\nFull Python 3.12+ language support with virtualenv discovery and static typing diagnostics.`,
    changelog: 'v3.2.1: Fixed type inference on async generators.',
    hooks: { onLanguageRegister: ['python'] }
  },
  {
    id: 'rust-analyzer',
    name: 'Rust Analyzer & Cargo',
    version: '2.8.1',
    latestVersion: '2.8.1',
    author: 'Rust Crimson Workgroup',
    description: 'IntelliSense, Cargo dependency resolution, macro expansion, and borrow-checker diagnostics for Rust projects.',
    category: 'Language Support',
    icon: 'rust',
    enabled: false,
    installed: false,
    downloads: '210k',
    rating: 4.9,
    permissions: ['workspace:read', 'terminal:exec'],
    readme: `# Rust Analyzer\n\nFast symbol navigation and compiler-driven linting for Rust.`,
    hooks: { onLanguageRegister: ['rust'] }
  },
  {
    id: 'go-tools',
    name: 'Go Language Tools',
    version: '1.9.0',
    latestVersion: '1.9.0',
    author: 'GopherLab',
    description: 'Gofmt on save, Go module graph visualization, and lightning-fast package symbol lookup.',
    category: 'Language Support',
    icon: 'code',
    enabled: false,
    installed: false,
    downloads: '180k',
    rating: 4.8,
    permissions: ['workspace:read', 'workspace:write']
  },
  {
    id: 'tailwind-intellisense',
    name: 'Tailwind CSS IntelliSense',
    version: '4.0.2',
    latestVersion: '4.0.2',
    author: 'Tailwind Labs',
    description: 'Intelligent class name autocompletion, CSS preview hover popups, and linting for Tailwind utilities.',
    category: 'Language Support',
    icon: 'palette',
    enabled: true,
    installed: true,
    downloads: '520k',
    rating: 4.9,
    permissions: ['editor:decorations']
  },

  // LINTERS
  {
    id: 'eslint-pro',
    name: 'ESLint Pro Crimson',
    version: '8.56.0',
    latestVersion: '8.56.0',
    installedVersion: '8.56.0',
    author: 'Linting Masters',
    description: 'Integrates ESLint with custom high-contrast error and warning squiggles in the Crimson editor gutter.',
    category: 'Linters',
    icon: 'shield',
    enabled: true,
    installed: true,
    downloads: '610k',
    rating: 4.9,
    permissions: ['diagnostics', 'workspace:read'],
    config: [
      { key: 'autoFixOnSave', label: 'Auto-Fix on Save', type: 'boolean', value: true }
    ]
  },
  {
    id: 'sonarlint',
    name: 'SonarLint Clean Code',
    version: '4.1.0',
    latestVersion: '4.2.0', // update available!
    installedVersion: '4.1.0',
    author: 'SonarSource',
    description: 'Detects code smells, security vulnerabilities, and memory leaks on-the-fly before committing.',
    category: 'Linters',
    icon: 'bug',
    enabled: false,
    installed: false,
    downloads: '190k',
    rating: 4.8,
    permissions: ['diagnostics', 'workspace:read']
  },

  // DEBUGGERS
  {
    id: 'node-debugger',
    name: 'Node.js V8 Debugger',
    version: '2.1.0',
    latestVersion: '2.1.0',
    installedVersion: '2.1.0',
    author: 'Runtime Systems',
    description: 'Interactive breakpoint debugging, call stack inspection, local variable watch expressions, and console logging.',
    category: 'Debuggers',
    icon: 'chip',
    enabled: true,
    installed: true,
    downloads: '270k',
    rating: 4.8,
    permissions: ['debugger:control', 'terminal:exec'],
    readme: `# Node.js V8 Debugger\n\nAttach to local or remote Node.js processes with source map support.`
  },
  {
    id: 'python-pdb',
    name: 'Python Interactive PDB',
    version: '1.4.0',
    latestVersion: '1.4.0',
    author: 'PyDev Foundation',
    description: 'Full PDB integration with step-over, step-into, and interactive variable inspection.',
    category: 'Debuggers',
    icon: 'terminal',
    enabled: false,
    installed: false,
    downloads: '130k',
    rating: 4.7,
    permissions: ['debugger:control']
  },

  // UI ENHANCEMENTS
  {
    id: 'bracket-colorizer',
    name: 'Crimson Bracket Pair Colorizer',
    version: '3.0.1',
    latestVersion: '3.0.1',
    installedVersion: '3.0.1',
    author: 'Rainbow Design',
    description: 'Color-codes matching brackets with glowing crimson and ruby tonal ramps for rapid visual nesting parsing.',
    category: 'UI Enhancements',
    icon: 'layerGroup',
    enabled: true,
    installed: true,
    downloads: '430k',
    rating: 5.0,
    permissions: ['editor:decorations']
  },
  {
    id: 'git-graph',
    name: 'Crimson Git Graph',
    version: '2.6.0',
    latestVersion: '2.6.0',
    author: 'Git Masters',
    description: 'Visualizes branch topologies, commit histories, and merge requests in a high-contrast crimson tree.',
    category: 'UI Enhancements',
    icon: 'git',
    enabled: false,
    installed: false,
    downloads: '380k',
    rating: 4.9,
    permissions: ['workspace:read']
  },
  {
    id: 'vim-engine',
    name: 'Vim Modal Navigation',
    version: '1.8.2',
    latestVersion: '1.8.2',
    installedVersion: '1.8.2',
    author: 'Modal Tools',
    description: 'Vim modal editing emulation providing NORMAL, INSERT, and VISUAL modes with hjkl navigation.',
    category: 'Keymaps',
    icon: 'keyboard',
    enabled: false,
    installed: true,
    downloads: '98k',
    rating: 4.8,
    permissions: ['editor:keybindings']
  },
  {
    id: 'crimson-spectrum',
    name: 'Crimson Spectrum Accent',
    version: '2.4.0',
    latestVersion: '2.4.0',
    installedVersion: '2.4.0',
    author: 'Crimson Core Team',
    description: 'Dynamic crimson palette tuner allowing customization of ruby hues, neon saturation, and glow levels.',
    category: 'Themes',
    icon: 'palette',
    enabled: true,
    installed: true,
    downloads: '142k',
    rating: 4.9,
    permissions: ['theme:customize']
  }
];

export const INITIAL_PLUGINS: PluginDefinition[] = MARKETPLACE_CATALOGUE.filter((p) => p.installed);

/**
 * Validates and packages a new extension created by a developer
 */
export function packagePlugin(draft: PluginPackageDraft): {
  isValid: boolean;
  errors: string[];
  manifestJson: string;
  packagedPlugin?: PluginDefinition;
} {
  const errors: string[] = [];

  if (!draft.id || !/^[a-z0-9-]+$/.test(draft.id)) {
    errors.push('Plugin ID must contain only lowercase letters, numbers, and dashes (e.g., "my-custom-linter").');
  }
  if (!draft.name.trim()) {
    errors.push('Plugin Name is required.');
  }
  if (!draft.version || !/^\d+\.\d+\.\d+$/.test(draft.version)) {
    errors.push('Version must follow semver format (e.g., "1.0.0").');
  }
  if (!draft.author.trim()) {
    errors.push('Author name or organization is required.');
  }
  if (!draft.description.trim() || draft.description.length < 10) {
    errors.push('Description must be at least 10 characters long.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors, manifestJson: '' };
  }

  const manifest = {
    id: draft.id,
    name: draft.name,
    version: draft.version,
    author: draft.author,
    description: draft.description,
    category: draft.category,
    permissions: draft.permissions,
    main: 'dist/extension.js',
    entryCode: draft.entryCode,
    engines: {
      crimson: '>=2.0.0',
    },
    publishedAt: new Date().toISOString(),
  };

  const packagedPlugin: PluginDefinition = {
    id: draft.id,
    name: draft.name,
    version: draft.version,
    latestVersion: draft.version,
    installedVersion: draft.version,
    author: draft.author,
    description: draft.description,
    category: draft.category,
    icon: draft.icon || 'cube',
    enabled: true,
    installed: true,
    downloads: '1',
    rating: 5.0,
    permissions: draft.permissions,
    readme: `# ${draft.name}\n\n${draft.description}\n\n**Author:** ${draft.author}\n**Version:** ${draft.version}`,
    changelog: `v${draft.version}: Initial developer release.`,
  };

  return {
    isValid: true,
    errors: [],
    manifestJson: JSON.stringify(manifest, null, 2),
    packagedPlugin,
  };
}
