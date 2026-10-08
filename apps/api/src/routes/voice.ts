import { Router } from 'express';
import type { Request as Req, Response as Res } from 'express';
import { ProviderError, ProviderUnavailableError } from '@sorani/shared';
import type { AppContainer } from '../container';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * POST /api/voice/tts  { text, language? }
 * Synthesizes speech through the configured TTS provider (elevenlabs/azure/...)
 * and returns base64 MP3 so the browser can play a real female Sorani voice.
 */
export function voiceRoutes(c: AppContainer): Router {
  const r = Router();

  // GET /api/voice/speakers — native Sorani female speakers (kurdishtts catalog).
  r.get('/speakers', async (_req, res) => {
    try {
      const resp = await fetch('https://www.kurdishtts.com/api/get-speakers');
      if (!resp.ok) return res.status(502).json({ ok: false, error: { code: 'PROVIDER_ERROR', message: `speakers returned ${resp.status}` } });
      const data = await resp.json();
      const femaleSorani = (data.speakers || []).filter((v: any) => v.dialect === 'sorani' && v.gender === 'female');
      res.json({
        ok: true,
        data: femaleSorani.map((v: any) => ({ id: v.speaker_id || v.id, name: v.name, gender: v.gender, dialect: v.dialect })),
      });
    } catch (err) {
      res.status(502).json({ ok: false, error: { code: 'PROVIDER_ERROR', message: String(err) } });
    }
  });

  // GET /api/voice/voices — list the ElevenLabs account's available voices.
  r.get('/voices', async (_req, res) => {
    const key = c.config.provider.elevenlabsApiKey;
    if (!key) return res.status(400).json({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'No ElevenLabs API key configured' } });
    try {
      const resp = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': key },
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        return res.status(502).json({ ok: false, error: { code: 'PROVIDER_ERROR', message: `elevenlabs returned ${resp.status}: ${body.slice(0, 200)}` } });
      }
      const data = await resp.json();
      const voices = (data.voices || []).map((v: any) => ({
        voiceId: v.voice_id,
        name: v.name,
        category: v.category,
        labels: v.labels || {},
        previewUrl: v.preview_url,
      }));
      res.json({ ok: true, data: voices });
    } catch (err) {
      res.status(502).json({ ok: false, error: { code: 'PROVIDER_ERROR', message: String(err) } });
    }
  });

  r.post(
    '/stt',
    asyncHandler(async (req: Req & { tenantContext?: { tenantId: string } }, res: Res) => {
      const { audioBase64, format = 'wav', language = 'ckb' } = req.body || {};
      if (!audioBase64) return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'audioBase64 is required' } });

      const provider = c.sttRegistry.get(c.config.provider.stt);
      // Real providers only.
      if (provider.name === 'mock' || provider.name === 'openai-whisper') {
        return res.status(400).json({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: `No real STT configured (active: ${provider.name})` } });
      }
      try {
        const data = Uint8Array.from(Buffer.from(String(audioBase64), 'base64'));
        const transcript = await provider.transcribe({ format: String(format), data, language: String(language) });
        res.json({ ok: true, data: transcript });
      } catch (err) {
        if (err instanceof ProviderUnavailableError || err instanceof ProviderError) {
          res.status(502).json({ ok: false, error: { code: err instanceof ProviderUnavailableError ? 'PROVIDER_UNAVAILABLE' : 'PROVIDER_ERROR', message: err.message } });
          return;
        }
        throw err;
      }
    }),
  );

  r.post(
    '/tts',
    asyncHandler(async (req: Req & { tenantContext?: { tenantId: string } }, res: Res) => {
      const { text, language, voiceId } = req.body || {};
      if (!text) return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'text is required' } });

      const provider = c.ttsRegistry.get(c.config.provider.tts);
      const ttsName = provider.name;
      // Real providers only — mock/cloud return placeholder audio that we skip.
      if (ttsName === 'mock' || ttsName === 'cloud') {
        return res.status(400).json({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: `No real TTS configured (active: ${ttsName})` } });
      }

      try {
        const output = await provider.synthesize(String(text), { language: language || 'ckb', gender: 'female', voiceId: String(voiceId || '') });
        const base64 = Buffer.from(output.data).toString('base64');
        res.json({ ok: true, data: { format: output.format, audioBase64: base64, provider: provider.name } });
      } catch (err) {
        if (err instanceof ProviderUnavailableError) {
          res.status(502).json({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: err.message } });
          return;
        }
        if (err instanceof ProviderError) {
          res.status(502).json({ ok: false, error: { code: 'PROVIDER_ERROR', message: err.message } });
          return;
        }
        throw err;
      }
    }),
  );

  return r;
}
