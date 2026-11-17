import React from 'react';
import { Sliders, Volume2, Type as TypeIcon, Sun, Sparkles } from 'lucide-react';
import {
  ColorLut,
  LightingMood,
  RealismSettings,
  VideoStyleMode,
  VoiceName,
} from '../types';
import { STYLE_PREVIEW_ASSETS } from '../data/presets';

interface RealismSettingsPanelProps {
  mode: VideoStyleMode;
  onModeChange: (mode: VideoStyleMode) => void;
  realism: RealismSettings;
  onRealismChange: (next: RealismSettings) => void;
  voiceName: VoiceName;
  onVoiceChange: (v: VoiceName) => void;
  enableVoiceover: boolean;
  onToggleVoiceover: (enabled: boolean) => void;
  enableSubtitles: boolean;
  onToggleSubtitles: (enabled: boolean) => void;
  subtitlePosition: 'bottom' | 'center';
  onSubtitlePositionChange: (pos: 'bottom' | 'center') => void;
}

const STYLE_MODES: Array<{
  id: VideoStyleMode;
  titleKm: string;
  subtitleKm: string;
  image: string;
}> = [
  {
    id: 'cartoon',
    titleKm: 'តុក្កតា 2D',
    subtitleKm: 'គំនូរជីវចល និងពណ៌ស្រស់ថ្លា',
    image: STYLE_PREVIEW_ASSETS.cartoon,
  },
  {
    id: '3d',
    titleKm: 'វីដេអូ 3D',
    subtitleKm: 'ជម្រៅ 3D និងពន្លឺវិមាត្រ',
    image: STYLE_PREVIEW_ASSETS['3d'],
  },
  {
    id: 'photoreal',
    titleKm: 'ដូចមនុស្សពិតៗ',
    subtitleKm: 'កម្រិតភាពយន្តពិត និងពន្លឺស្ទូឌីយោ',
    image: STYLE_PREVIEW_ASSETS.photoreal,
  },
];

const LIGHTING_OPTIONS: Array<{ id: LightingMood; labelKm: string }> = [
  { id: 'golden_hour', labelKm: 'ពន្លឺថ្ងៃរះពណ៌មាស' },
  { id: 'studio_key', labelKm: 'ពន្លឺស្ទូឌីយោមនុស្សពិត' },
  { id: 'neon_dusk', labelKm: 'ពន្លឺទីក្រុងពេលល្ងាច' },
  { id: 'soft_daylight', labelKm: 'ពន្លឺធម្មជាតិពេលថ្ងៃ' },
  { id: 'dramatic_rim', labelKm: 'ពន្លឺភាពយន្តកម្រិតខ្ពស់' },
  { id: 'pastel_morning', labelKm: 'ពន្លឺព្រឹកស្រទន់' },
];

const LUT_OPTIONS: Array<{ id: ColorLut; labelKm: string }> = [
  { id: 'cinema', labelKm: 'Cinema 35mm' },
  { id: 'natural', labelKm: 'ធម្មជាតិពិត' },
  { id: 'warm_angkor', labelKm: 'កក់ក្តៅពណ៌មាស' },
  { id: 'vibrant_social', labelKm: 'Reels / Social' },
];

const VOICES: Array<{ id: VoiceName; label: string }> = [
  { id: 'Kore', label: 'Kore · សំឡេងស្រទន់' },
  { id: 'Puck', label: 'Puck · សំឡេងរស់រវើក' },
  { id: 'Charon', label: 'Charon · សំឡេងធ្ងន់ម៉ឺងម៉ាត់' },
  { id: 'Fenrir', label: 'Fenrir · សំឡេងនិទានរឿង' },
  { id: 'Zephyr', label: 'Zephyr · សំឡេងស្ទូឌីយោ' },
];

export const RealismSettingsPanel: React.FC<RealismSettingsPanelProps> = ({
  mode,
  onModeChange,
  realism,
  onRealismChange,
  voiceName,
  onVoiceChange,
  enableVoiceover,
  onToggleVoiceover,
  enableSubtitles,
  onToggleSubtitles,
  subtitlePosition,
  onSubtitlePositionChange,
}) => {
  const updateField = <K extends keyof RealismSettings>(
    key: K,
    value: RealismSettings[K]
  ) => {
    onRealismChange({ ...realism, [key]: value });
  };

  return (
    <section
      id="realism-settings"
      aria-label="ការកំណត់វីដេអូ 3D និងភាពដូចមនុស្សពិត"
      className="bg-[#13161E] border border-white/[0.08] rounded-xl p-5 space-y-5"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sliders className="w-4 h-4 text-[#E85D2A] shrink-0" />
          <h2 className="text-sm font-semibold text-white truncate">
            កំណត់រចនាប័ទ្ម តុក្កតា · 3D · ដូចមនុស្សពិតៗ
          </h2>
        </div>
        <span className="font-mono-num text-xs text-slate-400 whitespace-nowrap shrink-0">
          {realism.frameRate} FPS
        </span>
      </div>

      {/* 3 Visual Style Preset Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {STYLE_MODES.map((item) => {
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onModeChange(item.id)}
              className={`group text-left rounded-lg overflow-hidden border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D2A] ${
                active
                  ? 'border-[#E85D2A] bg-[#1B202C]'
                  : 'border-white/[0.08] bg-[#0E1117] hover:border-white/20'
              }`}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#181C26]">
                <img
                  src={item.image}
                  alt={item.titleKm}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute bottom-1.5 left-2 right-2">
                  <div className="text-xs font-semibold text-white truncate">
                    {item.titleKm}
                  </div>
                </div>
              </div>
              <div className="px-2 py-1.5">
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {item.subtitleKm}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dedicated 3D & Human Realism Sliders */}
      <div className="space-y-3.5 pt-1">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300">កម្រិតជម្រៅ 3D (3D Perspective Depth)</span>
            <span className="font-mono-num text-slate-200">{realism.depth3D}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={realism.depth3D}
            onChange={(e) => updateField('depth3D', Number(e.target.value))}
            className="w-full studio-slider"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300">
              ភាពដូចមនុស្សពិត និងស្បែក (Skin &amp; Surface Realism)
            </span>
            <span className="font-mono-num text-slate-200">
              {realism.skinAndSurfaceRealism}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={realism.skinAndSurfaceRealism}
            onChange={(e) => updateField('skinAndSurfaceRealism', Number(e.target.value))}
            className="w-full studio-slider"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 truncate">Depth Bokeh</span>
              <span className="font-mono-num text-slate-200">{realism.bokehBlur}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={realism.bokehBlur}
              onChange={(e) => updateField('bokehBlur', Number(e.target.value))}
              className="w-full studio-slider"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 truncate">Film Grain 35mm</span>
              <span className="font-mono-num text-slate-200">{realism.filmGrain}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={realism.filmGrain}
              onChange={(e) => updateField('filmGrain', Number(e.target.value))}
              className="w-full studio-slider"
            />
          </div>
        </div>
      </div>

      {/* Lighting & Color Grading */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.08]">
        <div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
            <Sun className="w-3.5 h-3.5 text-slate-400" />
            <span>ពន្លឺស្ទូឌីយោ</span>
          </label>
          <select
            value={realism.lightingPreset}
            onChange={(e) =>
              updateField('lightingPreset', e.target.value as LightingMood)
            }
            className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#E85D2A]"
          >
            {LIGHTING_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.labelKm}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            <span>ពណ៌ភាពយន្ត (Color LUT)</span>
          </label>
          <select
            value={realism.colorLut}
            onChange={(e) => updateField('colorLut', e.target.value as ColorLut)}
            className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#E85D2A]"
          >
            {LUT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.labelKm}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Voiceover & Subtitles */}
      <div className="space-y-3 pt-2 border-t border-white/[0.08]">
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={enableVoiceover}
              onChange={(e) => onToggleVoiceover(e.target.checked)}
              className="accent-[#E85D2A] w-4 h-4 rounded"
            />
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span>បើកសំឡេងនិយាយ AI (Voiceover)</span>
          </label>

          <select
            value={voiceName}
            disabled={!enableVoiceover}
            onChange={(e) => onVoiceChange(e.target.value as VoiceName)}
            className="bg-[#0B0D12] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 disabled:opacity-40 focus:outline-none focus:border-[#E85D2A]"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={enableSubtitles}
              onChange={(e) => onToggleSubtitles(e.target.checked)}
              className="accent-[#E85D2A] w-4 h-4 rounded"
            />
            <TypeIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>អក្សររត់លើវីដេអូ (Subtitles)</span>
          </label>

          <div className="flex items-center gap-1 p-0.5 bg-[#0B0D12] border border-white/[0.08] rounded-lg">
            <button
              type="button"
              onClick={() => onSubtitlePositionChange('bottom')}
              className={`px-2.5 py-1 text-[11px] rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                subtitlePosition === 'bottom'
                  ? 'bg-[#1E2430] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ខាងក្រោម
            </button>
            <button
              type="button"
              onClick={() => onSubtitlePositionChange('center')}
              className={`px-2.5 py-1 text-[11px] rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                subtitlePosition === 'center'
                  ? 'bg-[#1E2430] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              កណ្តាល
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
