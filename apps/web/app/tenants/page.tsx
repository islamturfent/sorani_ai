'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface Tenant { id: string; name: string; slug: string; status: string; plan?: string; }

export default function TenantsPage() {
  const { lang, dir } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => { api<Tenant[]>('/tenants').then((r) => r.ok && r.data && setTenants(r.data)); }, []);

  const T = {
    title: lang === 'ckb' ? 'تێنانتەکان (فرە-کرێکار)' : 'Tenants (Multi-tenant)',
    name: lang === 'ckb' ? 'ناو' : 'Name',
    slug: lang === 'ckb' ? 'سلەگ' : 'Slug',
    plan: lang === 'ckb' ? 'پلان' : 'Plan',
    status: lang === 'ckb' ? 'دۆخ' : 'Status',
    empty: lang === 'ckb' ? 'تێنانت نییە.' : 'No tenants.',
    note: lang === 'ckb' ? 'هەر تێنانتێک ڕێستۆرانت/ئەیجێنت/پەیوەندی/حجزەکانی خۆی هەیە.' : 'Each tenant owns its restaurants, agents, calls and reservations.',
  };

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-2">{T.title}</h1>
      <p className="text-slate-500 text-sm mb-6">{T.note}</p>
      <Card title={T.title}>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-slate-400 text-xs uppercase"><th className="py-2">{T.name}</th><th>{T.slug}</th><th>{T.plan}</th><th>{T.status}</th></tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-2">{t.name}</td><td className="font-mono text-xs">{t.slug}</td><td>{t.plan || '—'}</td>
                <td><Badge tone={t.status === 'ACTIVE' ? 'green' : 'amber'}>{t.status}</Badge></td>
              </tr>
            ))}
            {tenants.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">{T.empty}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
