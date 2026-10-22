import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';

export type RootFolderPreset = 'empty' | 'react' | 'node-api' | 'python' | 'shared-lib';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFolder: (folderName: string, preset: RootFolderPreset) => void;
  existingFolderNames: string[];
}

export const AddFolderModal: React.FC<AddFolderModalProps> = ({
  isOpen,
  onClose,
  onAddFolder,
  existingFolderNames,
}) => {
  const [folderName, setFolderName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<RootFolderPreset>('empty');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = folderName.trim().replace(/^\/+/, '').replace(/\/+$/, '');

    if (!clean) {
      setError('Please provide a folder name');
      return;
    }

    if (existingFolderNames.some((n) => n.toLowerCase() === clean.toLowerCase())) {
      setError(`A folder named "${clean}" already exists in the workspace`);
      return;
    }

    onAddFolder(clean, selectedPreset);
    setFolderName('');
    setSelectedPreset('empty');
    setError(null);
    onClose();
  };

  const presets: { id: RootFolderPreset; label: string; desc: string; icon: any; sampleName: string }[] = [
    {
      id: 'empty',
      label: 'Empty Root Folder',
      desc: 'Clean directory with no starter files',
      icon: ICONS.folder,
      sampleName: 'services',
    },
    {
      id: 'react',
      label: 'React Frontend App',
      desc: 'Starter React 18+ TSX with App.tsx and index.css',
      icon: ICONS.react,
      sampleName: 'client',
    },
    {
      id: 'node-api',
      label: 'Node / Express API',
      desc: 'TypeScript server with server.ts and route handlers',
      icon: ICONS.terminal,
      sampleName: 'server',
    },
    {
      id: 'python',
      label: 'Python Microservice',
      desc: 'FastAPI / script main.py with requirements.txt',
      icon: ICONS.python,
      sampleName: 'python-service',
    },
    {
      id: 'shared-lib',
      label: 'Shared TypeScript Library',
      desc: 'Reusable types, utilities, and exported modules',
      icon: ICONS.cubes,
      sampleName: 'shared',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div 
        className="bg-[#11121d] border border-rose-900/70 rounded-xl shadow-2xl shadow-rose-950/40 w-full max-w-lg overflow-hidden text-slate-200 font-mono text-xs flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141624] border-b border-[#24273c] flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-rose-400 font-bold">
            <FontAwesomeIcon icon={ICONS.folderOpen} className="text-sm" />
            <span className="text-slate-100 text-sm font-sans tracking-tight">Add Folder to Workspace</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:text-rose-400 hover:bg-[#202234] rounded text-slate-400 transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={ICONS.close} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
              Root Folder Name
            </label>
            <input
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. client, server, shared, docs"
              className="w-full bg-[#0a0b12] border border-[#272a3e] focus:border-rose-600 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono transition-colors"
            />
            {error && (
              <p className="text-[11px] text-rose-400 font-sans">{error}</p>
            )}
            <p className="text-[10px] text-slate-400 font-sans">
              This creates an independent top-level root folder in your multi-root workspace tree.
            </p>
          </div>

          {/* Starter Presets */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
              Scaffold Starter Template
            </label>
            <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {presets.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      if (!folderName.trim()) {
                        setFolderName(preset.sampleName);
                      }
                    }}
                    className={`w-full flex items-start space-x-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-950/80 border-rose-600 text-white shadow-sm'
                        : 'bg-[#0d0e17] border-[#1f2132] text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <FontAwesomeIcon icon={preset.icon} className={`text-sm mt-0.5 shrink-0 ${isSelected ? 'text-rose-400' : 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-100">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">{preset.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-[#202235] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-rose-900/40"
            >
              <FontAwesomeIcon icon={ICONS.plus} className="text-[10px]" />
              <span>Add to Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
