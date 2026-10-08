'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface ProviderResp { active: Record<string, string>; [k: string]: unknown; }

export default function SettingsPage() {
  const { lang, dir } = useLanguage();
  const [prov, setProv] = useState<ProviderResp | null>(null);

  useEffect(() => { api<ProviderResp>('/providers').then((r) => r.ok && r.data && setProv(r.data)); }, []);

  const T = {
    title: lang === 'ckb' ? 'ڕێکخستنەکان' : 'Settings',
    active: lang === 'ckb' ? 'پرۆڤایدەرە چالاکەکان' : 'Active Providers',
    env: lang === 'ckb' ? 'ڕێکخستنەکان بە .env دەگۆڕدرێن' : 'Configuration is controlled via .env',
    llm: 'LLM', stt: 'STT', tts: 'TTS', tel: lang === 'ckb' ? 'تەلەفۆنی' : 'Telephony',
  };
  const active = prov?.active ?? { llm: 'mock', stt: 'mock', tts: 'mock', telephony: 'mock' };

  const row = (label: string, value: string) => (
    <li className="flex justify-between py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <Badge tone="brand">{value}</Badge>
    </li>
  );

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-6">{T.title}</h1>
      <Card title={T.active}>
        <ul className="divide-y">
          {row(T.llm, active.llm)}
          {row(T.stt, active.stt)}
          {row(T.tts, active.tts)}
          {row(T.tel, active.telephony)}
        </ul>
        <p className="text-xs text-slate-400 mt-3">{T.env}</p>
      </Card>
    </div>
  );
}
