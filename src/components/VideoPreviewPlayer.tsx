import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { VideoProject } from '../types';
import { getCanvasResolution, renderVideoFrame } from '../engine/videoRenderer';

interface VideoPreviewPlayerProps {
  project: VideoProject;
  activeSceneIndex: number;
  onActiveSceneChange: (index: number) => void;
  loadedImages: Record<string, HTMLImageElement>;
  autoPlaySignal: number;
}

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  project,
  activeSceneIndex,
  onActiveSceneChange,
  loadedImages,
  autoPlaySignal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const totalDuration = Math.max(
    1,
    project.scenes.reduce((acc, s) => acc + s.durationSec, 0)
  );

  // Compute start offset of each scene
  const sceneOffsets = React.useMemo(() => {
    const offsets: number[] = [];
    let cursor = 0;
    for (const s of project.scenes) {
      offsets.push(cursor);
      cursor += s.durationSec;
    }
    return offsets;
  }, [project.scenes]);

  // Auto-play when a newly generated project arrives
  useEffect(() => {
    if (autoPlaySignal > 0) {
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, [autoPlaySignal]);

  // Jump timeline when user clicks a scene card while paused or playing
  const jumpToScene = (idx: number) => {
    const offset = sceneOffsets[idx] ?? 0;
    setCurrentTime(offset + 0.01);
    onActiveSceneChange(idx);
  };

  // Find scene for any global timestamp
  const getSceneAtTime = (t: number) => {
    for (let i = 0; i < project.scenes.length; i++) {
      const start = sceneOffsets[i];
      const end = start + project.scenes[i].durationSec;
      if (t <= end || i === project.scenes.length - 1) {
        const progress = Math.min(
          1,
          Math.max(0, (t - start) / Math.max(0.1, project.scenes[i].durationSec))
        );
        return { index: i, scene: project.scenes[i], progress };
      }
    }
    return { index: 0, scene: project.scenes[0], progress: 0 };
  };

  // Animation loop
  useEffect(() => {
    let rafId = 0;
    let lastPerf = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastPerf) / 1000;
      lastPerf = now;

      setCurrentTime((prev) => {
        if (!isPlaying) return prev;
        const next = prev + dt;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration]);

  // Sync active scene index + draw canvas frame
  useEffect(() => {
    const { index, scene, progress } = getSceneAtTime(currentTime);
    if (index !== activeSceneIndex) {
      onActiveSceneChange(index);
    }

    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const { width, height } = getCanvasResolution(project.aspectRatio, true);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderVideoFrame(ctx, width, height, {
      scene,
      sceneProgress: progress,
      globalTimeSec: currentTime,
      mode: project.mode,
      aspectRatio: project.aspectRatio,
      realism: project.realismSettings,
      enableSubtitles: project.enableSubtitles,
      subtitlePosition: project.subtitlePosition,
      isSpeaking: isPlaying && project.enableVoiceover && Boolean(scene.narration),
      loadedImages,
    });
  }, [
    currentTime,
    project,
    isPlaying,
    loadedImages,
    activeSceneIndex,
    onActiveSceneChange,
  ]);

  // Sync real TTS WAV audio per scene
  useEffect(() => {
    const scene = project.scenes[activeSceneIndex];
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (!isPlaying || isMuted || !project.enableVoiceover || !scene?.audioDataUrl) {
      audioEl.pause();
      return;
    }

    if (audioEl.src !== scene.audioDataUrl) {
      audioEl.src = scene.audioDataUrl;
    }
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {
      // Browser autoplay policy fallback handled silently until next user click
    });
  }, [activeSceneIndex, isPlaying, isMuted, project.enableVoiceover, project.scenes]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = (sec % 60).toFixed(1).padStart(4, '0');
    return `${String(mins).padStart(2, '0')}:${rem}`;
  };

  const aspectBoxClass =
    project.aspectRatio === '9:16'
      ? 'max-w-[330px] aspect-[9/16]'
      : project.aspectRatio === '1:1'
        ? 'max-w-[460px] aspect-square'
        : 'w-full max-w-[780px] aspect-video';

  return (
    <div className="bg-[#13161E] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">
      <audio ref={audioRef} className="hidden" />

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white truncate">
            {project.projectTitle}
          </h2>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {project.mode === 'cartoon'
              ? 'តុក្កតា 2D'
              : project.mode === '3d'
                ? 'វីដេអូ 3D'
                : 'វីដេអូដូចមនុស្សពិតៗ'}{' '}
            · {project.aspectRatio} ·{' '}
            {project.scenes[activeSceneIndex]?.title ?? ''}
          </p>
        </div>

        <div className="font-mono-num text-xs text-slate-300 whitespace-nowrap shrink-0">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>
      </div>

      {/* Cinema Canvas Container */}
      <div className="w-full min-h-[380px] bg-[#07090D] border border-white/[0.06] rounded-lg p-4 flex items-center justify-center">
        <div
          className={`${aspectBoxClass} relative rounded-lg overflow-hidden border border-white/[0.1] bg-black shadow-2xl mx-auto`}
        >
          <canvas
            ref={canvasRef}
            onClick={() => setIsPlaying((p) => !p)}
            className="w-full h-full block cursor-pointer"
          />
        </div>
      </div>

      {/* Scrubber & Playback Controls */}
      <div className="space-y-3">
        <input
          type="range"
          min={0}
          max={totalDuration}
          step={0.05}
          value={currentTime}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          aria-label="Timeline Scrubber"
          className="w-full studio-slider"
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E85D2A] hover:bg-[#D14E1E] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>ផ្អាក</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>ចាក់វីដេអូ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentTime(0);
                setIsPlaying(true);
              }}
              title="ចាក់ឡើងវិញ"
              className="p-2 rounded-lg border border-white/[0.1] hover:border-white/25 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() =>
                jumpToScene(Math.max(0, activeSceneIndex - 1))
              }
              title="ឈុតមុន"
              className="p-2 rounded-lg border border-white/[0.1] hover:border-white/25 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() =>
                jumpToScene(
                  Math.min(project.scenes.length - 1, activeSceneIndex + 1)
                )
              }
              title="ឈុតបន្ទាប់"
              className="p-2 rounded-lg border border-white/[0.1] hover:border-white/25 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] hover:border-white/25 text-xs text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>បិទសំឡេង</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-slate-300" />
                <span>បើកសំឡេង</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
