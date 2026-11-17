import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractApiError(err: unknown): { status: number; message: string } {
  const fallbackMsg = err instanceof Error ? err.message : String(err);
  const statusMatch = fallbackMsg.match(/\b(400|401|403|404|429|500|503)\b/);
  const status = statusMatch ? Number(statusMatch[1]) : 500;
  return { status, message: fallbackMsg };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post('/api/storyboard', async (req, res) => {
    try {
      const {
        idea,
        mode = '3d',
        aspectRatio = '9:16',
        durationTarget = 20,
        language = 'km',
        realismSettings,
      } = req.body ?? {};

      if (!idea || typeof idea !== 'string' || !idea.trim()) {
        res.status(400).json({ error: 'សូមបញ្ចូលគំនិតសម្រាប់បង្កើតវីដេអូជាមុនសិន។' });
        return;
      }

      const ai = getGeminiClient();
      const sceneCount = durationTarget >= 28 ? 6 : durationTarget >= 18 ? 5 : 4;
      const perSceneDuration = Number((durationTarget / sceneCount).toFixed(1));

      const styleDirective =
        mode === 'cartoon'
          ? '2D Cel-Shaded Cartoon Animation style with expressive animated characters, vibrant colors, and playful motion.'
          : mode === '3d'
            ? `3D Volumetric Animated Film style (depth ${realismSettings?.depth3D ?? 80}%, dynamic 3D camera orbit, rim lighting).`
            : `Hyper-Realistic Live-Action Human Cinema style (skin & surface realism ${realismSettings?.skinAndSurfaceRealism ?? 90}%, 35mm Leica shallow depth of field, natural human presenters/actors, photorealistic lighting).`;

      const languageDirective =
        language === 'km'
          ? 'Write projectTitle, scene titles, narration, and concise subtitles in natural, fluent Khmer (ភាសាខ្មែរ). Keep settingDescription in vivid English.'
          : 'Write projectTitle, scene titles, narration, subtitles, and settingDescription in natural, vivid English.';

      const prompt = [
        `Transform this user video idea into a cohesive ${sceneCount}-scene video production storyboard.`,
        `User Idea: "${idea.trim()}"`,
        `Target Visual Style: ${styleDirective}`,
        `Aspect Ratio: ${aspectRatio}`,
        `Each scene duration should be around ${perSceneDuration} seconds.`,
        languageDirective,
        `Pick realistic hex colors (primaryColor, secondaryColor, accentColor) that fit the mood and scene.`,
        `For photorealistic mode, prefer characterType "human_realistic" or "presenter_human".`,
        `For 3D mode, prefer "hero_3d" or "robot_3d" or "human_realistic".`,
        `For cartoon mode, prefer "cartoon_kid" or "cartoon_animal".`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an award-winning film director and animation storyboard architect fluent in Khmer and English. You convert short user ideas into structured, emotionally engaging video storyboards.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              projectTitle: {
                type: Type.STRING,
                description: 'Short engaging title for the produced video.',
              },
              enhancedDirectorPrompt: {
                type: Type.STRING,
                description: 'Concise directorial summary describing visual style, camera pacing, and tone.',
              },
              musicMood: {
                type: Type.STRING,
                description: 'One of: uplifting, cinematic, playful, calm, dramatic',
              },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    narration: {
                      type: Type.STRING,
                      description: 'Spoken voiceover line for this scene (1-2 short sentences).',
                    },
                    subtitle: {
                      type: Type.STRING,
                      description: 'Concise on-screen caption (max 12 words).',
                    },
                    visualCue: {
                      type: Type.STRING,
                      description:
                        'Strictly one of: temple_sunrise, modern_city, studio_portrait, forest_adventure, ocean_coast, cyber_lab, cozy_home, mountain_peak',
                    },
                    settingDescription: {
                      type: Type.STRING,
                      description: 'Vivid visual description of the shot composition and environment.',
                    },
                    characterType: {
                      type: Type.STRING,
                      description:
                        'Strictly one of: human_realistic, hero_3d, cartoon_kid, cartoon_animal, robot_3d, presenter_human, none',
                    },
                    characterAction: {
                      type: Type.STRING,
                      description: 'Strictly one of: walk, talk, wave, run, fly, present, look_around',
                    },
                    cameraMove: {
                      type: Type.STRING,
                      description:
                        'Strictly one of: push_in, pan_left, pan_right, orbit_3d, tilt_up, static_cinematic',
                    },
                    lightingMood: {
                      type: Type.STRING,
                      description:
                        'Strictly one of: golden_hour, studio_key, neon_dusk, soft_daylight, dramatic_rim, pastel_morning',
                    },
                    primaryColor: { type: Type.STRING },
                    secondaryColor: { type: Type.STRING },
                    accentColor: { type: Type.STRING },
                    durationSec: { type: Type.NUMBER },
                    fxParticles: {
                      type: Type.STRING,
                      description: 'Strictly one of: sunbeams, fireflies, rain, confetti, bokeh, none',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err) {
      const { status, message } = extractApiError(err);
      console.error('[Storyboard API Error]', message);
      res.status(status).json({
        error: message,
      });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voiceName = 'Kore', style = 'Warm, expressive video narrator' } = req.body ?? {};
      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Text is required for speech generation.' });
        return;
      }

      const ai = getGeminiClient();
      const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
      const chosenVoice = allowedVoices.includes(voiceName) ? voiceName : 'Kore';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      const base64Audio = part?.inlineData?.data;
      const mimeType = part?.inlineData?.mimeType ?? 'audio/wav';

      if (!base64Audio) {
        res.status(502).json({ error: 'No audio data returned from speech model.' });
        return;
      }

      res.json({
        audioDataUrl: `data:${mimeType};base64,${base64Audio}`,
        mimeType,
      });
    } catch (err) {
      const { status, message } = extractApiError(err);
      console.error('[TTS API Error]', message);
      res.status(status).json({
        error: message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KinoKhmer AI Video Studio listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
