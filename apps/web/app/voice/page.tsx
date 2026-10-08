'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface ProviderResp { active: Record<string, string>; stt: { name: string }[]; tts: { name: string }[] }

export default function VoicePage() {
  const { lang, dir } = useLanguage();
  const [data, setData] = useState<ProviderResp | null>(null);
  const [speakers, setSpeakers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api<ProviderResp>('/providers').then((r) => r.ok && r.data && setData(r.data));
    api<{ id: string; name: string }[]>('/voice/speakers').then((r) => r.ok && r.data && setSpeakers(r.data));
  }, []);

  const T = {
    title: lang === 'ckb' ? 'دەنگ' : 'Voice',
    tts: lang === 'ckb' ? 'دەنگی قسەکردن (TTS)' : 'Text-to-Speech (TTS)',
    stt: lang === 'ckb' ? 'ناسینەوەی قسە (STT)' : 'Speech-to-Text (STT)',
    speakers: lang === 'ckb' ? 'ژمارەی دەنگی مێینەی سۆرانی' : 'Female Sorani voices available',
    agent: lang === 'ckb' ? 'بۆ ئەیجێنت' : 'to the agent',
  };

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-6">{T.title}</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card title={T.tts}>
          <p className="text-sm">kurdishtts · kadın Sorani sesleri</p>
          <div className="mt-2 text-sm text-slate-600">
            {data?.tts.map((p) => <div key={p.name} className="flex justify-between py-1"><span className="font-mono text-xs">{p.name}</span><Badge tone="green">چالاک/Active</Badge></div>)}
          </div>
          <p className="mt-3 text-sm text-slate-500">{T.speakers}: <b>{speakers.length}</b></p>
        </Card>
        <Card title={T.stt}>
          <p className="text-sm">{lang === 'ckb' ? 'Sorani قسە → دەق (kurdishtts)' : 'Sorani speech → text (kurdishtts)'}</p>
          <p className="mt-2 text-xs text-slate-400">{data?.active?.stt}</p>
        </Card>
      </div>
      <div className="mt-4">
        <Link href="/agent" className="text-brand-600 text-sm hover:underline">→ {T.agent} (Rojin)</Link>
      </div>
    </div>
  );
}
