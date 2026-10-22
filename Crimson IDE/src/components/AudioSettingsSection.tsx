/**
 * Typing Audio & Keystroke Haptics Customization Section
 * Provides tactile audio feedback for typing: Cherry MX Blue, Alpaca Thock,
 * Vintage Typewriter, Hacker Sci-Fi Beeps, and Bubble Pop.
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { TypingSoundpack, UserSettings } from '../types';
import { audioEngine } from '../lib/audioEngine';

interface AudioSettingsSectionProps {
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
}

interface SoundpackOption {
  id: TypingSoundpack;
  name: string;
  tagline: string;
  description: string;
  badge: string;
}

const SOUNDPACK_OPTIONS: SoundpackOption[] = [
  {
    id: 'none',
    name: 'Silent (Muted)',
    tagline: 'Zero audio feedback',
    description: 'Standard quiet coding with no audio triggers.',
    badge: 'Mute',
  },
  {
    id: 'cherry-blue',
    name: 'Cherry MX Blue',
    tagline: 'Crisp tactile snap & bottom-out clack',
    description: 'Authentic high-frequency actuation click followed by an acoustic base resonance.',
    badge: 'Tactile Clicky',
  },
  {
    id: 'alpaca-thock',
    name: 'Alpaca Linear Thock',
    tagline: 'Deep, creamy, dampened acoustic thock',
    description: 'Filtered low-pass bottom-out sound favored by custom mechanical keyboard enthusiasts.',
    badge: 'Deep Thock',
  },
  {
    id: 'typewriter',
    name: 'Vintage Typewriter',
    tagline: 'Heavy mechanical strike + Carriage Bell',
    description: 'Crisp mechanical hammer strike on paper with a sweet metallic bell ding on Enter key.',
    badge: 'Mechanical Bell',
  },
  {
    id: 'hacker-beep',
    name: 'Cyberpunk Sci-Fi Beep',
    tagline: '8-bit retro console telemetry synthesizer',
    description: 'Futuristic blips and frequency shifts mimicking high-tech mainframe computer terminals.',
    badge: '8-Bit Synth',
  },
  {
    id: 'bubble-pop',
    name: 'Tactile Bubble Pop',
    tagline: 'Soft, playful acoustic pop',
    description: 'Gentle water bubble pops that make every keystroke calming and satisfying.',
    badge: 'Soft Pop',
  },
];

export const AudioSettingsSection: React.FC<AudioSettingsSectionProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const currentSoundpack = settings.typingSoundpack || 'none';
  const currentVolume = settings.typingSoundVolume !== undefined ? settings.typingSoundVolume : 0.35;
  const pitchVariation = settings.typingSoundPitchVariation !== false;

  const handleSelectSoundpack = (pack: TypingSoundpack) => {
    onUpdateSettings({ typingSoundpack: pack });
    audioEngine.setConfig(pack, currentVolume, pitchVariation);
    if (pack !== 'none') {
      audioEngine.playKey('a');
    }
  };

  const handleVolumeChange = (vol: number) => {
    onUpdateSettings({ typingSoundVolume: vol });
    audioEngine.setConfig(currentSoundpack, vol, pitchVariation);
    if (currentSoundpack !== 'none') {
      audioEngine.playKey(' ');
    }
  };

  const handleTogglePitchVariation = () => {
    const next = !pitchVariation;
    onUpdateSettings({ typingSoundPitchVariation: next });
    audioEngine.setConfig(currentSoundpack, currentVolume, next);
  };

  const handleTestKey = (key: string) => {
    audioEngine.setConfig(currentSoundpack, currentVolume, pitchVariation);
    audioEngine.playKey(key);
  };

  return (
    <div className="space-y-6 text-slate-200 text-xs">
      {/* Header */}
      <div className="bg-[#12131c] p-4 rounded-lg border border-[#222432] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={ICONS.volume} className="text-rose-400 text-sm" />
            <h3 className="text-sm font-semibold text-slate-100">Typing Audio & Keystroke Haptics</h3>
          </div>
          <p className="text-slate-400 text-[11px] mt-1">
            Synthesized Web Audio feedback on every keystroke. Zero lag, zero network downloads, pure satisfaction.
          </p>
        </div>
        <div className="text-right">
          <span
            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${
              currentSoundpack !== 'none'
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {currentSoundpack !== 'none' ? 'Active' : 'Muted'}
          </span>
        </div>
      </div>

      {/* Soundpack Cards Grid */}
      <div>
        <label className="block text-slate-300 font-semibold mb-2">Soundpack Profiles</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SOUNDPACK_OPTIONS.map((pack) => {
            const isSelected = currentSoundpack === pack.id;
            return (
              <div
                key={pack.id}
                onClick={() => handleSelectSoundpack(pack.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1b1724] border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.2)]'
                    : 'bg-[#10111a] border-[#222432] hover:border-slate-600 hover:bg-[#141522]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isSelected ? 'text-rose-300' : 'text-slate-200'}`}>
                      {pack.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1b26] border border-[#2e3144] text-slate-400 font-mono">
                      {pack.badge}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">{pack.tagline}</p>
                  <p className="text-slate-500 text-[10px] mt-1">{pack.description}</p>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#1d1f2d]">
                  <span className="text-[10px] text-slate-500">
                    {isSelected ? 'Currently Selected' : 'Click to activate'}
                  </span>
                  {pack.id !== 'none' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        audioEngine.setConfig(pack.id, currentVolume, pitchVariation);
                        audioEngine.playKey('Enter');
                      }}
                      className="px-2 py-0.5 rounded bg-[#202232] hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-[#2f3246] text-[10px] flex items-center space-x-1"
                    >
                      <FontAwesomeIcon icon={ICONS.play} className="text-[9px]" />
                      <span>Preview</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Volume & Variation Controls */}
      <div className="bg-[#10111a] p-4 rounded-lg border border-[#222432] space-y-4">
        <h4 className="font-semibold text-slate-200">Volume & Resonance Controls</h4>

        {/* Volume Slider */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-slate-400">Master Keystroke Volume</span>
            <span className="font-mono text-rose-400 font-bold">{Math.round(currentVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={currentVolume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-rose-500 bg-[#1b1c28] h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0% (Quiet)</span>
            <span>50% (Balanced)</span>
            <span>100% (High Intensity)</span>
          </div>
        </div>

        {/* Pitch Jitter Checkbox */}
        <div className="pt-2 border-t border-[#1d1f2d] flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-200">Acoustic Pitch Micro-Variation</div>
            <p className="text-slate-400 text-[11px]">
              Subtly modulates pitch on every stroke to simulate real mechanical switch tolerances.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTogglePitchVariation}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              pitchVariation ? 'bg-rose-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                pitchVariation ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Interactive Key Test Pad */}
      <div className="bg-[#10111a] p-4 rounded-lg border border-[#222432]">
        <h4 className="font-semibold text-slate-200 mb-2">Interactive Keystroke Test Pad</h4>
        <p className="text-slate-400 text-[11px] mb-3">
          Click the keys below to test switch actuation, spacebar resonance, and Enter carriage return:
        </p>
        <div className="flex flex-wrap gap-2 font-mono">
          {['A', 'S', 'D', 'F', 'Space', 'Backspace', 'Enter'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handleTestKey(k === 'Space' ? ' ' : k)}
              className="px-4 py-2 rounded bg-[#1a1b27] hover:bg-rose-900/40 active:scale-95 border border-[#2e3144] hover:border-rose-500/50 text-slate-200 text-xs font-semibold transition-all shadow-sm"
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
