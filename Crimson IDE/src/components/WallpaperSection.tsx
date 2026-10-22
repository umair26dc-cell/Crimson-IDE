/**
 * Editor Atmosphere, Wallpaper & Watermark Customization Section
 * Provides ambient non-distracting background patterns, watermark badges,
 * and custom image backdrops with opacity and blur control.
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { EditorWallpaper, UserSettings } from '../types';

interface WallpaperSectionProps {
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
}

interface WallpaperOption {
  id: EditorWallpaper;
  name: string;
  description: string;
  previewClass: string;
}

const WALLPAPER_OPTIONS: WallpaperOption[] = [
  {
    id: 'none',
    name: 'Clean Solid Backdrop',
    description: 'No watermark or pattern. Pure solid editor canvas for zero distraction.',
    previewClass: 'bg-[#0d0e14]',
  },
  {
    id: 'matrix-rain',
    name: 'Matrix Digital Rain',
    description: 'Subtle cascading digital code streams in low-luminescence emerald.',
    previewClass: 'bg-[#06140b] border-emerald-900/40',
  },
  {
    id: 'cyber-grid',
    name: 'Cyberpunk Hex Grid',
    description: 'Futuristic technical grid lines with subtle neon violet/pink highlights.',
    previewClass: 'bg-[#100818] border-pink-900/40',
  },
  {
    id: 'dot-matrix',
    name: 'Isometric Dot Matrix',
    description: 'Minimalist industrial CAD dotted grid spaced at precise 24px intervals.',
    previewClass: 'bg-[#0a0d14] border-slate-800',
  },
  {
    id: 'starfield',
    name: 'Constellation Starfield',
    description: 'Deep cosmic starfield with twinkling distant coordinates.',
    previewClass: 'bg-[#05060f] border-indigo-900/40',
  },
  {
    id: 'crimson-crest',
    name: 'Crimson Crest Emblem',
    description: 'Large geometric CsCode Crimson emblem glowing gently in the bottom-right.',
    previewClass: 'bg-[#16060c] border-rose-900/40',
  },
  {
    id: 'custom',
    name: 'Custom Image URL',
    description: 'Load your own wallpaper URL (anime, abstract art, company logo, etc.)',
    previewClass: 'bg-[#141520] border-slate-700',
  },
];

export const WallpaperSection: React.FC<WallpaperSectionProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const currentWallpaper = settings.editorWallpaper || 'none';
  const currentOpacity = settings.editorWallpaperOpacity !== undefined ? settings.editorWallpaperOpacity : 0.08;
  const currentBlur = settings.editorWallpaperBlur !== undefined ? settings.editorWallpaperBlur : 0;
  const currentPosition = settings.editorWallpaperPosition || 'center';
  const customUrl = settings.editorWallpaperCustomUrl || '';

  return (
    <div className="space-y-6 text-slate-200 text-xs">
      {/* Header */}
      <div className="bg-[#12131c] p-4 rounded-lg border border-[#222432] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={ICONS.image} className="text-rose-400 text-sm" />
            <h3 className="text-sm font-semibold text-slate-100">Editor Wallpaper & Watermark Atmosphere</h3>
          </div>
          <p className="text-slate-400 text-[11px] mt-1">
            Display subtle background graphics behind your code editor. Tuned with low opacity so syntax remains razor-sharp.
          </p>
        </div>
      </div>

      {/* Preset Cards */}
      <div>
        <label className="block text-slate-300 font-semibold mb-2">Backdrop Styles</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {WALLPAPER_OPTIONS.map((wp) => {
            const isSelected = currentWallpaper === wp.id;
            return (
              <div
                key={wp.id}
                onClick={() => onUpdateSettings({ editorWallpaper: wp.id })}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1a1724] border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.2)]'
                    : 'bg-[#10111a] border-[#222432] hover:border-slate-600 hover:bg-[#141522]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isSelected ? 'text-rose-300' : 'text-slate-200'}`}>
                      {wp.name}
                    </span>
                    <div className={`w-4 h-4 rounded-full border ${wp.previewClass}`} />
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1.5">{wp.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1d1f2d] text-[10px] text-slate-500">
                  {isSelected ? 'Active Backdrop' : 'Select'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom URL Input if Custom Selected */}
      {currentWallpaper === 'custom' && (
        <div className="bg-[#10111a] p-4 rounded-lg border border-[#222432] space-y-2">
          <label className="block text-slate-300 font-semibold">Custom Image URL</label>
          <input
            type="text"
            value={customUrl}
            onChange={(e) => onUpdateSettings({ editorWallpaperCustomUrl: e.target.value })}
            placeholder="https://images.unsplash.com/... or /path/to/image.png"
            className="w-full px-3 py-2 bg-[#1b1c28] text-slate-200 text-xs rounded border border-[#2e3144] focus:outline-none focus:border-rose-500"
          />
          <p className="text-slate-500 text-[10px]">
            Direct link to an image file (PNG, JPG, SVG, WebP).
          </p>
        </div>
      )}

      {/* Opacity & Blur Sliders */}
      {currentWallpaper !== 'none' && (
        <div className="bg-[#10111a] p-4 rounded-lg border border-[#222432] space-y-4">
          <h4 className="font-semibold text-slate-200">Atmosphere Density & Lens Controls</h4>

          {/* Opacity */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Watermark Opacity</span>
              <span className="font-mono text-rose-400 font-bold">{Math.round(currentOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.35"
              step="0.01"
              value={currentOpacity}
              onChange={(e) => onUpdateSettings({ editorWallpaperOpacity: parseFloat(e.target.value) })}
              className="w-full accent-rose-500 bg-[#1b1c28] h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>2% (Barely visible)</span>
              <span>10% (Balanced)</span>
              <span>35% (Prominent)</span>
            </div>
          </div>

          {/* Blur */}
          <div className="pt-2 border-t border-[#1d1f2d]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Lens Backdrop Blur</span>
              <span className="font-mono text-rose-400 font-bold">{currentBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={currentBlur}
              onChange={(e) => onUpdateSettings({ editorWallpaperBlur: parseInt(e.target.value, 10) })}
              className="w-full accent-rose-500 bg-[#1b1c28] h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Position */}
          <div className="pt-2 border-t border-[#1d1f2d]">
            <label className="block text-slate-400 mb-2">Display Positioning</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'center', label: 'Centered' },
                { id: 'bottom-right', label: 'Bottom-Right' },
                { id: 'stretch', label: 'Fill / Cover' },
                { id: 'tile', label: 'Repeat Tile' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => onUpdateSettings({ editorWallpaperPosition: pos.id as any })}
                  className={`py-1.5 px-2 rounded border text-center font-mono text-[11px] transition-colors ${
                    currentPosition === pos.id
                      ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-semibold'
                      : 'bg-[#171824] border-[#2a2d3e] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
