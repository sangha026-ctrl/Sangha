import { VideoProject } from '../types';
import { getCanvasResolution, renderVideoFrame } from './videoRenderer';

export interface ExportProgressCallback {
  (percent: number, label: string): void;
}

async function decodeAudioBuffer(
  ctx: AudioContext,
  dataUrl: string
): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(dataUrl);
    const arrayBuf = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuf);
  } catch {
    return null;
  }
}

export async function exportProjectToVideo(
  project: VideoProject,
  loadedImages: Record<string, HTMLImageElement>,
  onProgress: ExportProgressCallback
): Promise<{ blob: Blob; filename: string }> {
  const { width, height } = getCanvasResolution(project.aspectRatio, false);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable for export.');
  }

  const fps = project.realismSettings.frameRate || 30;
  const totalDuration = project.scenes.reduce((acc, s) => acc + s.durationSec, 0);

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();

  // Subtle ambient background pad so exported video always has a clean audio track
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.06;
  masterGain.connect(dest);

  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc2.type = 'triangle';
  const baseFreq =
    project.musicMood === 'playful'
      ? 261.63
      : project.musicMood === 'dramatic'
        ? 196.0
        : 220.0;
  osc1.frequency.value = baseFreq;
  osc2.frequency.value = baseFreq * 1.5;
  osc1.connect(masterGain);
  osc2.connect(masterGain);

  // Decode scene voiceover buffers if enabled
  const sceneBuffers: Array<{ startOffset: number; buffer: AudioBuffer }> = [];
  if (project.enableVoiceover) {
    let cursor = 0;
    for (const scene of project.scenes) {
      if (scene.audioDataUrl) {
        const buf = await decodeAudioBuffer(audioCtx, scene.audioDataUrl);
        if (buf) {
          sceneBuffers.push({ startOffset: cursor, buffer: buf });
        }
      }
      cursor += scene.durationSec;
    }
  }

  const videoStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const preferredMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: preferredMime,
    videoBitsPerSecond: 4_500_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
    recorder.onerror = (err) => reject(err);
  });

  await audioCtx.resume();
  const startAudioTime = audioCtx.currentTime + 0.05;
  osc1.start(startAudioTime);
  osc2.start(startAudioTime);
  osc1.stop(startAudioTime + totalDuration);
  osc2.stop(startAudioTime + totalDuration);

  for (const item of sceneBuffers) {
    const src = audioCtx.createBufferSource();
    src.buffer = item.buffer;
    src.connect(dest);
    src.start(startAudioTime + item.startOffset);
  }

  recorder.start(250);

  const frameIntervalMs = 1000 / fps;
  const startPerf = performance.now();

  await new Promise<void>((resolve) => {
    const step = () => {
      const elapsedSec = (performance.now() - startPerf) / 1000;
      if (elapsedSec >= totalDuration) {
        onProgress(98, 'Finalizing video file');
        resolve();
        return;
      }

      let acc = 0;
      let activeScene = project.scenes[0];
      let sceneProgress = 0;
      for (const s of project.scenes) {
        if (elapsedSec <= acc + s.durationSec) {
          activeScene = s;
          sceneProgress = Math.min(1, Math.max(0, (elapsedSec - acc) / s.durationSec));
          break;
        }
        acc += s.durationSec;
      }

      renderVideoFrame(ctx, width, height, {
        scene: activeScene,
        sceneProgress,
        globalTimeSec: elapsedSec,
        mode: project.mode,
        aspectRatio: project.aspectRatio,
        realism: project.realismSettings,
        enableSubtitles: project.enableSubtitles,
        subtitlePosition: project.subtitlePosition,
        isSpeaking: Boolean(project.enableVoiceover && activeScene.narration),
        loadedImages,
      });

      const pct = Math.min(97, Math.round((elapsedSec / totalDuration) * 100));
      onProgress(pct, `Rendering ${activeScene.title}`);
      setTimeout(step, frameIntervalMs);
    };
    step();
  });

  recorder.stop();
  const blob = await recordingDone;
  await audioCtx.close();

  const safeSlug = project.projectTitle
    .toLowerCase()
    .replace(/[^a-z0-9\u1780-\u17FF]+/g, '-')
    .replace(/^-|-$/g, '') || 'kinokhmer-video';

  return {
    blob,
    filename: `${safeSlug}-${project.mode}.webm`,
  };
}
