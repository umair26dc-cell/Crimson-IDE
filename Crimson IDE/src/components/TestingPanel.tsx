/**
 * TestingPanel Component for CsCode Crimson IDE
 * Displays test suites, individual test cases, pass/fail status badges,
 * execution duration, error diagnostics, and actions to run all or specific tests.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import {
  FileItem,
  TestSuiteResult,
  TestCaseResult,
  TestRunSummary,
  TestCaseStatus,
} from '../types';
import {
  TestRunnerEngine,
  STARTER_TEST_FILE_CONTENT,
} from '../lib/testRunner';

interface TestingPanelProps {
  files: FileItem[];
  onOpenFile?: (fileId: string, line?: number) => void;
  onCreateFile?: (name: string, isFolder?: boolean) => void;
  className?: string;
}

export const TestingPanel: React.FC<TestingPanelProps> = ({
  files,
  onOpenFile,
  onCreateFile,
  className = '',
}) => {
  const [testSuites, setTestSuites] = useState<TestSuiteResult[]>(() =>
    TestRunnerEngine.discoverTestSuites(files)
  );
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runningSuiteId, setRunningSuiteId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [expandedSuiteIds, setExpandedSuiteIds] = useState<Set<string>>(
    () => new Set(testSuites.map((s) => s.id))
  );
  const [expandedTestErrorIds, setExpandedTestErrorIds] = useState<Set<string>>(new Set());

  const [summary, setSummary] = useState<TestRunSummary>(() => {
    let total = 0;
    testSuites.forEach((s) => (total += s.tests.length));
    return {
      total,
      passed: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
    };
  });

  // Re-discover test suites when workspace files change
  useEffect(() => {
    const discovered = TestRunnerEngine.discoverTestSuites(files);
    setTestSuites((prevSuites) => {
      // Preserve run statuses where possible
      return discovered.map((d) => {
        const existing = prevSuites.find((p) => p.filePath === d.filePath && p.name === d.name);
        if (existing && existing.status !== 'idle') {
          return {
            ...d,
            status: existing.status,
            durationMs: existing.durationMs,
            tests: d.tests.map((t) => {
              const prevTest = existing.tests.find((pt) => pt.name === t.name);
              return prevTest || t;
            }),
          };
        }
        return d;
      });
    });
  }, [files]);

  // Toggle suite accordion expansion
  const toggleSuiteExpanded = (suiteId: string) => {
    setExpandedSuiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(suiteId)) {
        next.delete(suiteId);
      } else {
        next.add(suiteId);
      }
      return next;
    });
  };

  // Toggle test error expansion
  const toggleTestErrorExpanded = (testId: string) => {
    setExpandedTestErrorIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  // Run all test suites
  const handleRunAllTests = useCallback(async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);

    try {
      const { suites: updatedSuites, summary: newSummary } = await TestRunnerEngine.runAllTestSuites(
        testSuites,
        (inProgress) => setTestSuites([...inProgress])
      );

      setTestSuites(updatedSuites);
      setSummary(newSummary);

      // Auto-expand suites with failures
      const failingSuiteIds = new Set<string>();
      updatedSuites.forEach((s) => {
        if (s.status === 'failed') failingSuiteIds.add(s.id);
      });
      if (failingSuiteIds.size > 0) {
        setExpandedSuiteIds((prev) => new Set([...prev, ...failingSuiteIds]));
      }
    } catch (err) {
      console.error('Failed to run all tests:', err);
    } finally {
      setIsRunningAll(false);
      setRunningSuiteId(null);
    }
  }, [testSuites, isRunningAll]);

  // Run a single test suite
  const handleRunSuite = async (suiteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isRunningAll || runningSuiteId) return;

    setRunningSuiteId(suiteId);

    setTestSuites((prev) =>
      prev.map((s) => (s.id === suiteId ? { ...s, status: 'running' } : s))
    );

    try {
      const targetSuite = testSuites.find((s) => s.id === suiteId);
      if (targetSuite) {
        const finished = await TestRunnerEngine.runTestSuite(targetSuite);
        setTestSuites((prev) =>
          prev.map((s) => (s.id === suiteId ? finished : s))
        );

        // Recalculate summary
        recomputeSummary(
          testSuites.map((s) => (s.id === suiteId ? finished : s))
        );
      }
    } finally {
      setRunningSuiteId(null);
    }
  };

  // Run a single test case
  const handleRunSingleTest = async (suiteId: string, testId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Mark single test running
    setTestSuites((prev) =>
      prev.map((s) => {
        if (s.id !== suiteId) return s;
        return {
          ...s,
          tests: s.tests.map((t) => (t.id === testId ? { ...t, status: 'running' } : t)),
        };
      })
    );

    const targetSuite = testSuites.find((s) => s.id === suiteId);
    const targetTest = targetSuite?.tests.find((t) => t.id === testId);

    if (targetSuite && targetTest) {
      const finishedTest = await TestRunnerEngine.runSingleTestCase(targetTest);
      setTestSuites((prev) =>
        prev.map((s) => {
          if (s.id !== suiteId) return s;
          const newTests = s.tests.map((t) => (t.id === testId ? finishedTest : t));
          const hasFail = newTests.some((t) => t.status === 'failed');
          const allPass = newTests.every((t) => t.status === 'passed');
          return {
            ...s,
            tests: newTests,
            status: hasFail ? 'failed' : allPass ? 'passed' : s.status,
          };
        })
      );
    }
  };

  // Reset test results to idle
  const handleClearResults = () => {
    setTestSuites((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'idle',
        durationMs: undefined,
        tests: s.tests.map((t) => ({
          ...t,
          status: 'idle',
          durationMs: undefined,
          errorMessage: undefined,
        })),
      }))
    );
    setSummary({
      total: summary.total,
      passed: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
    });
  };

  // Re-run only failed tests
  const handleRerunFailed = async () => {
    const suitesWithFailures = testSuites.filter((s) => s.status === 'failed');
    if (suitesWithFailures.length === 0) return;

    for (const suite of suitesWithFailures) {
      await handleRunSuite(suite.id);
    }
  };

  // Create a starter test file in workspace
  const handleCreateStarterTestFile = () => {
    onCreateFile?.('src/utils.test.ts', false);
  };

  // Recomputes summary metrics
  const recomputeSummary = (suites: TestSuiteResult[]) => {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let duration = 0;

    suites.forEach((s) => {
      duration += s.durationMs || 0;
      s.tests.forEach((t) => {
        total++;
        if (t.status === 'passed') passed++;
        else if (t.status === 'failed') failed++;
        else if (t.status === 'skipped') skipped++;
      });
    });

    setSummary({
      total,
      passed,
      failed,
      skipped,
      durationMs: duration,
      lastRunTimestamp: Date.now(),
    });
  };

  // Filtered suites
  const filteredSuites = useMemo(() => {
    return testSuites
      .map((suite) => {
        let matchingTests = suite.tests;

        if (statusFilter === 'passed') {
          matchingTests = matchingTests.filter((t) => t.status === 'passed');
        } else if (statusFilter === 'failed') {
          matchingTests = matchingTests.filter((t) => t.status === 'failed');
        }

        if (searchFilter.trim()) {
          const q = searchFilter.toLowerCase();
          matchingTests = matchingTests.filter(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.suiteName.toLowerCase().includes(q) ||
              t.filePath.toLowerCase().includes(q)
          );
        }

        return {
          ...suite,
          tests: matchingTests,
        };
      })
      .filter((suite) => {
        if (searchFilter.trim() || statusFilter !== 'all') {
          return suite.tests.length > 0;
        }
        return true;
      });
  }, [testSuites, searchFilter, statusFilter]);

  // Overall passed percentage for progress bar
  const passPercentage = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
  const failPercentage = summary.total > 0 ? (summary.failed / summary.total) * 100 : 0;

  return (
    <div className={`h-full flex flex-col font-mono text-xs select-none bg-[#0a0b10] text-slate-200 overflow-hidden ${className}`}>
      {/* Top Toolbar */}
      <div className="p-2 border-b border-[#1c1d29] bg-[#0e0f17] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          {/* Run All Tests Button */}
          <button
            onClick={handleRunAllTests}
            disabled={isRunningAll}
            id="btn-run-all-workspace-tests"
            className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-rose-950/40"
            title="Execute all test suites in the active workspace"
          >
            <FontAwesomeIcon icon={isRunningAll ? ICONS.syncSpin : ICONS.play} className={isRunningAll ? 'animate-spin text-xs' : 'text-xs'} />
            <span>{isRunningAll ? 'Running Tests...' : 'Run All Tests'}</span>
          </button>

          {/* Rerun Failed Button */}
          {summary.failed > 0 && (
            <button
              onClick={handleRerunFailed}
              disabled={isRunningAll}
              className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Re-run only failing tests"
            >
              <FontAwesomeIcon icon={ICONS.sync} className="text-xs" />
              <span>Rerun Failed ({summary.failed})</span>
            </button>
          )}

          {/* Clear Results Button */}
          {(summary.passed > 0 || summary.failed > 0) && (
            <button
              onClick={handleClearResults}
              disabled={isRunningAll}
              className="p-1.5 px-2 rounded-lg bg-[#141520] hover:bg-[#1f2030] text-slate-400 hover:text-slate-200 border border-[#232536] text-xs transition-colors cursor-pointer"
              title="Reset test execution results"
            >
              <FontAwesomeIcon icon={ICONS.close} className="mr-1" />
              Clear
            </button>
          )}

          {/* Add Test File Button */}
          <button
            onClick={handleCreateStarterTestFile}
            className="px-2 py-1.5 rounded-lg bg-[#141520] hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-[#232536] text-xs transition-colors cursor-pointer flex items-center space-x-1"
            title="Create a new starter test suite file in workspace"
          >
            <FontAwesomeIcon icon={ICONS.plus} className="text-[10px]" />
            <span>+ Test File</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center space-x-2">
          {/* Search Box */}
          <div className="relative">
            <FontAwesomeIcon icon={ICONS.search} className="absolute left-2.5 top-2 text-slate-500 text-[10px]" />
            <input
              type="text"
              placeholder="Filter tests..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-7 pr-6 py-1 bg-[#12131e] border border-[#222434] rounded text-slate-200 text-[11px] outline-none focus:border-rose-500 w-36 font-mono"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300 text-[10px]"
              >
                <FontAwesomeIcon icon={ICONS.close} />
              </button>
            )}
          </div>

          {/* Status Filter Badges */}
          <div className="flex items-center bg-[#12131e] border border-[#222434] rounded p-0.5 text-[10px]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-rose-950 text-rose-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({summary.total})
            </button>
            <button
              onClick={() => setStatusFilter('passed')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                statusFilter === 'passed'
                  ? 'bg-emerald-950 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Passed ({summary.passed})
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                statusFilter === 'failed'
                  ? 'bg-rose-950 text-rose-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Failed ({summary.failed})
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics & Progress Bar */}
      <div className="px-3 py-2 border-b border-[#1c1d29] bg-[#0c0d14] space-y-1.5 shrink-0">
        {/* Visual Progress Bar */}
        <div className="h-1.5 w-full bg-[#171824] rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${passPercentage}%` }}
          />
          <div
            className="bg-rose-500 transition-all duration-300"
            style={{ width: `${failPercentage}%` }}
          />
        </div>

        {/* Metrics readout */}
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1 text-slate-300">
              <FontAwesomeIcon icon={ICONS.flask} className="text-rose-400 text-xs" />
              <span>
                <strong>{testSuites.length}</strong> suites &bull; <strong>{summary.total}</strong> tests
              </span>
            </span>

            {summary.passed > 0 && (
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <FontAwesomeIcon icon={ICONS.check} className="text-[10px]" />
                <span>{summary.passed} passed</span>
              </span>
            )}

            {summary.failed > 0 && (
              <span className="text-rose-400 font-semibold flex items-center space-x-1">
                <FontAwesomeIcon icon={ICONS.close} className="text-[10px]" />
                <span>{summary.failed} failed</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-slate-500">
            {summary.durationMs > 0 && <span>Duration: {summary.durationMs}ms</span>}
            {summary.lastRunTimestamp && (
              <span>Last run: {new Date(summary.lastRunTimestamp).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Test Suites Explorer Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredSuites.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500">
            <div className="w-12 h-12 rounded-xl bg-[#141520] border border-[#222434] flex items-center justify-center text-rose-400 text-xl">
              <FontAwesomeIcon icon={ICONS.flask} />
            </div>
            <div className="text-xs font-semibold text-slate-300">No Tests Found</div>
            <p className="text-[11px] text-slate-400 font-sans max-w-sm">
              {searchFilter
                ? 'No test suites or test cases match your search query.'
                : 'Workspace contains no test files yet. Create a test file or click below to generate starter test suites.'}
            </p>
            <button
              onClick={handleCreateStarterTestFile}
              className="mt-2 px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold cursor-pointer transition-colors shadow-md shadow-rose-950/40"
            >
              + Generate Sample Test File (src/utils.test.ts)
            </button>
          </div>
        ) : (
          filteredSuites.map((suite) => {
            const isExpanded = expandedSuiteIds.has(suite.id);
            const isSuiteRunning = suite.status === 'running' || runningSuiteId === suite.id;

            return (
              <div
                key={suite.id}
                className="rounded-xl border border-[#1f2130] bg-[#0e0f17] overflow-hidden transition-colors"
              >
                {/* Suite Header Card */}
                <div
                  onClick={() => toggleSuiteExpanded(suite.id)}
                  className="px-3 py-2 bg-[#12131f] hover:bg-[#161726] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate">
                    {/* Expand Chevron */}
                    <span className="text-slate-400 text-[10px] w-3">
                      <FontAwesomeIcon icon={isExpanded ? ICONS.chevronDown : ICONS.chevronRight} />
                    </span>

                    {/* Suite Status Badge */}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
                        suite.status === 'passed'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : suite.status === 'failed'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                          : isSuiteRunning
                          ? 'bg-sky-950/80 text-sky-300 border-sky-800 animate-pulse'
                          : 'bg-[#181926] text-slate-400 border-[#26283c]'
                      }`}
                    >
                      {isSuiteRunning ? 'RUNNING' : suite.status}
                    </span>

                    {/* Suite Name & File Path */}
                    <span className="font-semibold text-slate-100 text-xs truncate">
                      {suite.name}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate font-mono">
                      ({suite.filePath})
                    </span>
                  </div>

                  {/* Right Suite Actions: Duration & Run */}
                  <div className="flex items-center space-x-2 shrink-0 text-[10px]">
                    {suite.durationMs !== undefined && (
                      <span className="text-slate-500 font-mono">{suite.durationMs}ms</span>
                    )}

                    {onOpenFile && suite.fileId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFile(suite.fileId);
                        }}
                        className="p-1 px-1.5 rounded bg-[#171826] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#25273a] transition-colors"
                        title="Open test file in editor"
                      >
                        <FontAwesomeIcon icon={ICONS.fileCode} />
                      </button>
                    )}

                    <button
                      onClick={(e) => handleRunSuite(suite.id, e)}
                      disabled={isSuiteRunning || isRunningAll}
                      className="p-1 px-2 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[10px] font-semibold transition-colors flex items-center space-x-1"
                      title="Run this test suite"
                    >
                      <FontAwesomeIcon icon={isSuiteRunning ? ICONS.syncSpin : ICONS.play} className={isSuiteRunning ? 'animate-spin' : ''} />
                      <span>Run</span>
                    </button>
                  </div>
                </div>

                {/* Test Cases Inside Suite */}
                {isExpanded && (
                  <div className="divide-y divide-[#181926] bg-[#0a0b12] text-xs">
                    {suite.tests.map((test) => {
                      const isTestRunning = test.status === 'running';
                      const isErrorExpanded = expandedTestErrorIds.has(test.id);

                      return (
                        <div key={test.id} className="p-2 px-4 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2.5 truncate">
                              {/* Test Status Indicator Icon */}
                              <span className="shrink-0 text-xs">
                                {test.status === 'passed' ? (
                                  <FontAwesomeIcon icon={ICONS.check} className="text-emerald-400" />
                                ) : test.status === 'failed' ? (
                                  <FontAwesomeIcon icon={ICONS.close} className="text-rose-400 font-bold" />
                                ) : isTestRunning ? (
                                  <FontAwesomeIcon icon={ICONS.syncSpin} className="animate-spin text-sky-400 text-[10px]" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                                )}
                              </span>

                              {/* Test Name */}
                              <span
                                className={`text-[11px] font-sans truncate ${
                                  test.status === 'failed'
                                    ? 'text-rose-200 font-medium'
                                    : 'text-slate-300'
                                }`}
                              >
                                {test.name}
                              </span>
                            </div>

                            {/* Duration & Single Test Run */}
                            <div className="flex items-center space-x-2 shrink-0 text-[10px]">
                              {test.durationMs !== undefined && (
                                <span className="text-slate-500 font-mono">{test.durationMs}ms</span>
                              )}

                              {test.status === 'failed' && (
                                <button
                                  onClick={() => toggleTestErrorExpanded(test.id)}
                                  className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9px] cursor-pointer"
                                >
                                  {isErrorExpanded ? 'Hide Error' : 'View Error'}
                                </button>
                              )}

                              <button
                                onClick={(e) => handleRunSingleTest(suite.id, test.id, e)}
                                disabled={isTestRunning || isRunningAll}
                                className="p-1 text-slate-500 hover:text-rose-300 transition-colors"
                                title="Run this single test case"
                              >
                                <FontAwesomeIcon icon={isTestRunning ? ICONS.syncSpin : ICONS.play} className={isTestRunning ? 'animate-spin text-[9px]' : 'text-[9px]'} />
                              </button>
                            </div>
                          </div>

                          {/* Failure Diagnostic Box */}
                          {test.status === 'failed' && (isErrorExpanded || !isExpanded) && (
                            <div className="mt-2 p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/60 font-mono text-[10px] text-rose-200 space-y-1 animate-fadeIn">
                              <div className="font-semibold text-rose-300">
                                {test.errorMessage || 'AssertionError: Test failed'}
                              </div>

                              {test.expected && test.received && (
                                <div className="space-y-0.5 pt-1 text-slate-300">
                                  <div>
                                    <span className="text-emerald-400">Expected:</span>{' '}
                                    <code className="text-emerald-300 bg-emerald-950/40 px-1 rounded">{test.expected}</code>
                                  </div>
                                  <div>
                                    <span className="text-rose-400">Received:</span>{' '}
                                    <code className="text-rose-300 bg-rose-950/40 px-1 rounded">{test.received}</code>
                                  </div>
                                </div>
                              )}

                              {test.line && (
                                <div className="text-slate-500 text-[9px] pt-0.5">
                                  at {test.filePath}:{test.line}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
