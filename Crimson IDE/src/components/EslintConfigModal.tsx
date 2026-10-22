/**
 * Dedicated ESLint Configuration & Rules Modal
 * Allows developers to define custom ESLint rules and ignore patterns for the current workspace.
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { UserSettings } from '../types';
import { EslintConfigSection } from './EslintConfigSection';

interface EslintConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportEslintFiles?: (rcJsonContent: string, ignoreContent: string) => void;
}

export const EslintConfigModal: React.FC<EslintConfigModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onExportEslintFiles,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        id="crimson-eslint-config-dialog"
        className="w-full max-w-3xl bg-[#11121a] border border-rose-900/60 rounded-xl shadow-2xl shadow-rose-950/40 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-6 border-b border-[#222432] bg-[#0c0d14] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-500 font-semibold font-mono text-sm">
            <FontAwesomeIcon icon={ICONS.check} />
            <span className="text-slate-100">ESLint Workspace Configuration & Custom Rules</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#1f202e] rounded transition-colors cursor-pointer"
            title="Close modal (Esc)"
          >
            <FontAwesomeIcon icon={ICONS.close} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto">
          <EslintConfigSection
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onExportEslintFiles={onExportEslintFiles}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
