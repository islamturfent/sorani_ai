'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface ProvidersResp {
  llm: { name: string }[]; stt: { name: string }[]; tts: { name: string }[]; telephony: { name: string }[]; reservations: { name: string; enabled: boolean }[];
}

function Section({ title, items, lang }: { title: string; items: { name: string; enabled?: boolean }[]; lang: string }) {
  const enabled = lang === 'ckb' ? 'چالاک' : 'Enabled';
  const disabled = lang === 'ckb' ? 'ناچالاک' : 'Disabled';
  return (
    <Card title={title}>
      <ul className="divide-y">
        {items.map((p) => (
          <li key={p.name} className="flex justify-between py-2 text-sm">
            <span className="font-mono text-xs">{p.name}</span>
            <Badge tone={p.enabled === false ? 'amber' : 'green'}>{p.enabled === false ? disabled : enabled}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function ProvidersPage() {
  const { lang, dir } = useLanguage();
  const [data, setData] = useState<ProvidersResp | null>(null);

  useEffect(() => {
    api<ProvidersResp>('/providers').then((r) => r.ok && r.data && setData(r.data));
  }, []);

  const T = {
    title: lang === 'ckb' ? 'پرۆڤایدەرەکان (تۆماری پلەگین)' : 'Providers (Plugin Registry)',
    desc: lang === 'ckb'
      ? 'هەموو توانایەک لە پشت دەرچەی پرۆڤایدەرە. ئەدەپتەرێکی نوێ تۆمار بکە بۆ گۆڕینی خزمەتگوزار — بەبێ دەستکاری کردنی بنەڕەت.'
      : 'Every capability is behind a provider interface. Register a new adapter to swap vendors — no core changes.',
    loading: lang === 'ckb' ? 'پرۆڤایدەرەکان بار دەکرێن…' : 'Loading providers…',
    telephony: lang === 'ckb' ? 'تەلەفۆنی' : 'Telephony',
    reservations: lang === 'ckb' ? 'حجزەکان' : 'Reservations',
  };

  if (!data) return <Card><p className="text-sm">{T.loading}</p></Card>;

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-6">{T.title}</h1>
      <p className="text-slate-500 text-sm mb-4">{T.desc}</p>
      <div className="grid md:grid-cols-2 gap-6">
        <Section title="LLM" items={data.llm} lang={lang} />
        <Section title="STT" items={data.stt} lang={lang} />
        <Section title="TTS" items={data.tts} lang={lang} />
        <Section title={T.telephony} items={data.telephony} lang={lang} />
        <Section title={T.reservations} items={data.reservations} lang={lang} />
      </div>
    </div>
  );
}
