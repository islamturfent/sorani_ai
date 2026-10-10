'use client';
import { useEffect, useRef, useState } from 'react';
import { apiPost } from '../lib/api';

interface TurnResp { sessionId: string; reply: string; toolCalls?: { name: string }[]; }

interface Msg { from: 'user' | 'agent'; text: string; }

function resampleTo(src: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return src;
  const ratio = to / from;
  const n = Math.round(src.length * ratio);
  const out = new Float32Array(Math.max(1, n));
  for (let i = 0; i < out.length; i++) {
    const idx = i / ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, src.length - 1);
    const f = idx - i0;
    out[i] = src[i0] * (1 - f) + src[i1] * f;
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

const SUGGESTIONS = [
  { ckb: 'سڵاو، دەمەوێت ڕێستۆرانتێکی ئیتاڵی لە ئێربیل بۆ شەو بگەڕێم.', en: 'Hello, I want an Italian restaurant in Erbil tonight.' },
  { ckb: 'بۆ چوار کەس، سبەی شەو.', en: 'For four people, tomorrow night.' },
  { ckb: 'بەڵێ، حجزەکە تۆمار بکە.', en: 'Yes, create the reservation.' },
];

export default function PublicChat() {
  // Public page is Sorani-only.
  const lang = 'ckb' as const;
  const dir = 'rtl';

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [err, setErr] = useState('');
  const [voiceReply, setVoiceReply] = useState(false);
  const [volume, setVolume] = useState(1);
  const [browserOk, setBrowserOk] = useState<boolean | null>(null);
  const [liveLevel, setLiveLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const vadRafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceRef = useRef<number>(0); // ms of accumulated silence
  const vadCtxRef = useRef<AudioContext | null>(null);
  const autoStopRef = useRef<boolean>(false);
  const vadStartRef = useRef<number>(0); // timestamp when recording began
  const vadLastRef = useRef<number>(0);

  // Backend TTS (Sorani female voice) with browser fallback.
  const playBase64 = (b64: string, format: string) => {
    try {
      const win = window as any;
      win.speechSynthesis?.cancel?.();
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const mime = /mpeg|mp3/i.test(format) ? 'audio/mpeg' : format || 'audio/mpeg';
      const audio = new Audio(URL.createObjectURL(new Blob([bytes], { type: mime })));
      audio.volume = volume;
      audio.play();
    } catch { /* ignore */ }
  };
  const browserSpeak = (text: string) => {
    const w = window as any;
    if (!w.speechSynthesis) return;
    w.speechSynthesis.cancel();
    const u = new w.SpeechSynthesisUtterance(text);
    u.volume = volume;
    u.pitch = 1.05;
    u.lang = /[\u0600-\u06FF]/.test(text) ? 'ar-SA' : 'en-US';
    const voices = w.speechSynthesis.getVoices();
    const v = /[\u0600-\u06FF]/.test(text)
      ? voices.find((x: any) => /^ar/i.test(x.lang) && /female|zira|salma|laila|hoda/i.test(x.name)) || voices.find((x: any) => /^ar/i.test(x.lang))
      : voices.find((x: any) => /^en/i.test(x.lang) && /female|samantha|zira|jenny|aria/i.test(x.name)) || voices.find((x: any) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    w.speechSynthesis.speak(u);
  };
  const speak = async (text: string) => {
    if (!voiceReply) return;
    if (browserOk !== false) {
      try {
        const res = await apiPost<{ format: string; audioBase64: string }>('/voice/tts', { text, language: lang });
        if (res.ok && res.data?.audioBase64) { setBrowserOk(true); playBase64(res.data.audioBase64, res.data.format); return; }
      } catch { /* fall through */ }
      setBrowserOk(false);
    }
    browserSpeak(text);
  };

  // Backend Sorani STT only (no English browser fallback).
  const transcribe = async (b64: string) => {
    setTranscribing(true);
    setErr('');
    try {
      const res = await apiPost<{ text: string }>('/voice/stt', { audioBase64: b64, format: 'wav', language: lang });
      if (res.ok && res.data?.text?.trim()) { setTranscribing(false); send(res.data.text.trim()); return; }
    } catch { /* fall through */ }
    setTranscribing(false);
    setErr('نەتوانرا قسەکەت بناسرێتەوە، تکایە دووبارە هەوڵبدەرەوە.');
  };

  const startListen = () => {
    // Insecure context (non-HTTPS) has NO navigator.mediaDevices at all.
    if (!navigator?.mediaDevices?.getUserMedia) {
      const isHttps = typeof window !== 'undefined' && window.isSecureContext;
      setErr(isHttps
        ? 'مایکڕۆفۆن لەم وێبگەڕەدا نەدۆزرایەوە یان ناچالاکە. تکایە وێبگەڕێکی تر تاقی بکەوە یان بنووسە.'
        : 'ئەم پەڕەیە بە HTTPS نەکراوەتەوە — مایکڕۆفۆن تەنها لەسەر HTTPS کاردەکات. تکایە بە لینکی https بگەڕێوە یان بنووسە.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') { setErr('مایکڕۆفۆن نەدۆزرایەوە'); return; }
    setErr(''); setListening(true);
    // Enumerate devices to detect NotFoundError early (audio input present?).
    navigator.mediaDevices.enumerateDevices().then((devs) => {
      const hasMic = devs.some((d) => d.kind === 'audioinput');
      if (!hasMic) { setListening(false); setErr('هیچ مایکڕۆفۆنێک نەدۆزرایەوە لە سیستەمەکەت. تکایە مایکڕۆفۆنێک بهێنە و بنووسە.'); return; }
    }).catch(() => { /* ignore — getUserMedia will surface the real error */ });
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      streamRef.current = stream;
      const type = (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm');
      const mr = new MediaRecorder(stream, { mimeType: type });
      recChunksRef.current = [];
      mr.ondataavailable = (e: BlobEvent) => { if (e.data?.size) recChunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); streamRef.current = null; void handleChunks(); };
      mr.start();
      mediaRecorderRef.current = mr;
      // Auto-stop: when the speaker pauses ~1.3s, stop and transcribe automatically.
      autoStopRef.current = true;
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!vadCtxRef.current) vadCtxRef.current = new AC();
      try {
        const source = vadCtxRef.current.createMediaStreamSource(stream);
        const analyser = vadCtxRef.current.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.fftSize);
        silenceRef.current = 0;
        vadStartRef.current = performance.now();
        vadLastRef.current = performance.now();
        const GRACE_MS = 1100;    // allow time to start speaking (no auto-stop yet)
        const SILENCE_MS = 1600;  // auto-stop after this much quiet
        const tick = (now: number) => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
          const rms = Math.sqrt(sum / data.length);
          setLiveLevel(Math.min(100, Math.round(rms * 300)));
          const sinceStart = now - vadStartRef.current;
          // During the grace period, only reset silence when there is speech.
          if (rms < 0.012) {
            if (sinceStart > GRACE_MS) {
              silenceRef.current += now - vadLastRef.current;
            }
          } else {
            silenceRef.current = 0;
          }
          vadLastRef.current = now;
          if (autoStopRef.current && sinceStart > GRACE_MS && silenceRef.current > SILENCE_MS) {
            autoStopRef.current = false;
            stopListen();
            return;
          }
          vadRafRef.current = requestAnimationFrame(tick);
        };
        vadRafRef.current = requestAnimationFrame(tick);
      } catch { /* VAD optional */ }
    }).catch((e: any) => {
      setListening(false);
      const name = e?.name || e?.message || String(e);
      console.error('[mic] getUserMedia error:', e);
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError');
      setErr(denied
        ? 'ڕێگەپێدان بە مایکڕۆفۆن نەدرا — تکایە لە هێڵی ناونیشانی وێبگەڕەکەت ڕێگە بدە (Allow) ئینجا دووبارە هەوڵبدەرەوە. یان دەتوانیت بنووسیت.'
        : `مایکڕۆفۆنەکە بەردەست نییە (${name}). تکایە بنووسە یان دووبارە هەوڵبدەرەوە.`);
    });
  };
  const stopListen = () => {
    autoStopRef.current = false;
    if (vadRafRef.current) { cancelAnimationFrame(vadRafRef.current); vadRafRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setListening(false);
    }
  };
  const handleChunks = async () => {
    const chunks = recChunksRef.current;
    recChunksRef.current = [];
    if (!chunks.length) { setListening(false); setErr('نووسین بەردەست نەبوو'); return; }
    setTranscribing(true);
    try {
      const blob = new Blob(chunks, { type: chunks[0].type });
      const buf = await blob.arrayBuffer();
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const audio = await ctx.decodeAudioData(buf);
      const rawSamples = audio.getChannelData(0);
      // Diagnose: is there actually audio? If the clip is (near) silent, tell the
      // user to check the microphone instead of sending empty audio to the STT.
      let sum = 0;
      for (let i = 0; i < rawSamples.length; i++) { const v = rawSamples[i]; sum += v * v; }
      const rms = Math.sqrt(sum / Math.max(1, rawSamples.length));
      const durationS = audio.duration || 0;
      const resampled = resampleTo(rawSamples, audio.sampleRate, 16000);
      await ctx.close();
      if (rms < 0.01 || durationS < 0.3) {
        setListening(false); setTranscribing(false);
        setErr(rms < 0.01
          ? 'مایکڕۆفۆن دەنگ ناگریت — تکایە دڵنیابە لەوەی مایکڕۆفۆن چالاکە و نزیکە، تکایە بە دەنگی بەرز قسە بکە.'
          : 'قسەکەت زۆر کورت بوو، تکایە دووبارە هەوڵبدەرەوە.');
        return;
      }
      const wav = encodeWav(resampled, 16000);
      let bin = ''; const u = new Uint8Array(wav);
      for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000));
      setListening(false);
      console.log('[mic] recorded rms=', rms.toFixed(3), 'dur=', durationS.toFixed(2), 's');
      await transcribe(btoa(bin));
    } catch {
      setListening(false); setTranscribing(false);
      setErr('نەتوانرا قسەکەت بناسرێتەوە، تکایە دووبارە هەوڵبدەرەوە.');
    }
  };

  const send = async (text?: string) => {
    const content = text ?? input;
    if (!content.trim() || busy) return;
    setInput(''); setBusy(true); setErr('');
    const history = [...messages, { from: 'user' as const, text: content }];
    setMessages(history);
    const res = await apiPost<TurnResp>('/simulation/turn', { input: content, language: lang, sessionId, forceLanguage: 'ckb' });
    if (res.ok && res.data) {
      setSessionId(res.data.sessionId);
      setMessages([...history, { from: 'agent', text: res.data.reply }]);
      speak(res.data.reply);
    } else {
      setMessages([...history, { from: 'agent', text: `⚠️ ${res.error?.message ?? 'Error'}` }]);
    }
    setBusy(false);
  };

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col">
      {/* Hero */}
      <header className="text-center pt-12 pb-6 px-4">
        <div className="text-4xl mb-2">🎙️</div>
        <h1 className="text-3xl font-bold text-slate-800">{lang === 'ckb' ? 'ڕۆژین — یاریدەدەری دەنگی AI' : 'Rojin — AI Voice Assistant'}</h1>
        <p className="text-slate-500 mt-2">بە کوردی قسە بکە، یان بنووسە. وەڵام هەمیشە بە کوردی دەبێت.</p>
      </header>

      {/* Chat card */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-8 flex flex-col">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 flex-1 flex flex-col min-h-[24rem]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 text-sm pt-12">
                <p>{lang === 'ckb' ? 'بەخێربێیت! چۆن دەتوانم یارمەتیت بەم؟' : 'Welcome! How can I help you?'}</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => send(lang === 'ckb' ? s.ckb : s.en)} className="text-xs bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1">{lang === 'ckb' ? s.ckb : s.en}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.from === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.from === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{m.text}</div>
              </div>
            ))}
            {busy && <div className="text-left text-slate-400 text-sm">…</div>}
          </div>

          <div className="border-t p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => (listening ? stopListen() : startListen())} className={`shrink-0 rounded-lg px-4 py-2 text-lg ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-brand-600 text-white hover:bg-brand-700'}`} title="Speak">
                {listening ? '⏹' : '🎙️'}
              </button>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={lang === 'ckb' ? 'بە کوردی بنووسە یان قسە بکە…' : 'Type or speak…'} className="flex-1 border rounded-full px-4 py-2 text-sm" />
              <button onClick={() => send()} className="shrink-0 px-4 py-2 rounded-full bg-slate-800 text-white text-sm">{lang === 'ckb' ? 'ناردن' : 'Send'}</button>
            </div>
            {(err && (<div className="text-xs text-red-500 pl-1">{err}</div>))}
            {(listening || transcribing) && (
              <div className="text-xs text-slate-500 pl-1">
                {listening
                  ? (lang === 'ckb' ? '🔴 گوێگرتن… تکایە قسە بکە' : '🔴 Listening…')
                  : (lang === 'ckb' ? 'نووسینی قسە…' : 'Transcribing…')}
              </div>
            )}
            {listening && (
              <div className="flex items-center gap-2 pl-1">
                <span className="text-[10px] text-slate-400 shrink-0">🔊</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${liveLevel}%` }} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-400 pl-1">
              <label className="flex items-center gap-1"><input type="checkbox" checked={voiceReply} onChange={(e) => setVoiceReply(e.target.checked)} className="accent-brand-600" />{lang === 'ckb' ? 'وەڵامی دەنگی' : 'Voice reply'}</label>
              <label className="flex items-center gap-1">🔉<input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 accent-brand-600" /></label>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
