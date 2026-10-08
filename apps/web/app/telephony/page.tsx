'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface ProviderResp { active: Record<string, string>; [k: string]: unknown }

export default function TelephonyPage() {
  const { lang, dir } = useLanguage();
  const [providers, setProviders] = useState<{ name: string }[]>([]);
  const [active, setActive] = useState('mock');

  useEffect(() => {
    api<ProviderResp>('/providers').then((r) => { if (r.ok && r.data) { setProviders((r.data.telephony as { name: string }[]) || []); setActive(r.data.active?.telephony || 'mock'); } });
  }, []);

  const T = {
    title: lang === 'ckb' ? 'تەلەفۆنی' : 'Telephony',
    note: lang === 'ckb' ? 'SIP/Twilio – بانگەوتی ڕەستەوخۆ بۆ ڕێستۆرانت' : 'SIP/Twilio — direct restaurant calls',
  };

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-2">{T.title}</h1>
      <p className="text-slate-500 text-sm mb-6">{T.note} · Active: <Badge tone="brand">{active}</Badge></p>
      <Card title="Telephony"><ul className="divide-y">{providers.map((p) => <li key={p.name} className="py-2 text-sm font-mono">{p.name}</li>)}</ul></Card>
    </div>
  );
}
