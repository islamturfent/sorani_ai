'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface ProviderResp { active: Record<string, string>; [k: string]: unknown }

export default function LLMPage() {
  const { lang, dir } = useLanguage();
  const [providers, setProviders] = useState<{ name: string }[]>([]);
  const [active, setActive] = useState('mock');

  useEffect(() => {
    api<ProviderResp>('/providers').then((r) => { if (r.ok && r.data) { setProviders((r.data.llm as { name: string }[]) || []); setActive(r.data.active?.llm || 'mock'); } });
  }, []);

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-2">LLM</h1>
      <p className="text-slate-500 text-sm mb-6">LLM Providers · Active: <Badge tone="brand">{active}</Badge></p>
      <Card title="LLM"><ul className="divide-y">{providers.map((p) => <li key={p.name} className="py-2 text-sm font-mono">{p.name}</li>)}</ul></Card>
    </div>
  );
}
