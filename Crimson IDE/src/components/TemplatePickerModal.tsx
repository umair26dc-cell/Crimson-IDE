import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, getFileIconConfig } from '../lib/fontawesome';
import { CODE_TEMPLATES, CodeTemplate, TemplateCategory } from '../lib/templates';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (fileName: string, content: string) => void;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<CodeTemplate>(CODE_TEMPLATES[0]);
  const [customFileName, setCustomFileName] = useState<string>(CODE_TEMPLATES[0].defaultFileName);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Extract all unique categories
  const categories = useMemo(() => {
    const list = Array.from(new Set(CODE_TEMPLATES.map((t) => t.category)));
    return ['All', ...list];
  }, []);

  // Filter templates by category and search term
  const filteredTemplates = useMemo(() => {
    return CODE_TEMPLATES.filter((tmpl) => {
      const matchesCategory = selectedCategory === 'All' || tmpl.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchesName = tmpl.name.toLowerCase().includes(q);
      const matchesDesc = tmpl.description.toLowerCase().includes(q);
      const matchesFile = tmpl.defaultFileName.toLowerCase().includes(q);
      const matchesLang = tmpl.language.toLowerCase().includes(q);
      const matchesTags = tmpl.tags?.some((tag) => tag.toLowerCase().includes(q));

      return matchesName || matchesDesc || matchesFile || matchesLang || matchesTags;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (tmpl: CodeTemplate) => {
    setSelectedTemplate(tmpl);
    setCustomFileName(tmpl.defaultFileName);
  };

  const handleCreate = () => {
    const finalName = customFileName.trim() || selectedTemplate.defaultFileName;
    onApplyTemplate(finalName, selectedTemplate.content);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedTemplate.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div 
        className="bg-[#11121d] border border-rose-900/60 rounded-xl shadow-2xl shadow-rose-950/40 w-full max-w-4xl overflow-hidden text-slate-200 font-mono text-xs flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141624] border-b border-[#24273c] flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-rose-400 font-bold">
            <FontAwesomeIcon icon={ICONS.cubes} className="text-sm" />
            <span className="text-slate-100 text-sm font-sans tracking-tight">Code Scaffolding & Templates</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800/60">
              {filteredTemplates.length} available
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:text-rose-400 hover:bg-[#202234] rounded text-slate-400 transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={ICONS.close} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-[#0d0e16] border-b border-[#1f2234] flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <FontAwesomeIcon icon={ICONS.search} className="absolute left-3 top-2.5 text-slate-500 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates (e.g. react, api, python, sql, hook)..."
              className="w-full bg-[#131420] border border-[#24273c] focus:border-rose-600 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none font-mono placeholder:text-slate-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
              >
                <FontAwesomeIcon icon={ICONS.close} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-rose-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1c2a]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body: Two columns (Templates list & Preview) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#202336]">
          {/* Left: Template Catalog List */}
          <div className="w-full md:w-80 overflow-y-auto p-2 space-y-1.5 shrink-0 bg-[#0d0e16]">
            {filteredTemplates.length === 0 ? (
              <div className="p-6 text-center text-slate-500 space-y-2">
                <FontAwesomeIcon icon={ICONS.cubes} className="text-2xl text-slate-600" />
                <p className="text-xs">No matching templates found</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="text-xs text-rose-400 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredTemplates.map((tmpl) => {
                const iconCfg = getFileIconConfig(tmpl.defaultFileName, tmpl.language);
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelect(tmpl)}
                    className={`w-full text-left p-2.5 rounded-lg transition-all cursor-pointer flex items-start space-x-3 border ${
                      isSelected
                        ? 'bg-rose-950/80 text-white border-rose-600/80 shadow-md ring-1 ring-rose-500/50'
                        : 'border-transparent text-slate-300 hover:bg-[#161826] hover:text-white'
                    }`}
                  >
                    <FontAwesomeIcon icon={iconCfg.icon} className={`text-base mt-1 shrink-0 ${iconCfg.color}`} />
                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-xs truncate text-slate-100">{tmpl.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate mb-1">
                        {tmpl.defaultFileName}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#191b28] text-slate-400 border border-[#26283c]">
                          {tmpl.category}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase text-rose-400/90 bg-rose-950/40">
                          {tmpl.language}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Template Details & Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#10111a] p-4 space-y-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Target File Name
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="filename.ext"
                  className="flex-1 bg-[#090a12] border border-[#2b2e44] focus:border-rose-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setCustomFileName(selectedTemplate.defaultFileName)}
                  title="Reset to default filename"
                  className="px-2.5 py-1.5 rounded-lg bg-[#181a28] hover:bg-[#202334] text-slate-400 hover:text-slate-200 border border-[#2b2e44] text-[11px] font-mono cursor-pointer transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Template Description & Tags */}
            <div className="p-2.5 rounded-lg bg-[#0d0e16] border border-[#1e2030] space-y-1.5">
              <div className="text-xs text-slate-300 font-sans leading-relaxed">
                {selectedTemplate.description}
              </div>
              {selectedTemplate.tags && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-500 font-mono">Tags:</span>
                  {selectedTemplate.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950/50 text-rose-300 border border-rose-900/40"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Code Preview Frame */}
            <div className="flex-1 flex flex-col overflow-hidden border border-[#222538] rounded-xl bg-[#090a10]">
              <div className="px-3 py-1.5 bg-[#141522] border-b border-[#222538] text-[10px] text-slate-400 font-mono flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="font-semibold text-slate-300">{customFileName || selectedTemplate.defaultFileName}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="uppercase text-rose-400 font-bold">{selectedTemplate.language}</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#1c1e2e] hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    <FontAwesomeIcon icon={copied ? ICONS.check : ICONS.copy} className={copied ? 'text-emerald-400' : ''} />
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-y-auto whitespace-pre leading-relaxed flex-1 select-text">
                {selectedTemplate.content}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#141624] border-t border-[#24273c] flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-sans hidden sm:block">
            Creates a new file in your workspace with complete scaffolding.
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-rose-900/40"
            >
              <FontAwesomeIcon icon={ICONS.plus} className="text-[10px]" />
              <span>Create File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
