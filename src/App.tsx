import React, { useEffect, useState } from 'react';
import {
  Clapperboard,
  Download,
  Film,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import {
  AspectRatio,
  RealismSettings,
  VideoProject,
  VideoScene,
  VideoStyleMode,
} from './types';
import {
  IDEA_TEMPLATES,
  INITIAL_PROJECT,
  STYLE_PREVIEW_ASSETS,
} from './data/presets';
import { RealismSettingsPanel } from './components/RealismSettingsPanel';
import { VideoPreviewPlayer } from './components/VideoPreviewPlayer';
import { SceneInspector } from './components/SceneInspector';
import { exportProjectToVideo } from './engine/videoExporter';

const STORAGE_KEY = 'kinokhmer_saved_projects_v1';

export default function App() {
  const [project, setProject] = useState<VideoProject>(INITIAL_PROJECT);
  const [ideaInput, setIdeaInput] = useState<string>(INITIAL_PROJECT.idea);
  const [durationTarget, setDurationTarget] = useState<number>(20);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [autoPlaySignal, setAutoPlaySignal] = useState<number>(0);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [regeneratingAudioIndex, setRegeneratingAudioIndex] = useState<number | null>(null);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ percent: number; label: string }>({
    percent: 0,
    label: '',
  });
  const [downloadReady, setDownloadReady] = useState<{ url: string; filename: string } | null>(
    null
  );
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [savedProjects, setSavedProjects] = useState<VideoProject[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as VideoProject[]) : [];
    } catch {
      return [];
    }
  });

  // Preload style preview assets + custom scene photos into Image objects for Canvas rendering
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const urls = new Set<string>([
      STYLE_PREVIEW_ASSETS.cartoon,
      STYLE_PREVIEW_ASSETS['3d'],
      STYLE_PREVIEW_ASSETS.photoreal,
    ]);
    for (const scene of project.scenes) {
      if (scene.customImageUrl) urls.add(scene.customImageUrl);
    }

    urls.forEach((src) => {
      if (loadedImages[src]) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setLoadedImages((prev) => ({ ...prev, [src]: img }));
      };
      img.src = src;
    });
  }, [project.scenes, loadedImages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProjects.slice(0, 8)));
    } catch {
      // Ignore storage quota issues
    }
  }, [savedProjects]);

  const synthesizeSceneAudio = async (
    text: string,
    voiceName: VideoProject['voiceName'],
    style: string
  ): Promise<string | undefined> => {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName, style }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'មិនអាចបង្កើតសំឡេង AI បានទេ');
    }
    return data.audioDataUrl as string | undefined;
  };

  const handleGenerateVideo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ideaInput.trim()) {
      setErrorBanner('សូមបញ្ចូលគំនិតសម្រាប់បង្កើតវីដេអូជាមុនសិន។');
      return;
    }

    setErrorBanner(null);
    setDownloadReady(null);
    setIsGenerating(true);
    setGenerationStep('កំពុងវិភាគគំនិត និងបង្កើតឈុតឆាកវីដេអូ...');

    try {
      const res = await fetch('/api/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: ideaInput.trim(),
          mode: project.mode,
          aspectRatio: project.aspectRatio,
          durationTarget,
          language: project.language,
          realismSettings: project.realismSettings,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ការបង្កើត Storyboard មានបញ្ហា');
      }

      const rawScenes: VideoScene[] = Array.isArray(data.scenes) ? data.scenes : [];
      if (rawScenes.length === 0) {
        throw new Error('មិនមានឈុតឆាកត្រូវបានបង្កើតទេ សូមសាកល្បងម្ដងទៀត។');
      }

      const scenesWithAudio: VideoScene[] = [...rawScenes];

      if (project.enableVoiceover) {
        for (let i = 0; i < scenesWithAudio.length; i++) {
          setGenerationStep(
            `កំពុងបង្កើតសំឡេងនិយាយ AI (ឈុត ${i + 1}/${scenesWithAudio.length})...`
          );
          try {
            const audioUrl = await synthesizeSceneAudio(
              scenesWithAudio[i].narration,
              project.voiceName,
              project.mode === 'cartoon'
                ? 'Expressive animated storyteller'
                : 'Natural warm studio presenter'
            );
            scenesWithAudio[i] = { ...scenesWithAudio[i], audioDataUrl: audioUrl };
          } catch (ttsErr) {
            console.warn('TTS scene fallback:', ttsErr);
          }
        }
      }

      const nextProject: VideoProject = {
        ...project,
        id: `proj-${Date.now()}`,
        idea: ideaInput.trim(),
        projectTitle: data.projectTitle || 'វីដេអូថ្មី',
        enhancedDirectorPrompt: data.enhancedDirectorPrompt || '',
        musicMood: data.musicMood || 'uplifting',
        scenes: scenesWithAudio,
        createdAt: new Date().toISOString(),
      };

      setProject(nextProject);
      setActiveSceneIndex(0);
      setAutoPlaySignal((n) => n + 1);
      setSavedProjects((prev) => [nextProject, ...prev].slice(0, 8));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'មានបញ្ហាក្នុងការតភ្ជាប់';
      setErrorBanner(msg);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleRegenerateSceneAudio = async (idx: number) => {
    const scene = project.scenes[idx];
    if (!scene?.narration) return;
    setErrorBanner(null);
    setRegeneratingAudioIndex(idx);
    try {
      const audioDataUrl = await synthesizeSceneAudio(
        scene.narration,
        project.voiceName,
        project.mode === 'cartoon' ? 'Animated cheerful narrator' : 'Natural studio host'
      );
      setProject((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s, i) =>
          i === idx ? { ...s, audioDataUrl } : s
        ),
      }));
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'មិនអាចបង្កើតសំឡេងឈុតនេះបានទេ'
      );
    } finally {
      setRegeneratingAudioIndex(null);
    }
  };

  const handleExportVideo = async () => {
    setErrorBanner(null);
    setIsExporting(true);
    setExportProgress({ percent: 2, label: 'កំពុងរៀបចំ Render Engine...' });
    try {
      const { blob, filename } = await exportProjectToVideo(
        project,
        loadedImages,
        (percent, label) => setExportProgress({ percent, label })
      );
      const url = URL.createObjectURL(blob);
      setDownloadReady({ url, filename });

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'ការនាំចេញវីដេអូមានបញ្ហា'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateScene = (idx: number, patch: Partial<VideoScene>) => {
    setProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const handleApplyTemplate = (tplId: string) => {
    const tpl = IDEA_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    setIdeaInput(tpl.idea);
    setProject((prev) => ({
      ...prev,
      mode: tpl.mode,
      aspectRatio: tpl.aspectRatio,
      realismSettings: {
        ...prev.realismSettings,
        lightingPreset: tpl.lightingPreset,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F3F4F6] flex flex-col">
      {/* Top Bar Contract: Single Row, 3 Zones */}
      <header className="border-b border-white/[0.08] bg-[#0B0D12]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#studio-workspace"
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            KinoKhmer Studio
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <a
              href="#studio-workspace"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              បន្ទប់ផលិត
            </a>
            <a
              href="#realism-settings"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              កំណត់ 3D &amp; មនុស្សពិត
            </a>
            <a
              href="#idea-templates"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              គំរូរឿង
            </a>
            <a
              href="#saved-projects"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              បណ្ណាល័យវីដេអូ
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleExportVideo}
              disabled={isExporting || isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E85D2A] hover:bg-[#D14E1E] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-mono-num">{exportProgress.percent}%</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>នាំចេញវីដេអូ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main
        id="studio-workspace"
        className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 space-y-8"
      >
        {/* Status / Error Notifications */}
        {errorBanner && (
          <div
            role="alert"
            className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/50 border border-rose-500/30 text-sm text-rose-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{errorBanner}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-xs text-rose-300 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              បិទ
            </button>
          </div>
        )}

        {downloadReady && !isExporting && (
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-sm text-emerald-100">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>វីដេអូត្រូវបានផលិតរួចរាល់ ({downloadReady.filename})</span>
            </div>
            <a
              href={downloadReady.url}
              download={downloadReady.filename}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white whitespace-nowrap shrink-0"
            >
              ទាញយកម្តងទៀត
            </a>
          </div>
        )}

        {/* 2-Column Studio Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Control Rail */}
          <div className="xl:col-span-5 space-y-5">
            {/* Idea-to-Video Composer */}
            <form
              onSubmit={handleGenerateVideo}
              className="bg-[#13161E] border border-white/[0.08] rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Clapperboard className="w-4 h-4 text-[#E85D2A] shrink-0" />
                  <h1 className="text-base font-semibold text-white">
                    បញ្ចូលគំនិត ដើម្បីផលិតវីដេអូ AI
                  </h1>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                  Text-to-Video
                </span>
              </div>

              <div>
                <textarea
                  rows={4}
                  value={ideaInput}
                  onChange={(e) => setIdeaInput(e.target.value)}
                  placeholder="សរសេរគំនិតវីដេអូរបស់អ្នកនៅទីនេះ (ឧ. រឿងតុក្កតា វីដេអូ 3D ឬវីដេអូដូចមនុស្សពិតៗ)..."
                  className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-3.5 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E85D2A] resize-y"
                />
              </div>

              {/* Quick Format Settings */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    ទំហំអេក្រង់
                  </label>
                  <select
                    value={project.aspectRatio}
                    onChange={(e) =>
                      setProject((p) => ({
                        ...p,
                        aspectRatio: e.target.value as AspectRatio,
                      }))
                    }
                    className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#E85D2A]"
                  >
                    <option value="9:16">9:16 Reels / TikTok</option>
                    <option value="16:9">16:9 YouTube / FB</option>
                    <option value="1:1">1:1 Square Feed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    រយៈពេលសរុប
                  </label>
                  <select
                    value={durationTarget}
                    onChange={(e) => setDurationTarget(Number(e.target.value))}
                    className="w-full font-mono-num bg-[#0B0D12] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#E85D2A]"
                  >
                    <option value={15}>15 វិនាទី</option>
                    <option value={20}>20 វិនាទី</option>
                    <option value={30}>30 វិនាទី</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    ភាសាវីដេអូ
                  </label>
                  <select
                    value={project.language}
                    onChange={(e) =>
                      setProject((p) => ({
                        ...p,
                        language: e.target.value as 'km' | 'en',
                      }))
                    }
                    className="w-full bg-[#0B0D12] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#E85D2A]"
                  >
                    <option value="km">ភាសាខ្មែរ</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#E85D2A] hover:bg-[#D14E1E] text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{generationStep || 'កំពុងផលិតវីដេអូ...'}</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>បម្លែងគំនិតទៅជាវីដេអូ</span>
                  </>
                )}
              </button>
            </form>

            {/* In-App 3D & Human Realism Settings */}
            <RealismSettingsPanel
              mode={project.mode}
              onModeChange={(mode: VideoStyleMode) =>
                setProject((p) => ({ ...p, mode }))
              }
              realism={project.realismSettings}
              onRealismChange={(realismSettings: RealismSettings) =>
                setProject((p) => ({ ...p, realismSettings }))
              }
              voiceName={project.voiceName}
              onVoiceChange={(voiceName) => setProject((p) => ({ ...p, voiceName }))}
              enableVoiceover={project.enableVoiceover}
              onToggleVoiceover={(enableVoiceover) =>
                setProject((p) => ({ ...p, enableVoiceover }))
              }
              enableSubtitles={project.enableSubtitles}
              onToggleSubtitles={(enableSubtitles) =>
                setProject((p) => ({ ...p, enableSubtitles }))
              }
              subtitlePosition={project.subtitlePosition}
              onSubtitlePositionChange={(subtitlePosition) =>
                setProject((p) => ({ ...p, subtitlePosition }))
              }
            />
          </div>

          {/* Right Preview Stage & Storyboard */}
          <div className="xl:col-span-7 space-y-5">
            <VideoPreviewPlayer
              project={project}
              activeSceneIndex={activeSceneIndex}
              onActiveSceneChange={setActiveSceneIndex}
              loadedImages={loadedImages}
              autoPlaySignal={autoPlaySignal}
            />

            <SceneInspector
              scenes={project.scenes}
              activeIndex={activeSceneIndex}
              onSelectScene={(idx) => setActiveSceneIndex(idx)}
              onUpdateScene={handleUpdateScene}
              onRegenerateAudio={handleRegenerateSceneAudio}
              regeneratingAudioIndex={regeneratingAudioIndex}
            />
          </div>
        </div>

        {/* Starter Idea Templates */}
        <section id="idea-templates" className="pt-4 border-t border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-white">
              គំនិតគំរូសម្រាប់សាកល្បងផលិតវីដេអូភ្លាមៗ
            </h2>
            <span className="text-xs text-slate-400">
              ចុចជ្រើសរើសដើម្បីបំពេញចូលកម្មវិធី
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {IDEA_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleApplyTemplate(tpl.id)}
                className="text-left p-4 rounded-xl bg-[#13161E] border border-white/[0.08] hover:border-[#E85D2A]/60 transition-colors cursor-pointer space-y-2"
              >
                <div className="text-xs text-slate-400">
                  {tpl.mode === 'cartoon'
                    ? 'តុក្កតា 2D'
                    : tpl.mode === '3d'
                      ? 'វីដេអូ 3D'
                      : 'ដូចមនុស្សពិត'}{' '}
                  · {tpl.aspectRatio}
                </div>
                <div className="text-sm font-semibold text-white leading-snug">
                  {tpl.labelKm}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {tpl.idea}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Saved Video Library */}
        <section id="saved-projects" className="pt-4 border-t border-white/[0.08] space-y-4 pb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#E85D2A]" />
              <h2 className="text-base font-semibold text-white">
                បណ្ណាល័យវីដេអូដែលបានផលិត
              </h2>
            </div>
            <span className="font-mono-num text-xs text-slate-400">
              {savedProjects.length} គម្រោង
            </span>
          </div>

          {savedProjects.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#13161E] border border-white/[0.08] text-sm text-slate-400">
              មិនទាន់មានវីដេអូរក្សាទុកនៅឡើយទេ។ សូមបញ្ចូលគំនិតខាងលើ ហើយចុច
              «បម្លែងគំនិតទៅជាវីដេអូ» ដើម្បីបង្កើតវីដេអូដំបូងរបស់អ្នក។
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {savedProjects.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[#13161E] border border-white/[0.08] flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-400">
                      {item.mode === 'cartoon'
                        ? 'តុក្កតា 2D'
                        : item.mode === '3d'
                          ? 'វីដេអូ 3D'
                          : 'មនុស្សពិត'}{' '}
                      · {item.aspectRatio} ·{' '}
                      <span className="font-mono-num">{item.scenes.length} ឈុត</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">
                      {item.projectTitle}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {item.idea}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => {
                        setProject(item);
                        setIdeaInput(item.idea);
                        setActiveSceneIndex(0);
                        setAutoPlaySignal((n) => n + 1);
                      }}
                      className="text-xs font-medium text-[#E85D2A] hover:underline cursor-pointer whitespace-nowrap"
                    >
                      បើកកែសម្រួល
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSavedProjects((prev) =>
                          prev.filter((p) => p.id !== item.id)
                        )
                      }
                      title="លុបគម្រោង"
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
