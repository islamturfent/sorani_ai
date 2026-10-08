'use client';
import { useEffect, useState } from 'react';
import { api, apiPost } from '../../lib/api';
import { Card, Button } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface Customer { id: string; name?: string; phone?: string; email?: string; preferredLanguage?: string; createdAt: string; }

export default function CustomersPage() {
  const { lang, dir } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  const T = {
    title: lang === 'ckb' ? 'کڕیارەکان' : 'Customers',
    add: lang === 'ckb' ? 'زیادکردنی کڕیار' : 'Add Customer',
    name: lang === 'ckb' ? 'ناو' : 'Name',
    phone: lang === 'ckb' ? 'تەلەفۆن' : 'Phone',
    email: lang === 'ckb' ? 'ئیمەیل' : 'Email',
    lang: lang === 'ckb' ? 'زمان' : 'Language',
    empty: lang === 'ckb' ? 'هیچ کڕیارێک نییە.' : 'No customers.',
  };

  const load = () => api<Customer[]>('/customers').then((r) => r.ok && r.data && setCustomers(r.data));

  useEffect(() => { load(); }, []);

  const submit = async () => {
    const res = await apiPost<Customer>('/customers', form);
    if (res.ok) { setForm({ name: '', phone: '', email: '' }); load(); }
  };

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-6">{T.title}</h1>
      <Card title={T.add} className="max-w-xl mb-6">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <input placeholder={T.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input placeholder={T.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input placeholder={T.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2" />
        </div>
        <div className="mt-3"><Button onClick={submit}>{T.add}</Button></div>
      </Card>
      <Card title={T.title}>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-slate-400 text-xs uppercase"><th className="py-2">{T.name}</th><th>{T.phone}</th><th>{T.email}</th><th>{T.lang}</th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2">{c.name || '—'}</td><td>{c.phone || '—'}</td><td>{c.email || '—'}</td>
                <td>{c.preferredLanguage || 'ckb'}</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">{T.empty}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
