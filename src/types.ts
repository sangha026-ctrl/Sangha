export type VideoStyleMode = 'cartoon' | '3d' | 'photoreal';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export type CameraMove =
  | 'push_in'
  | 'pan_left'
  | 'pan_right'
  | 'orbit_3d'
  | 'tilt_up'
  | 'static_cinematic';

export type VisualCue =
  | 'temple_sunrise'
  | 'modern_city'
  | 'studio_portrait'
  | 'forest_adventure'
  | 'ocean_coast'
  | 'cyber_lab'
  | 'cozy_home'
  | 'mountain_peak';

export type CharacterType =
  | 'human_realistic'
  | 'hero_3d'
  | 'cartoon_kid'
  | 'cartoon_animal'
  | 'robot_3d'
  | 'presenter_human'
  | 'none';

export type CharacterAction =
  | 'walk'
  | 'talk'
  | 'wave'
  | 'run'
  | 'fly'
  | 'present'
  | 'look_around';

export type LightingMood =
  | 'golden_hour'
  | 'studio_key'
  | 'neon_dusk'
  | 'soft_daylight'
  | 'dramatic_rim'
  | 'pastel_morning';

export type FxParticles =
  | 'sunbeams'
  | 'fireflies'
  | 'rain'
  | 'confetti'
  | 'bokeh'
  | 'none';

export type ColorLut = 'natural' | 'cinema' | 'warm_angkor' | 'vibrant_social';

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface RealismSettings {
  depth3D: number; // 0-100: 3D parallax & perspective depth
  skinAndSurfaceRealism: number; // 0-100: subsurface & photoreal shading
  bokehBlur: number; // 0-100: depth-of-field background blur
  filmGrain: number; // 0-100: 35mm realistic grain intensity
  studioKeyLight: number; // 0-100: 3-point key/rim intensity
  colorLut: ColorLut;
  lightingPreset: LightingMood;
  frameRate: 24 | 30;
}

export interface VideoScene {
  id: string;
  title: string;
  narration: string;
  subtitle: string;
  visualCue: VisualCue;
  settingDescription: string;
  characterType: CharacterType;
  characterAction: CharacterAction;
  cameraMove: CameraMove;
  lightingMood: LightingMood;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  durationSec: number;
  fxParticles: FxParticles;
  audioDataUrl?: string;
  customImageUrl?: string;
}

export interface VideoProject {
  id: string;
  idea: string;
  projectTitle: string;
  enhancedDirectorPrompt: string;
  mode: VideoStyleMode;
  aspectRatio: AspectRatio;
  language: 'km' | 'en';
  voiceName: VoiceName;
  enableVoiceover: boolean;
  enableSubtitles: boolean;
  subtitlePosition: 'bottom' | 'center';
  musicMood: 'uplifting' | 'cinematic' | 'playful' | 'calm' | 'dramatic';
  realismSettings: RealismSettings;
  scenes: VideoScene[];
  createdAt: string;
}

export interface IdeaTemplate {
  id: string;
  labelKm: string;
  labelEn: string;
  mode: VideoStyleMode;
  aspectRatio: AspectRatio;
  idea: string;
  lightingPreset: LightingMood;
}
