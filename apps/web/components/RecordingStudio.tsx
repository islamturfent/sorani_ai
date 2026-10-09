'use client';
import { useEffect, useRef, useState } from 'react';

interface Rec { id: number; text: string; blob: Blob | null; wav: Blob | null; url: string | null; }

// Pre-loaded Sorani sentences for the speaker to read aloud.
const DEFAULT_SENTENCES = [
  'سڵاو، چۆنی بەڕێز؟',
  'بەخێربێیت بۆ ڕێستۆرانتەکەمان.',
  'تکایە ژمارەی کەسەکان بڵێ.',
  'دەتەوێت بۆ کاتژمێر چەند حجز بکەین؟',
  'سبەی شەو بەردەستە بۆ چوار کەس.',
  'ناوی تۆ چییە؟',
  'تکایە ژمارە تەلەفۆنەکەت بەم بدە.',
  'حجزەکە بە سەرکەوتوویی تۆمارکرا.',
  'ئێستا دەتوانم یارمەتیت بدەم.',
  'ئەمڕۆ کاتژمێر نۆی ئێوارە بەردەستە.',
  'دەتەوێت لەسەر تەلەفۆن قسە بکەین؟',
  'زۆر سوپاس بۆ بانگهێشتەکەت.',
  'ڕێستۆرانتەکە لە ناوەندی شارە.',
  'تکایە خۆش بنووسەوە.',
  'دەتوانین ژووری تایبەت بۆ تۆ دابین بکەین.',
  'ئێمە خزمەتگوزاری تایبەت پێشکەش دەکەین.',
  'بەڵێ، بە دڵنیاییەوە.',
  'نەخێر، ئێستا ناتوانم.',
  'چەند خولەک چاوەڕوان بە.',
  'سوپاس بۆ پەیوەندیت لەگەڵمان.',
];

// Very small (16-bit PCM, 22050Hz) WAV encoder from raw samples.
function samplesToWav(samples: Float32Array, sampleRate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

export default function RecordingStudio() {
  const [recs, setRecs] = useState<Rec[]>(() =>
    DEFAULT_SENTENCES.map((text, i) => ({ id: i, text, blob: null, wav: null, url: null })),
  );
  const [active, setActive] = useState<number | null>(null);
  const [useMic, setUseMic] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const ensureMic = async (): Promise<boolean> => {
    if (streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = s;
      return true;
    } catch { return false; }
  };

  const start = async (id: number) => {
    const ok = await ensureMic();
    if (!ok) { alert('مایکڕۆفۆن دەست نەکەوت — تکایە ڕێگە بدە یان براوسەرێکی تر تاقی بکەوە.'); return; }
    setActive(id); chunksRef.current = [];
    const type = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const mr = new MediaRecorder(streamRef.current!, { mimeType: type });
    mr.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    mr.onstop = () => void finalize(id);
    mr.start();
    recRef.current = mr;
  };

  const stop = () => { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); };

  const toWav = async (blob: Blob): Promise<Blob> => {
    const buf = await blob.arrayBuffer();
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    const audio = await ctx.decodeAudioData(buf);
    const target = 22050;
    const ratio = audio.sampleRate / target;
    const src = audio.getChannelData(0);
    const n = Math.round(src.length / ratio);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const idx = i * ratio;
      const i0 = Math.floor(idx), i1 = Math.min(i0 + 1, src.length - 1);
      const f = idx - i0;
      out[i] = src[i0] * (1 - f) + src[i1] * f;
    }
    return samplesToWav(out, target);
  };

  const finalize = async (id: number) => {
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
    let wav: Blob | null = null, url: string | null = null;
    try { wav = await toWav(blob); url = URL.createObjectURL(wav); } catch { /* fallback */ }
    setRecs((rs) => rs.map((r) => (r.id === id ? { ...r, blob, wav, url } : r)));
    setActive(null);
  };

  const downloadOne = (r: Rec) => {
    const audio = r.wav || r.blob;
    if (!audio) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(audio);
    a.download = `sorani_${String(r.id).padStart(3, '0')}.wav`;
    a.click();
    const t = document.createElement('a');
    t.href = URL.createObjectURL(new Blob([r.text], { type: 'text/plain' }));
    t.download = `sorani_${String(r.id).padStart(3, '0')}.txt`;
    t.click();
  };

  const downloadAll = () => {
    recs.forEach(downloadOne);
  };

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col">
      <header className="text-center pt-10 pb-4 px-4">
        <div className="text-4xl mb-2">🎙️</div>
        <h1 className="text-3xl font-bold text-slate-800">ستۆدیۆی تۆمارکردنی دەنگ — کوردی</h1>
        <p className="text-slate-500 mt-2">ڕستەکان بە دەنگی بڵێ و تۆماری بکە. هەر ڕستەیەک بە <b>wav + txt</b> دابەزێنرێت بۆ ڕاهێنانی دەنگ.</p>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-10">
        <div className="bg-white rounded-2xl shadow border p-4 mb-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={useMic} onChange={(e) => setUseMic(e.target.checked)} className="accent-emerald-600" />
              🎤 ئامادەم بۆ تۆمارکردن (مایکڕۆفۆن)
            </label>
            <button onClick={downloadAll} className="px-4 py-2 rounded-full bg-slate-800 text-white text-sm hover:bg-slate-700">
              ⬇️ هەموو تۆمارەکان دابەزێنە
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {useMic
              ? 'دەتوانیت دەست بکەیت — تۆمارکردن لەسەر هەر ڕستەیەک.'
              : 'یەکەم جار «ئامادەم بۆ تۆمارکردن» هەڵبژێرە بۆ چالاککردنی مایکڕۆفۆن.'}
          </p>
        </div>

        <div className="space-y-2">
          {recs.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border p-3 flex items-center justify-between gap-3">
              <button onClick={() => (active === r.id ? stop() : start(r.id))} disabled={!useMic}
                className={`shrink-0 rounded-full w-11 h-11 flex items-center justify-center text-xl ${
                  active === r.id ? 'bg-red-500 text-white animate-pulse' : useMic ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400'
                }`}>
                {active === r.id ? '⏹' : '🎙️'}
              </button>
              <div className="flex-1 text-sm text-slate-700 text-right">{r.text}</div>
              <div className="flex items-center gap-2 shrink-0">
                {r.url && (
                  <audio controls src={r.url} className="h-8 w-28" />
                )}
                {r.wav && (
                  <button onClick={() => downloadOne(r)} className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs hover:bg-emerald-200">
                    ⬇️
                  </button>
                )}
                {active === r.id && <span className="text-xs text-red-500 animate-pulse">🔴</span>}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          💡 بە دەنگی خۆت، بە ئارامی و ڕوون بلێوە. هەر ڕستەیەک بە جیا تۆمار بکە بۆ باشترین ئەنجام.
        </p>
      </main>
    </div>
  );
}
