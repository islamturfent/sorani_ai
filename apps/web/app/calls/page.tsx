'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface Call { id: string; callId: string; type: string; status: string; restaurantId?: string; to?: string; from?: string; }

export default function CallsPage() {
  const { lang, dir } = useLanguage();
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    api<Call[]>('/calls').then((r) => r.ok && r.data && setCalls(r.data));
  }, []);

  const T = {
    title: lang === 'ckb' ? 'پەیوەندییەکان' : 'Calls',
    call: lang === 'ckb' ? 'پەیوەندی' : 'Call',
    type: lang === 'ckb' ? 'جۆر' : 'Type',
    rest: lang === 'ckb' ? 'ڕێستۆرانت' : 'Restaurant',
    status: lang === 'ckb' ? 'دۆخ' : 'Status',
    empty: lang === 'ckb' ? 'پەیوەندی نییە.' : 'No calls.',
  };
  const typeLabel = (t: string) => (lang === 'ckb' ? (t.includes('RESTAURANT') ? 'تەلەفۆن بۆ ڕێستۆرانت' : 'کڕیار') : t.includes('RESTAURANT') ? 'Restaurant phone' : t === 'CUSTOMER' ? 'Customer' : t);

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-6">{T.title}</h1>
      <Card title={T.title}>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-slate-400 text-xs uppercase"><th className="py-2">{T.call}</th><th>{T.type}</th><th>{T.rest}</th><th>{T.status}</th></tr></thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2 font-mono text-xs">{c.callId}</td>
                <td>{typeLabel(c.type)}</td>
                <td>{c.restaurantId || '—'}</td>
                <td><Badge tone={c.status === 'COMPLETED' ? 'green' : 'amber'}>{c.status}</Badge></td>
              </tr>
            ))}
            {calls.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">{T.empty}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
