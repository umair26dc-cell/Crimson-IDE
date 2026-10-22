/**
 * CsCode Crimson Code - Live In-Browser Code Runner
 * Safely executes JavaScript & TypeScript code in a sandboxed runtime,
 * capturing console streams, return values, execution timing, and errors.
 */

export interface ExecutionLog {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'success' | 'system';
  message: string;
  timestamp: string;
}

export interface ExecutionResult {
  success: boolean;
  logs: ExecutionLog[];
  executionTimeMs: number;
  returnValue?: string;
  error?: string;
}

/**
 * Strips basic TypeScript type annotations and interfaces
 * so modern JavaScript browsers can evaluate standard TS code snippets.
 */
export function stripBasicTypeScript(source: string): string {
  let code = source;

  // Remove import/export statements that reference local files to avoid module resolution errors
  code = code.replace(/import\s+.*?\s+from\s+['"][^'"]+['"];?/g, '// [external import]');
  code = code.replace(/export\s+default\s+/g, '');
  code = code.replace(/export\s+(const|let|var|function|class|async)\s+/g, '$1 ');

  // Remove interface declarations
  code = code.replace(/interface\s+\w+(\s*<[^>]+>)?(\s+extends\s+[^{]+)?\s*\{[\s\S]*?\}/g, '');

  // Remove type alias declarations
  code = code.replace(/type\s+\w+(\s*<[^>]+>)?\s*=[\s\S]*?;/g, '');

  // Remove type casting (e.g. `as string`, `as unknown as number`, `as const`)
  code = code.replace(/\s+as\s+[A-Za-z0-9_<>[\]|&]+/g, '');

  // Remove function return types: `): ReturnType {` -> `) {`
  code = code.replace(/\)\s*:\s*[A-Za-z0-9_<>[\]|&,\s]+\s*=>/g, ') =>');
  code = code.replace(/\)\s*:\s*[A-Za-z0-9_<>[\]|&,\s]+\s*\{/g, ') {');

  // Remove parameter type annotations: `(x: number, y: string)` -> `(x, y)`
  code = code.replace(/(\(|,\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\??\s*:\s*[A-Za-z0-9_<>[\]|&,\s]+(?=[,)=])/g, '$1$2');

  // Remove generic type params in function calls/declarations: `function foo<T>(` -> `function foo(`
  code = code.replace(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*<[^>]+>\s*\(/g, 'function $1(');

  return code;
}

/**
 * Format any JS value for display in output console
 */
export function formatValue(val: unknown): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'symbol') {
    return String(val);
  }
  if (val instanceof Error) {
    return `${val.name}: ${val.message}\n${val.stack || ''}`;
  }
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

/**
 * Executes user code safely with sandboxed console and execution timer
 */
export async function executeCode(code: string, language: string = 'typescript'): Promise<ExecutionResult> {
  const startTime = performance.now();
  const logs: ExecutionLog[] = [];

  const addLog = (type: ExecutionLog['type'], message: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    logs.push({
      id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      message,
      timestamp: now,
    });
  };

  addLog('system', `[Runner] Executing ${language.toUpperCase()} file...`);

  // Handle JSON
  if (language === 'json') {
    try {
      const parsed = JSON.parse(code);
      const keys = Object.keys(parsed);
      const count = Array.isArray(parsed) ? `${parsed.length} items` : `${keys.length} keys`;
      addLog('success', `Valid JSON (${count})`);
      addLog('log', JSON.stringify(parsed, null, 2));
      const endTime = performance.now();
      return {
        success: true,
        logs,
        executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
        returnValue: `JSON validated (${count})`,
      };
    } catch (err: any) {
      addLog('error', `JSON Parse Error: ${err.message}`);
      return {
        success: false,
        logs,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        error: err.message,
      };
    }
  }

  // Handle JavaScript and TypeScript
  try {
    const runnableCode = language === 'typescript' ? stripBasicTypeScript(code) : code;

    // Create sandbox console
    const sandboxConsole = {
      log: (...args: unknown[]) => addLog('log', args.map(formatValue).join(' ')),
      info: (...args: unknown[]) => addLog('info', args.map(formatValue).join(' ')),
      warn: (...args: unknown[]) => addLog('warn', args.map(formatValue).join(' ')),
      error: (...args: unknown[]) => addLog('error', args.map(formatValue).join(' ')),
      table: (tabularData: unknown) => {
        addLog('log', '[Table]\n' + formatValue(tabularData));
      },
    };

    // Execution wrapper with AsyncFunction
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const runner = new AsyncFunction('console', 'require', `
      "use strict";
      ${runnableCode}
    `);

    // Require shim for common modules in client sandbox
    const sandboxRequire = (mod: string) => {
      addLog('warn', `[Module Warning] require("${mod}") is not available in browser sandbox`);
      return {};
    };

    // Run with 5s timeout safeguard
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Execution timed out (5000ms limit)')), 5000)
    );

    const result = await Promise.race([runner(sandboxConsole, sandboxRequire), timeoutPromise]);
    const endTime = performance.now();
    const duration = Math.round((endTime - startTime) * 100) / 100;

    if (result !== undefined) {
      addLog('success', `Return Value: ${formatValue(result)}`);
    }

    addLog('system', `[Runner] Process finished in ${duration}ms (exit code 0)`);

    return {
      success: true,
      logs,
      executionTimeMs: duration,
      returnValue: result !== undefined ? formatValue(result) : undefined,
    };
  } catch (err: any) {
    const endTime = performance.now();
    const duration = Math.round((endTime - startTime) * 100) / 100;
    const errMsg = err?.message || String(err);

    addLog('error', `Runtime Error: ${errMsg}`);
    addLog('system', `[Runner] Process terminated with error in ${duration}ms`);

    return {
      success: false,
      logs,
      executionTimeMs: duration,
      error: errMsg,
    };
  }
}

/**
 * Convenient wrapper returning execution logs directly
 */
export async function runCodeInSandbox(
  code: string,
  language: string = 'typescript',
  _fileName?: string
): Promise<ExecutionLog[]> {
  const result = await executeCode(code, language);
  return result.logs;
}

