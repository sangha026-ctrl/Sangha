import {
  AspectRatio,
  CharacterType,
  ColorLut,
  LightingMood,
  RealismSettings,
  VideoScene,
  VideoStyleMode,
} from '../types';

export interface RenderFrameOptions {
  scene: VideoScene;
  sceneProgress: number; // 0 to 1
  globalTimeSec: number;
  mode: VideoStyleMode;
  aspectRatio: AspectRatio;
  realism: RealismSettings;
  enableSubtitles: boolean;
  subtitlePosition: 'bottom' | 'center';
  isSpeaking: boolean;
  loadedImages: Record<string, HTMLImageElement>;
}

export function getCanvasResolution(
  aspectRatio: AspectRatio,
  previewScale = false
): { width: number; height: number } {
  if (previewScale) {
    if (aspectRatio === '9:16') return { width: 540, height: 960 };
    if (aspectRatio === '1:1') return { width: 720, height: 720 };
    return { width: 960, height: 540 };
  }
  if (aspectRatio === '9:16') return { width: 720, height: 1280 };
  if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
  return { width: 1280, height: 720 };
}

function getLightingColors(mood: LightingMood): {
  skyTop: string;
  skyBottom: string;
  keyLight: string;
  rimLight: string;
} {
  switch (mood) {
    case 'golden_hour':
      return {
        skyTop: '#1E1B4B',
        skyBottom: '#EA580C',
        keyLight: 'rgba(255, 200, 110, 0.36)',
        rimLight: 'rgba(251, 146, 60, 0.75)',
      };
    case 'neon_dusk':
      return {
        skyTop: '#0F172A',
        skyBottom: '#312E81',
        keyLight: 'rgba(96, 165, 250, 0.3)',
        rimLight: 'rgba(245, 158, 11, 0.8)',
      };
    case 'pastel_morning':
      return {
        skyTop: '#38BDF8',
        skyBottom: '#FDE68A',
        keyLight: 'rgba(255, 250, 220, 0.35)',
        rimLight: 'rgba(255, 255, 255, 0.7)',
      };
    case 'dramatic_rim':
      return {
        skyTop: '#09090B',
        skyBottom: '#27272A',
        keyLight: 'rgba(244, 244, 245, 0.22)',
        rimLight: 'rgba(232, 93, 42, 0.9)',
      };
    case 'soft_daylight':
      return {
        skyTop: '#0284C7',
        skyBottom: '#BAE6FD',
        keyLight: 'rgba(255, 255, 255, 0.32)',
        rimLight: 'rgba(224, 242, 254, 0.8)',
      };
    case 'studio_key':
    default:
      return {
        skyTop: '#18181B',
        skyBottom: '#292524',
        keyLight: 'rgba(255, 232, 204, 0.34)',
        rimLight: 'rgba(251, 191, 36, 0.7)',
      };
  }
}

function project3D(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  fov: number,
  yaw: number
): { x: number; y: number; scale: number } {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const rx = x * cosY - z * sinY;
  const rz = x * sinY + z * cosY;
  const depth = Math.max(120, fov + rz);
  const scale = fov / depth;
  return {
    x: cx + rx * scale,
    y: cy + y * scale,
    scale,
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawSceneEnvironment(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: VideoScene,
  mode: VideoStyleMode,
  progress: number,
  globalTime: number,
  depthFactor: number,
  lighting: ReturnType<typeof getLightingColors>,
  loadedImages: Record<string, HTMLImageElement>
) {
  // 1. Base Sky / Studio Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, lighting.skyTop);
  skyGrad.addColorStop(0.65, lighting.skyBottom);
  skyGrad.addColorStop(1, scene.secondaryColor || '#0F172A');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // If custom uploaded photo or photoreal studio backdrop exists
  const plateKey = scene.customImageUrl
    ? scene.customImageUrl
    : mode === 'photoreal' && (scene.visualCue === 'studio_portrait' || scene.visualCue === 'cozy_home')
      ? '/src/assets/images/style_photoreal_preview_1794888819869.jpg'
      : mode === '3d' && scene.visualCue === 'cyber_lab'
        ? '/src/assets/images/style_3d_preview_1794888818944.jpg'
        : null;

  if (plateKey && loadedImages[plateKey]?.complete && loadedImages[plateKey].naturalWidth > 0) {
    const img = loadedImages[plateKey];
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = w / h;
    let drawW = w;
    let drawH = h;
    if (imgAspect > canvasAspect) {
      drawH = h;
      drawW = h * imgAspect;
    } else {
      drawW = w;
      drawH = w / imgAspect;
    }
    const zoom = 1.06 + progress * 0.08;
    const dx = (w - drawW * zoom) / 2 + Math.sin(progress * Math.PI) * 18 * depthFactor;
    const dy = (h - drawH * zoom) / 2;

    ctx.save();
    ctx.globalAlpha = scene.customImageUrl ? 0.92 : 0.42;
    ctx.drawImage(img, dx, dy, drawW * zoom, drawH * zoom);
    ctx.restore();
  }

  // 2. Sun / Studio Key Glow
  const sunX = w * (0.72 - progress * 0.1);
  const sunY = h * 0.24;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, w * 0.45);
  sunGlow.addColorStop(0, lighting.keyLight);
  sunGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, w, h);

  // 3. Visual Cue Architectural / Nature Layer
  const parallax = (progress - 0.5) * 65 * depthFactor;
  const horizonY = h * 0.66;

  if (scene.visualCue === 'temple_sunrise' || scene.visualCue === 'mountain_peak') {
    // Distant hills
    ctx.fillStyle = mode === 'cartoon' ? '#2D4A53' : 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= w; x += w / 6) {
      const hillY = horizonY - Math.sin((x / w) * Math.PI * 2 + 0.5) * (h * 0.08) - h * 0.04;
      ctx.lineTo(x + parallax * 0.25, hillY);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    if (scene.visualCue === 'temple_sunrise') {
      // Stylized Angkor-inspired lotus spires silhouette
      const spireCenters = [w * 0.34, w * 0.5, w * 0.66];
      const spireHeights = [h * 0.19, h * 0.26, h * 0.19];
      spireCenters.forEach((sx, idx) => {
        const cx = sx + parallax * 0.45;
        const sh = spireHeights[idx];
        const baseW = w * 0.09;
        ctx.save();
        ctx.fillStyle = mode === 'cartoon' ? '#432C51' : '#1B1626';
        ctx.beginPath();
        ctx.moveTo(cx - baseW / 2, horizonY + 12);
        ctx.quadraticCurveTo(cx - baseW * 0.25, horizonY - sh * 0.65, cx, horizonY - sh);
        ctx.quadraticCurveTo(cx + baseW * 0.25, horizonY - sh * 0.65, cx + baseW / 2, horizonY + 12);
        ctx.closePath();
        ctx.fill();
        if (mode === 'cartoon') {
          ctx.strokeStyle = '#111827';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        ctx.restore();
      });
    }
  } else if (scene.visualCue === 'modern_city' || scene.visualCue === 'cyber_lab') {
    const buildingCount = 9;
    for (let i = 0; i < buildingCount; i++) {
      const bw = w / buildingCount;
      const bh = h * (0.18 + ((i * 37) % 5) * 0.055);
      const bx = i * bw + parallax * (0.2 + (i % 3) * 0.15);
      const by = horizonY - bh;

      if (mode === '3d') {
        const grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
        grad.addColorStop(0, '#334155');
        grad.addColorStop(1, '#0F172A');
        ctx.fillStyle = grad;
        ctx.fillRect(bx, by, bw * 0.86, bh + 20);
        // 3D side bevel
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(bx, by, 5, bh + 20);
      } else {
        ctx.fillStyle = mode === 'cartoon' ? '#2A334E' : 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(bx, by, bw * 0.86, bh + 20);
      }

      // Lit windows
      ctx.fillStyle = lighting.rimLight;
      for (let wy = by + 16; wy < horizonY - 12; wy += 22) {
        for (let wx = bx + 10; wx < bx + bw * 0.72; wx += 18) {
          if ((wx + wy + i) % 3 !== 0) {
            ctx.globalAlpha = 0.35 + Math.sin(globalTime * 2 + i) * 0.15;
            ctx.fillRect(wx, wy, 7, 10);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  } else if (scene.visualCue === 'forest_adventure') {
    for (let i = 0; i < 8; i++) {
      const tx = (w / 7) * i + parallax * (0.3 + (i % 2) * 0.2);
      const treeH = h * (0.22 + (i % 3) * 0.05);
      ctx.fillStyle = mode === 'cartoon' ? '#1E3A2F' : 'rgba(16, 42, 34, 0.85)';
      ctx.beginPath();
      ctx.moveTo(tx, horizonY - treeH);
      ctx.lineTo(tx - w * 0.08, horizonY + 12);
      ctx.lineTo(tx + w * 0.08, horizonY + 12);
      ctx.closePath();
      ctx.fill();
      if (mode === 'cartoon') {
        ctx.strokeStyle = '#0B1914';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  } else if (scene.visualCue === 'ocean_coast') {
    ctx.fillStyle = 'rgba(14, 116, 144, 0.55)';
    ctx.fillRect(0, horizonY - 14, w, h - horizonY + 14);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const wy = horizonY + i * 24;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 24) {
        const offset = Math.sin(x * 0.025 + globalTime * 2 + i) * 4;
        if (x === 0) ctx.moveTo(x, wy + offset);
        else ctx.lineTo(x, wy + offset);
      }
      ctx.stroke();
    }
  }

  // 4. Cartoon Clouds
  if (mode === 'cartoon') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 3; i++) {
      const cx = ((w * (0.2 + i * 0.35) + globalTime * 12) % (w + 160)) - 80;
      const cy = h * (0.14 + (i % 2) * 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.arc(cx + 22, cy - 8, 28, 0, Math.PI * 2);
      ctx.arc(cx + 48, cy, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. Ground Plane / 3D Perspective Stage
  const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
  groundGrad.addColorStop(0, mode === 'cartoon' ? '#2A4D3E' : '#111827');
  groundGrad.addColorStop(1, '#07090D');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  if (mode === '3d') {
    // True 3D perspective floor grid reacting to depthFactor
    const yaw = (progress - 0.5) * 0.35 * depthFactor;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSpan = 600;
    const step = 75;
    for (let gx = -gridSpan; gx <= gridSpan; gx += step) {
      const p1 = project3D(gx, 110, -100, w / 2, horizonY, 420, yaw);
      const p2 = project3D(gx, 110, 520, w / 2, horizonY, 420, yaw);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let gz = -40; gz <= 520; gz += step) {
      const p1 = project3D(-gridSpan, 110, gz, w / 2, horizonY, 420, yaw);
      const p2 = project3D(gridSpan, 110, gz, w / 2, horizonY, 420, yaw);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  characterType: CharacterType,
  action: VideoScene['characterAction'],
  mode: VideoStyleMode,
  progress: number,
  globalTime: number,
  isSpeaking: boolean,
  realism: RealismSettings,
  accentColor: string
) {
  if (characterType === 'none') return;

  const baseScale = Math.min(w, h) / 560;
  let cx = w * 0.5;
  let cy = h * 0.68;

  if (action === 'walk' || action === 'run') {
    const speed = action === 'run' ? 2 : 1;
    cx = w * (0.38 + progress * 0.24 * speed);
    cy += Math.abs(Math.sin(globalTime * (action === 'run' ? 11 : 7))) * -10 * baseScale;
  } else if (action === 'fly') {
    cx = w * (0.35 + progress * 0.3);
    cy = h * 0.44 + Math.sin(globalTime * 4) * 18 * baseScale;
  } else {
    cy += Math.sin(globalTime * 2.4) * 4 * baseScale;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(baseScale, baseScale);

  // Cast soft shadow on ground
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 74, 48, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const isPhotoreal = mode === 'photoreal' || characterType === 'human_realistic' || characterType === 'presenter_human';
  const is3D = mode === '3d';
  const isCartoon = mode === 'cartoon';

  const skinHighlight = realism.skinAndSurfaceRealism > 60 ? '#F7C9A9' : '#F3BE9A';
  const skinShadow = '#C58563';
  const suitPrimary = accentColor || '#E85D2A';
  const suitDark = '#1E293B';

  const waveAngle =
    action === 'wave' || action === 'present'
      ? -0.65 + Math.sin(globalTime * 6) * 0.38
      : Math.sin(globalTime * 3) * 0.14;
  const legSwing =
    action === 'walk' || action === 'run' ? Math.sin(globalTime * 8) * 18 : 0;

  if (characterType === 'robot_3d') {
    // 3D Volumetric Robot Companion
    const bob = Math.sin(globalTime * 3.5) * 6;
    ctx.translate(0, bob);

    // Thruster glow
    const thrust = ctx.createRadialGradient(0, 56, 2, 0, 56, 36);
    thrust.addColorStop(0, 'rgba(245, 158, 11, 0.85)');
    thrust.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = thrust;
    ctx.fillRect(-40, 30, 80, 60);

    // 3D Torso Capsule
    const bodyGrad = ctx.createRadialGradient(-12, -16, 8, 0, 0, 62);
    bodyGrad.addColorStop(0, '#F8FAFC');
    bodyGrad.addColorStop(0.55, '#94A3B8');
    bodyGrad.addColorStop(1, '#334155');
    ctx.fillStyle = bodyGrad;
    drawRoundedRect(ctx, -36, -34, 72, 74, 24);
    ctx.fill();

    // Chest Core
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(0, 2, 12, 0, Math.PI * 2);
    ctx.fill();

    // 3D Head Visor
    const headGrad = ctx.createRadialGradient(-10, -78, 6, 0, -68, 44);
    headGrad.addColorStop(0, '#FFFFFF');
    headGrad.addColorStop(0.6, '#CBD5E1');
    headGrad.addColorStop(1, '#475569');
    ctx.fillStyle = headGrad;
    drawRoundedRect(ctx, -32, -96, 64, 52, 22);
    ctx.fill();

    // Dark Glass Visor
    ctx.fillStyle = '#090D16';
    drawRoundedRect(ctx, -24, -84, 48, 26, 11);
    ctx.fill();

    // Expressive Glowing Eyes
    const blink = Math.sin(globalTime * 1.8) > 0.96 ? 0.15 : 1;
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.ellipse(-10, -71, 5, 7 * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(10, -71, 5, 7 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (characterType === 'cartoon_animal') {
    // Expressive Stylized Bunny / Woodland Friend
    const earWiggle = Math.sin(globalTime * 4) * 0.08;
    // Left & Right Ears
    [-14, 14].forEach((ex, idx) => {
      ctx.save();
      ctx.translate(ex, -84);
      ctx.rotate((idx === 0 ? -0.18 : 0.18) + earWiggle);
      ctx.fillStyle = '#F3F4F6';
      ctx.beginPath();
      ctx.ellipse(0, -26, 10, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      if (isCartoon) {
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.fillStyle = '#FDA4AF';
      ctx.beginPath();
      ctx.ellipse(0, -24, 5, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Body
    ctx.fillStyle = suitPrimary;
    drawRoundedRect(ctx, -26, -24, 52, 66, 22);
    ctx.fill();
    if (isCartoon) {
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Head
    ctx.fillStyle = '#F9FAFB';
    ctx.beginPath();
    ctx.arc(0, -56, 32, 0, Math.PI * 2);
    ctx.fill();
    if (isCartoon) {
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Eyes & Speaking Mouth
    const blink = Math.sin(globalTime * 2.2) > 0.96 ? 0.2 : 1;
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.ellipse(-11, -59, 4, 5.5 * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(11, -59, 4, 5.5 * blink, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.fillStyle = '#FB7185';
    const mouthOpen = isSpeaking ? 4 + Math.abs(Math.sin(globalTime * 16)) * 6 : 2;
    ctx.beginPath();
    ctx.ellipse(0, -42, 6, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Human / 3D Hero / Cartoon Kid / Realistic Presenter
    // Legs
    ctx.strokeStyle = isCartoon ? '#111827' : suitDark;
    ctx.lineWidth = isCartoon ? 14 : 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-13, 28);
    ctx.lineTo(-15 - legSwing, 68);
    ctx.moveTo(13, 28);
    ctx.lineTo(15 + legSwing, 68);
    ctx.stroke();

    // Arms
    ctx.save();
    ctx.translate(28, -22);
    ctx.rotate(waveAngle);
    ctx.strokeStyle = isPhotoreal ? '#1F2937' : suitPrimary;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(20, 28);
    ctx.stroke();
    ctx.fillStyle = skinHighlight;
    ctx.beginPath();
    ctx.arc(21, 30, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-28, -22);
    ctx.rotate(-waveAngle * 0.4);
    ctx.strokeStyle = isPhotoreal ? '#1F2937' : suitPrimary;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, 30);
    ctx.stroke();
    ctx.fillStyle = skinHighlight;
    ctx.beginPath();
    ctx.arc(-19, 32, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Torso (3D / Photorealistic jacket shading vs Cartoon)
    if (is3D || isPhotoreal) {
      const torsoGrad = ctx.createLinearGradient(-30, -34, 34, 36);
      torsoGrad.addColorStop(0, isPhotoreal ? '#374151' : suitPrimary);
      torsoGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = torsoGrad;
    } else {
      ctx.fillStyle = suitPrimary;
    }
    drawRoundedRect(ctx, -30, -34, 60, 68, 18);
    ctx.fill();

    // Subtle lapel / collar detail for realistic presenter
    if (isPhotoreal) {
      ctx.fillStyle = '#F3F4F6';
      ctx.beginPath();
      ctx.moveTo(-10, -34);
      ctx.lineTo(0, -10);
      ctx.lineTo(10, -34);
      ctx.closePath();
      ctx.fill();
    }

    if (isCartoon) {
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Head with Subsurface / Rim Shading
    const headRadius = isCartoon ? 30 : 27;
    if (is3D || isPhotoreal) {
      const faceGrad = ctx.createRadialGradient(-9, -76, 5, 0, -68, headRadius + 8);
      faceGrad.addColorStop(0, skinHighlight);
      faceGrad.addColorStop(0.75, '#E2A683');
      faceGrad.addColorStop(1, skinShadow);
      ctx.fillStyle = faceGrad;
    } else {
      ctx.fillStyle = skinHighlight;
    }
    ctx.beginPath();
    ctx.arc(0, -68, headRadius, 0, Math.PI * 2);
    ctx.fill();
    if (isCartoon) {
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Hair silhouette
    ctx.fillStyle = '#1C1917';
    ctx.beginPath();
    ctx.arc(0, -75, headRadius + 1, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();

    // Eyes
    const blink = Math.sin(globalTime * 2.1) > 0.96 ? 0.18 : 1;
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.ellipse(-9, -68, 3.3, 4.4 * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(9, -68, 3.3, 4.4 * blink, 0, 0, Math.PI * 2);
    ctx.fill();

    // Natural Speaking Lip-Sync
    const mouthH = isSpeaking ? 2.5 + Math.abs(Math.sin(globalTime * 15)) * 4.5 : 1.5;
    ctx.fillStyle = isSpeaking ? '#9F1239' : '#B45309';
    ctx.beginPath();
    ctx.ellipse(0, -54, 6.5, mouthH, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawAtmosphericFx(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: VideoScene,
  globalTime: number,
  realism: RealismSettings
) {
  const particleCount = scene.fxParticles === 'bokeh' || realism.bokehBlur > 40 ? 18 : 14;
  if (scene.fxParticles === 'none' && realism.bokehBlur < 25) return;

  ctx.save();
  for (let i = 0; i < particleCount; i++) {
    const seed = i * 137.5;
    const px = ((seed * 3.7 + globalTime * (14 + (i % 4) * 5)) % (w + 60)) - 30;
    const py = ((seed * 2.3 - globalTime * (10 + (i % 3) * 6)) % (h + 60) + h + 60) % (h + 60) - 30;

    if (scene.fxParticles === 'rain') {
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - 6, py + 18);
      ctx.stroke();
    } else if (scene.fxParticles === 'confetti') {
      ctx.fillStyle = ['#F59E0B', '#E85D2A', '#38BDF8', '#34D399'][i % 4];
      ctx.fillRect(px, py, 7, 4);
    } else {
      // Bokeh / Fireflies / Sunbeams
      const radius =
        scene.fxParticles === 'bokeh' || realism.bokehBlur > 55
          ? 8 + (i % 5) * (realism.bokehBlur / 15)
          : 2.5 + (i % 3);
      ctx.fillStyle =
        scene.fxParticles === 'fireflies'
          ? `rgba(253, 224, 71, ${0.3 + Math.sin(globalTime * 4 + i) * 0.25})`
          : `rgba(255, 228, 196, ${0.06 + (i % 3) * 0.03})`;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function applyPostGrading(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mode: VideoStyleMode,
  lut: ColorLut,
  realism: RealismSettings,
  globalTime: number
) {
  // Color LUT tint
  ctx.save();
  if (lut === 'cinema') {
    ctx.fillStyle = 'rgba(15, 35, 55, 0.14)';
    ctx.fillRect(0, 0, w, h);
  } else if (lut === 'warm_angkor') {
    ctx.fillStyle = 'rgba(217, 119, 6, 0.11)';
    ctx.fillRect(0, 0, w, h);
  } else if (lut === 'vibrant_social') {
    ctx.fillStyle = 'rgba(232, 93, 42, 0.06)';
    ctx.fillRect(0, 0, w, h);
  }

  // Subtle vignette for 3D & Photoreal modes
  if (mode !== 'cartoon') {
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w * 0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.48)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  // Subtle 35mm film grain speckles (deterministic pseudo-random per frame for performance)
  if (mode === 'photoreal' && realism.filmGrain > 10) {
    const dots = Math.floor(realism.filmGrain * 1.4);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let i = 0; i < dots; i++) {
      const gx = Math.abs(Math.sin(globalTime * 57.3 + i * 19.1) * w) % w;
      const gy = Math.abs(Math.cos(globalTime * 41.7 + i * 31.7) * h) % h;
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  }
  ctx.restore();
}

function drawSubtitles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  text: string,
  position: 'bottom' | 'center',
  progress: number
) {
  if (!text.trim()) return;
  const fade = Math.min(1, progress * 6, (1 - progress) * 6 + 0.2);

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, fade));

  const fontSize = Math.max(18, Math.round(w * 0.036));
  ctx.font = `600 ${fontSize}px "Kantumruy Pro", "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxLineWidth = w * 0.82;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxLineWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const lineHeight = fontSize * 1.42;
  const boxHeight = lines.length * lineHeight + 22;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 140);
  const boxWidth = Math.min(w * 0.9, widest + 40);
  const boxY = position === 'center' ? h * 0.5 - boxHeight / 2 : h * 0.84 - boxHeight / 2;

  // Measured contrast scrim (>= 4.5:1)
  ctx.fillStyle = 'rgba(8, 10, 15, 0.78)';
  drawRoundedRect(ctx, (w - boxWidth) / 2, boxY, boxWidth, boxHeight, 12);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  lines.forEach((line, idx) => {
    const ly = boxY + 11 + lineHeight * (idx + 0.5);
    ctx.fillText(line, w / 2, ly);
  });

  ctx.restore();
}

export function renderVideoFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: RenderFrameOptions
) {
  const {
    scene,
    sceneProgress,
    globalTimeSec,
    mode,
    realism,
    enableSubtitles,
    subtitlePosition,
    isSpeaking,
    loadedImages,
  } = opts;

  ctx.clearRect(0, 0, w, h);

  // Camera Transform
  ctx.save();
  const depthFactor = realism.depth3D / 100;
  let camScale = 1;
  let camX = 0;
  let camY = 0;

  if (scene.cameraMove === 'push_in') {
    camScale = 1 + sceneProgress * 0.08 * (0.5 + depthFactor);
  } else if (scene.cameraMove === 'pan_left') {
    camX = (0.5 - sceneProgress) * 32 * depthFactor;
  } else if (scene.cameraMove === 'pan_right') {
    camX = (sceneProgress - 0.5) * 32 * depthFactor;
  } else if (scene.cameraMove === 'tilt_up') {
    camY = (0.5 - sceneProgress) * 26 * depthFactor;
  }

  // Subtle handheld cinema micro-drift in photoreal mode
  if (mode === 'photoreal') {
    camX += Math.sin(globalTimeSec * 1.9) * 2.2;
    camY += Math.cos(globalTimeSec * 2.3) * 1.6;
  }

  ctx.translate(w / 2 + camX, h / 2 + camY);
  ctx.scale(camScale, camScale);
  ctx.translate(-w / 2, -h / 2);

  const lighting = getLightingColors(scene.lightingMood || realism.lightingPreset);

  drawSceneEnvironment(
    ctx,
    w,
    h,
    scene,
    mode,
    sceneProgress,
    globalTimeSec,
    depthFactor,
    lighting,
    loadedImages
  );

  drawCharacter(
    ctx,
    w,
    h,
    scene.characterType,
    scene.characterAction,
    mode,
    sceneProgress,
    globalTimeSec,
    isSpeaking,
    realism,
    scene.accentColor
  );

  drawAtmosphericFx(ctx, w, h, scene, globalTimeSec, realism);

  ctx.restore();

  applyPostGrading(ctx, w, h, mode, realism.colorLut, realism, globalTimeSec);

  if (enableSubtitles) {
    drawSubtitles(ctx, w, h, scene.subtitle || scene.narration, subtitlePosition, sceneProgress);
  }
}
