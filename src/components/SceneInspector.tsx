import React from 'react';
import { Camera, ImagePlus, Volume2, Loader2, Trash2 } from 'lucide-react';
import {
  CameraMove,
  CharacterAction,
  CharacterType,
  LightingMood,
  VideoScene,
} from '../types';

interface SceneInspectorProps {
  scenes: VideoScene[];
  activeIndex: number;
  onSelectScene: (index: number) => void;
  onUpdateScene: (index: number, patch: Partial<VideoScene>) => void;
  onRegenerateAudio: (index: number) => void;
  regeneratingAudioIndex: number | null;
}

const CAMERA_MOVES: Array<{ id: CameraMove; label: string }> = [
  { id: 'push_in', label: 'Zoom ចូល (Push In)' },
  { id: 'orbit_3d', label: 'បង្វិលកាមេរ៉ា 3D (Orbit)' },
  { id: 'pan_left', label: 'រំកិលឆ្វេង (Pan Left)' },
  { id: 'pan_right', label: 'រំកិលស្តាំ (Pan Right)' },
  { id: 'tilt_up', label: 'ងើយឡើងលើ (Tilt Up)' },
  { id: 'static_cinematic', label: 'កាមេរ៉ានឹង (Static)' },
];

const CHARACTER_TYPES: Array<{ id: CharacterType; label: string }> = [
  { id: 'human_realistic', label: 'មនុស្សពិត (Realistic Human)' },
  { id: 'presenter_human', label: 'អ្នកបង្ហាញមាតិកា (Presenter)' },
  { id: 'hero_3d', label: 'តួអង្គ 3D (3D Hero)' },
  { id: 'robot_3d', label: 'មនុស្សយន្ត 3D (3D Robot)' },
  { id: 'cartoon_kid', label: 'ក្មេងតុក្កតា (Cartoon Kid)' },
  { id: 'cartoon_animal', label: 'សត្វតុក្កតា (Cartoon Animal)' },
  { id: 'none', label: 'គ្មានតួអង្គ (Scenery Only)' },
];

const CHARACTER_ACTIONS: Array<{ id: CharacterAction; label: string }> = [
  { id: 'talk', label: 'និយាយ (Talk)' },
  { id: 'present', label: 'បង្ហាញ (Present)' },
  { id: 'wave', label: 'គ្រវីដៃ (Wave)' },
  { id: 'walk', label: 'ដើរ (Walk)' },
  { id: 'run', label: 'រត់ (Run)' },
  { id: 'fly', label: 'ហោះហើរ (Fly)' },
  { id: 'look_around', label: 'មើលជុំវិញ (Look)' },
];

export const SceneInspector: React.FC<SceneInspectorProps> = ({
  scenes,
  activeIndex,
  onSelectScene,
  onUpdateScene,
  onRegenerateAudio,
  regeneratingAudioIndex,
}) => {
  const activeScene = scenes[activeIndex];
  if (!activeScene) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateScene(activeIndex, { customImageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-[#13161E] border border-white/[0.08] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-white">
          តារាងឈុតឆាកវីដេអូ (Storyboard Timeline)
        </h3>
        <span className="font-mono-num text-xs text-slate-400">
          {scenes.length} ឈុត ·{' '}
          {scenes.reduce((acc, s) => acc + s.durationSec, 0).toFixed(1)}s
        </span>
      </div>

      {/* Horizontal Storyboard Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {scenes.map((scene, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSelectScene(idx)}
              className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D2A] ${
                isActive
                  ? 'bg-[#1D222E] border-[#E85D2A]'
                  : 'bg-[#0B0D12] border-white/[0.08] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="font-mono-num font-medium text-slate-300">
                  #{String(idx + 1).padStart(2, '0')}
                </span>
                <span className="font-mono-num">{scene.durationSec.toFixed(1)}s</span>
              </div>
              <div className="text-xs font-medium text-white truncate">
                {scene.title}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-1">
                {scene.cameraMove.replace('_', ' ')} · {scene.characterType.replace('_', ' ')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Scene Inline Editor */}
      <div className="pt-3 border-t border-white/[0.08] grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              អត្ថបទនិយាយ AI (Narration)
            </label>
            <textarea
              rows={2}
              value={activeScene.narration}
              onChange={(e) =>
                onUpdateScene(activeIndex, { narration: e.target.value })
              }
              className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E85D2A] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">
                អក្សររត់លើអេក្រង់ (Subtitle)
              </label>
              <input
                type="text"
                value={activeScene.subtitle}
                onChange={(e) =>
                  onUpdateScene(activeIndex, { subtitle: e.target.value })
                }
                className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E85D2A]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                រយៈពេល (វិនាទី)
              </label>
              <input
                type="number"
                min={2}
                max={12}
                step={0.5}
                value={activeScene.durationSec}
                onChange={(e) =>
                  onUpdateScene(activeIndex, {
                    durationSec: Math.max(2, Math.min(12, Number(e.target.value) || 4)),
                  })
                }
                className="w-full font-mono-num bg-[#0B0D12] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E85D2A]"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                <Camera className="w-3 h-3" />
                <span>ចលនាកាមេរ៉ា</span>
              </label>
              <select
                value={activeScene.cameraMove}
                onChange={(e) =>
                  onUpdateScene(activeIndex, {
                    cameraMove: e.target.value as CameraMove,
                  })
                }
                className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#E85D2A]"
              >
                {CAMERA_MOVES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">តួអង្គ</label>
              <select
                value={activeScene.characterType}
                onChange={(e) =>
                  onUpdateScene(activeIndex, {
                    characterType: e.target.value as CharacterType,
                  })
                }
                className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#E85D2A]"
              >
                {CHARACTER_TYPES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-slate-400 mb-1">សកម្មភាព</label>
              <select
                value={activeScene.characterAction}
                onChange={(e) =>
                  onUpdateScene(activeIndex, {
                    characterAction: e.target.value as CharacterAction,
                  })
                }
                className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#E85D2A]"
              >
                {CHARACTER_ACTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">ពន្លឺឈុត</label>
              <select
                value={activeScene.lightingMood}
                onChange={(e) =>
                  onUpdateScene(activeIndex, {
                    lightingMood: e.target.value as LightingMood,
                  })
                }
                className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#E85D2A]"
              >
                <option value="golden_hour">ពន្លឺមាស</option>
                <option value="studio_key">ស្ទូឌីយោ</option>
                <option value="neon_dusk">ទីក្រុងយប់</option>
                <option value="soft_daylight">ថ្ងៃធម្មជាតិ</option>
                <option value="dramatic_rim">ភាពយន្ត</option>
                <option value="pastel_morning">ព្រឹកស្រទន់</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onRegenerateAudio(activeIndex)}
              disabled={regeneratingAudioIndex === activeIndex}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1E2430] hover:bg-[#283040] text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {regeneratingAudioIndex === activeIndex ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>បង្កើតសំឡេងឈុតនេះ</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] hover:border-white/25 text-xs text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0">
              <ImagePlus className="w-3.5 h-3.5 text-slate-400" />
              <span>បញ្ចូលរូបភាពពិត</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="sr-only"
              />
            </label>

            {activeScene.customImageUrl && (
              <button
                type="button"
                onClick={() =>
                  onUpdateScene(activeIndex, { customImageUrl: undefined })
                }
                title="លុបរូបភាពផ្ទាល់ខ្លួន"
                className="p-2 rounded-lg border border-white/[0.1] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
