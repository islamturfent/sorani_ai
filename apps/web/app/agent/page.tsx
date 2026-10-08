'use client';
import { useEffect, useRef, useState } from 'react';
import { api, apiPost } from '../../lib/api';
import { Card, Spinner } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface TurnResp { sessionId: string; reply: string; toolCalls?: { name: string; arguments: Record<string, unknown> }[]; endCall?: boolean; }

interface Msg { from: 'user' | 'agent'; text: string; tools?: { name: string; arguments: Record<string, unknown> }[]; }

const SUGGESTIONS = [
  { ckb: 'سڵاو، دەمەوێت لە ئێربیل ڕێستۆرانتێکی ئیتاڵی بۆ شەو بگەڕێم.', en: 'Hello, I want to find an Italian restaurant in Erbil for tonight.' },
  { ckb: 'دەمەوێت بۆ چوار کەس حجز بکەم سبەی شەو.', en: 'I want to book for four people tomorrow night.' },
  { ckb: 'Italian House بۆ کاتژمێر ٧:٣٠.', en: 'Italian House at 7:30.' },
  { ckb: 'بەڵێ، حجزەکە تۆمار بکە.', en: 'Yes, create the reservation.' },
];

export default function AgentPage() {
  const { lang, dir } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceReply, setVoiceReply] = useState(true);
  const [voice, setVoice] = useState<string>('sorani_986');
  const [speakers, setSpeakers] = useState<{ id: string; name: string }[]>([]);
  const [volume, setVolume] = useState(1);

  const recognitionRef = useRef<any>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Load the native Sorani female speakers for the voice picker.
  useEffect(() => {
    api<{ id: string; name: string }[]>('/voice/speakers').then((r) => {
      if (r.ok && r.data) {
        setSpeakers(r.data);
        const saved = window.localStorage.getItem('sorani-voice');
        if (saved && r.data.some((v) => v.id === saved)) setVoice(saved);
      }
    });
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem('sorani-voice', voice); } catch {}
  }, [voice]);

  // Keep an up-to-date list of available TTS voices.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const backendTtsOkRef = useRef<boolean | null>(null);

  // Play base64 audio from the backend (real female Sorani voice).
  const playBase64 = (base64: string, format: string) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const mime = /mpeg|mp3/i.test(format) ? 'audio/mpeg' : format || 'audio/mpeg';
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = volume;
      audio.onended = () => URL.revokeObjectURL(url);
      void audio.play();
    } catch {
      /* ignore playback errors */
    }
  };

  // Browser TTS fallback — female voice in the reply's language.
  const browserSpeak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1.05;
    u.volume = volume;
    u.lang = lang === 'ckb' ? 'ckb-IR' : 'en-US';
    const isArabicScript = /[\u0600-\u06FF]/.test(text);
    const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
    if (isArabicScript) {
      const v =
        voices.find((x) => x.lang && /ckb|ku/i.test(x.lang)) ||
        voices.find((x) => x.lang && /^ar/i.test(x.lang) && /female|zira|salma|laila|maged|hoda/i.test(x.name)) ||
        voices.find((x) => x.lang && /^ar/i.test(x.lang));
      if (v) u.voice = v;
      if (!/^ar/i.test(u.lang)) u.lang = 'ar-SA';
    } else {
      const v =
        voices.find((x) => x.lang && /^en/i.test(x.lang) && /female|woman|samantha|zira|jenny|aria|susan/i.test(x.name)) ||
        voices.find((x) => x.lang && /^en/i.test(x.lang));
      if (v) u.voice = v;
      u.lang = 'en-US';
    }
    window.speechSynthesis.speak(u);
  };

  // Speak a reply: prefer the real backend TTS (ElevenLabs/Azure female Sorani
  // voice); fall back to the browser TTS when no real provider is configured.
  const speak = async (text: string) => {
    if (!voiceReply || typeof window === 'undefined') return;
    if (backendTtsOkRef.current !== false) {
      try {
        const res = await apiPost<{ format: string; audioBase64: string }>('/voice/tts', { text, language: lang, voiceId: voice });
        if (res.ok && res.data?.audioBase64) {
          backendTtsOkRef.current = true;
          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
          playBase64(res.data.audioBase64, res.data.format);
          return;
        }
        backendTtsOkRef.current = false;
      } catch {
        backendTtsOkRef.current = false;
      }
    }
    browserSpeak(text);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const recorderRef = useRef<{
    ctx: AudioContext;
    source: MediaStreamAudioSourceNode;
    processor: ScriptProcessorNode;
    samples: Float32Array[];
  } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  };

  // Encode 16-bit PCM mono WAV from float samples.
  const encodeWav = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); w(36, 'data'); view.setUint32(40, samples.length * 2, true);
    let o = 44;
    for (let i = 0; i < samples.length; i++, o += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const mergeChannels = (chunks: Float32Array[]): Float32Array => {
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Float32Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  };

  // Fallback: browser SpeechRecognition.
  const browserSpeechRec = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert(lang === 'ckb' ? 'وێبگەڕەکەت پشتگیری فەرمانی دەنگی ناکات.' : 'Your browser does not support voice input.');
      return;
    }
    stopSpeaking();
    setListening(true);
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = lang === 'ckb' ? 'ckb-IR' : 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      const last = e.results[e.results.length - 1];
      if (last && last.isFinal) { setListening(false); if (t.trim()) send(t.trim()); }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
  };

  // Start mic: record WAV via Web Audio, then transcribe with the backend
  // Sorani STT (kurdishtts). Falls back to browser recognition if unavailable.
  const startListening = () => {
    if (typeof window === 'undefined') return;
    stopSpeaking();
    if (navigator.mediaDevices?.getUserMedia) {
      setListening(true);
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          const AC = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AC();
          const source = ctx.createMediaStreamSource(stream);
          const samples: Float32Array[] = [];
          const processor = ctx.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => samples.push(new Float32Array(e.inputBuffer.getChannelData(0)));
          source.connect(processor);
          processor.connect(ctx.destination);
          recorderRef.current = { ctx, source, processor, samples };
        })
        .catch(() => { setListening(false); browserSpeechRec(); });
      return;
    }
    browserSpeechRec();
  };

  const stopListening = () => {
    const rec = recorderRef.current;
    const stream = streamRef.current;
    if (rec) {
      try { rec.source.disconnect(); rec.processor.disconnect(); } catch {}
      void rec.ctx.close().catch(() => {});
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
      const merged = mergeChannels(rec.samples);
      const sampleRate = rec.ctx.sampleRate || 16000;
      const wav = encodeWav(merged, sampleRate);
      const b64 = arrayBufferToBase64(wav);
      setListening(false);
      transcribeBackend(b64);
      return;
    }
    recognitionRef.current?.stop?.();
    setListening(false);
  };

  const transcribeBackend = async (b64: string) => {
    try {
      const res = await apiPost<{ text: string }>('/voice/stt', { audioBase64: b64, format: 'wav', language: lang });
      if (res.ok && res.data?.text?.trim()) { send(res.data.text.trim()); return; }
    } catch {}
    browserSpeechRec();
  };

  const toggleMic = () => {
    if (listening) stopListening();
    else startListening();
  };

  const previewVoice = async () => {
    const sample = lang === 'ckb' ? 'سڵاو، ئەمە دەنگی منە، من ڕۆژینم.' : 'Hello, this is my voice. I am Rojin.';
    const res = await apiPost<{ format: string; audioBase64: string }>('/voice/tts', { text: sample, language: lang, voiceId: voice });
    if (res.ok && res.data?.audioBase64) playBase64(res.data.audioBase64, res.data.format);
  };

  const send = async (text?: string) => {
    const content = text ?? input;
    if (!content.trim() || busy) return;
    setInput('');
    setBusy(true);
    const history: Msg[] = [...messages, { from: 'user', text: content }];
    setMessages(history);

    const res = await apiPost<TurnResp>('/simulation/turn', { input: content, language: lang, sessionId });
    if (res.ok && res.data) {
      setSessionId(res.data.sessionId);
      setMessages([...history, { from: 'agent', text: res.data.reply, tools: res.data.toolCalls }]);
      speak(res.data.reply);
    } else {
      setMessages([...history, { from: 'agent', text: `⚠️ ${res.error?.message ?? 'Server error'}` }]);
    }
    setBusy(false);
  };

  const reset = () => {
    stopSpeaking();
    stopListening();
    setMessages([]);
    setSessionId(null);
  };

  const emptyWelcome = lang === 'ckb' ? 'بەخێربێیت! دەتوانم ڕێستوران بۆت بگەڕێم و حجزت بکەم.' : 'Welcome! I can find a restaurant and book it for you.';
  const tryPrompt = lang === 'ckb' ? 'یەکێک لە هەڵبژاردەکانی خوارەوە تاقیبکەرەوە' : 'Try one of the prompts below';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">{lang === 'ckb' ? '🤖 ڕۆژین · ئەیجێنتی AI ی سۆرانی' : '🤖 Rojin · Sorani AI Agent'}</h1>
        <p className="text-slate-500 text-sm">
          {lang === 'ckb'
            ? 'دۆخی سیمولەیشن — بە دەنگ یان نووسین قسە لەگەڵ ڕۆژین بکە.'
            : 'Simulation mode — talk to Rojin by voice or text.'}
        </p>
      </div>

      <Card className="h-[28rem] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-3 p-2" dir={dir}>
          {messages.length === 0 && (
            <div className="text-center text-slate-400 text-sm pt-10">
              <p>{emptyWelcome}</p>
              <p className="text-slate-400 mt-2">{tryPrompt}</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.from === 'user' ? 'text-left' : 'text-right'}>
              <div className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.from === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {m.text}
                {m.tools && m.tools.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs opacity-80">
                    {m.tools.map((t, j) => (
                      <div key={j} className="font-mono bg-black/10 rounded px-2 py-1">
                        ⛏ {t.name}({JSON.stringify(t.arguments)})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <div className="text-right"><Spinner /></div>}
        </div>

        <div className="border-t pt-3 mt-3 flex flex-col gap-2" dir={dir}>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMic}
              title={lang === 'ckb' ? 'قسەکردن بە دەنگ' : 'Speak by voice'}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm transition ${
                listening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {listening ? (lang === 'ckb' ? '🔴 گوێگرتن…' : '🔴 Listening…') : '🎙️'}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={lang === 'ckb' ? 'بە سۆرانی بنووسە یان قسە بکە…' : 'Type or speak in English…'}
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button onClick={() => send()} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">{lang === 'ckb' ? 'ناردن' : 'Send'}</button>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={voiceReply} onChange={(e) => setVoiceReply(e.target.checked)} className="accent-brand-600" />
              {lang === 'ckb' ? 'وەڵامی دەنگی' : 'Voice reply'}
            </label>
            <span className="text-slate-400">
              {lang === 'ckb' ? 'فەرمانی دەنگی پێویستی بە مایکرۆفۆنە' : 'Voice commands need a microphone'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <label className="flex items-center gap-1">
              <span>{lang === 'ckb' ? 'دەنگ' : 'Voice'}</span>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="border rounded px-2 py-1 text-slate-700 max-w-[160px]"
              >
                {speakers.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.id}</option>)}
                {speakers.length === 0 && <option value={voice}>{voice}</option>}
              </select>
            </label>
            <button onClick={previewVoice} className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">▶ {lang === 'ckb' ? 'پێشبینین' : 'Preview'}</button>
            <label className="flex items-center gap-1">
              <span>🔉</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24 accent-brand-600"
              />
              <span>{Math.round(volume * 100)}%</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-1">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(lang === 'ckb' ? s.ckb : s.en)} className="text-xs bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1">{lang === 'ckb' ? s.ckb : s.en}</button>
            ))}
          </div>
          <button className="text-xs text-brand-600 self-start" onClick={reset}>
            ↺ {lang === 'ckb' ? 'دووبارە دەستپێکردنەوە' : 'Reset conversation'}
          </button>
        </div>
      </Card>
    </div>
  );
}
