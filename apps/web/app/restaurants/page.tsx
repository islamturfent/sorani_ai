'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiPost } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface RestaurantRow { id: string; name: string; description?: string; cuisineTypes: string[]; city?: string; priceRange?: string; rating?: number; provider?: string; }

export default function RestaurantsPage() {
  const { lang, dir } = useLanguage();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', city: 'Erbil', cuisine: '', phone: '', priceRange: '$$' });
  const [msg, setMsg] = useState('');

  const load = () => api<RestaurantRow[]>('/restaurants').then((r) => r.ok && r.data && setRestaurants(r.data));
  useEffect(() => { load(); }, []);

  const submitAdd = async () => {
    if (!form.name.trim()) return;
    const res = await apiPost<RestaurantRow>('/restaurants', form);
    setMsg(res.ok ? (lang === 'ckb' ? '✅ زیادکرا' : '✅ Added') : `❌ ${res.error?.message}`);
    if (res.ok) {
      setForm({ name: '', city: 'Erbil', cuisine: '', phone: '', priceRange: '$$' });
      setShowAdd(false);
      load();
    }
  };

  const rows = restaurants.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const T = {
    title: lang === 'ckb' ? 'ڕێستۆرانتەکان' : 'Restaurants',
    add: lang === 'ckb' ? '+ زیادکردنی ڕێستۆرانت' : '+ Add Restaurant',
    name: lang === 'ckb' ? 'ناو' : 'Name',
    phone: lang === 'ckb' ? 'تەلەفۆن' : 'Phone',
    search: lang === 'ckb' ? 'گەڕان…' : 'Search...',
    rest: lang === 'ckb' ? 'ڕێستۆرانت' : 'Restaurant',
    city: lang === 'ckb' ? 'شار' : 'City',
    cuisine: lang === 'ckb' ? 'چێشت' : 'Cuisine',
    provider: lang === 'ckb' ? 'پرۆڤایدەر' : 'Provider',
    status: lang === 'ckb' ? 'دۆخ' : 'Status',
    active: lang === 'ckb' ? 'چالاک' : 'Active',
    empty: lang === 'ckb' ? 'هیچ ڕێستۆرانتێک نییە — سێرڤەری API بەرزوبکەرەوە.' : 'No restaurants. Start the API server and reload.',
  };

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{T.title}</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">{T.add}</button>
      </div>

      {showAdd && (
        <Card className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <input placeholder={T.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2" />
            <input placeholder={T.city} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border rounded-lg px-3 py-2" />
            <input placeholder={T.cuisine} value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} className="border rounded-lg px-3 py-2" />
            <input placeholder={T.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2" />
            <select value={form.priceRange} onChange={(e) => setForm({ ...form, priceRange: e.target.value })} className="border rounded-lg px-3 py-2">
              {['$', '$$', '$$$', '$$$$'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={submitAdd} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">{T.add}</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">{lang === 'ckb' ? 'پاشگەڕ' : 'Cancel'}</button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={T.search}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64"
          />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-slate-400 text-xs uppercase">
              <th className="py-2">{T.rest}</th>
              <th>{T.city}</th>
              <th>{T.cuisine}</th>
              <th>{T.provider}</th>
              <th>{T.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b hover:bg-slate-50">
                <td className="py-3">
                  <Link href={`/restaurants/${r.id}`} className="font-medium text-slate-700 hover:text-brand-600">{r.name}</Link>
                </td>
                <td>{r.city}</td>
                <td>{r.cuisineTypes.join(', ')}</td>
                <td><Badge tone="brand">{r.provider || '—'}</Badge></td>
                <td><Badge tone="green">{T.active}</Badge></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">{T.empty}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
