'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface Branch {
  id: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string;
  timezone: string;
  openingHours: { dayOfWeek: number; open: string; close: string; closed?: boolean }[];
}

export default function BranchesPage() {
  const { lang, dir } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api<Branch[]>('/restaurants/branches').then((r) => r.ok && r.data && setBranches(r.data));
  }, []);

  const rows = branches.filter(
    (b) => b.restaurantName.toLowerCase().includes(search.toLowerCase()) || b.name.toLowerCase().includes(search.toLowerCase()) || b.city.toLowerCase().includes(search.toLowerCase()),
  );

  const T = {
    title: lang === 'ckb' ? 'لقەکان' : 'Branches',
    search: lang === 'ckb' ? 'گەڕان…' : 'Search...',
    restaurant: lang === 'ckb' ? 'ڕێستۆرانت' : 'Restaurant',
    branch: lang === 'ckb' ? 'لق' : 'Branch',
    city: lang === 'ckb' ? 'شار' : 'City',
    phone: lang === 'ckb' ? 'تەلەفۆن' : 'Phone',
    hours: lang === 'ckb' ? 'کاتەکان' : 'Hours',
    status: lang === 'ckb' ? 'دۆخ' : 'Status',
    active: lang === 'ckb' ? 'چالاک' : 'Active',
    empty: lang === 'ckb' ? 'هیچ لقێک نییە.' : 'No branches.',
  };

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-6">{T.title}</h1>
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T.search} className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64" />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-slate-400 text-xs uppercase">
              <th className="py-2">{T.restaurant}</th>
              <th>{T.branch}</th>
              <th>{T.city}</th>
              <th>{T.phone}</th>
              <th>{T.hours}</th>
              <th>{T.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const oh = b.openingHours?.find((h) => !h.closed);
              return (
                <tr key={b.id} className="border-b hover:bg-slate-50">
                  <td className="py-3">
                    <Link href={`/restaurants/${b.restaurantId}`} className="font-medium text-slate-700 hover:text-brand-600">{b.restaurantName}</Link>
                  </td>
                  <td>{b.name}</td>
                  <td>{b.city}</td>
                  <td>{b.phone || '—'}</td>
                  <td>{oh ? `${oh.open}–${oh.close}` : '—'}</td>
                  <td><Badge tone="green">{T.active}</Badge></td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">{T.empty}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
