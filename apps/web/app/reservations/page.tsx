'use client';
import { useEffect, useState } from 'react';
import { api, apiPost } from '../../lib/api';
import { Card, Button, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface Reservation {
  id: string;
  status: string;
  restaurantId: string;
  date: string;
  time: string;
  guests: number;
  customer?: { name?: string; phone?: string };
  provider?: string;
}

export default function ReservationsPage() {
  const { lang, dir } = useLanguage();
  const [form, setForm] = useState({ restaurantId: '', locationId: '', date: '', time: '19:30', guests: 4, customerName: '', customerPhone: '' });
  const [created, setCreated] = useState('');
  const [createdOk, setCreatedOk] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const T = {
    title: lang === 'ckb' ? 'حجزەکان' : 'Reservations',
    card: lang === 'ckb' ? 'دروستکردنی حجز (API)' : 'Create Reservation (API)',
    restId: lang === 'ckb' ? 'ناسنامەی ڕێستۆرانت' : 'Restaurant ID',
    locId: lang === 'ckb' ? 'ناسنامەی لق' : 'Location ID',
    guests: lang === 'ckb' ? 'ژمارەی کەس' : 'Guests',
    custName: lang === 'ckb' ? 'ناوی کڕیار' : 'Customer Name',
    custPhone: lang === 'ckb' ? 'تەلەفۆنی کڕیار' : 'Customer Phone',
    create: lang === 'ckb' ? 'دروستکردنی حجز' : 'Create Reservation',
    cancel: lang === 'ckb' ? 'هەڵوەشاندنەوە' : 'Cancel',
    status: lang === 'ckb' ? 'دۆخ' : 'Status',
    list: lang === 'ckb' ? 'لیستی حجزەکان' : 'Reservation List',
    empty: lang === 'ckb' ? 'هیچ حجزێک نییە.' : 'No reservations.',
    tip: lang === 'ckb'
      ? 'نوکته: لە ناسنامەی ڕێستۆرانت rest-italian-house یان rest-hewar بەکاربهێنە.'
      : 'Tip: use restaurant ID rest-italian-house or rest-hewar.',
  };

  const load = () => api<Reservation[]>('/reservations').then((r) => r.ok && r.data && setReservations(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const res = await apiPost<{ id: string; status: string }>('/reservations', form);
    setCreatedOk(Boolean(res.ok && res.data));
    setCreated(res.ok && res.data ? `${T.status}: ${res.data.status} (${res.data.id})` : `❌ ${res.error?.message}`);
    if (res.ok) { setForm({ ...form, restaurantId: '', customerName: '', customerPhone: '' }); load(); }
  };

  const cancelRes = async (id: string) => {
    await api(`/reservations/${id}`, { method: 'DELETE', body: JSON.stringify({ reason: 'user' }) });
    load();
  };

  const statusTone = (s: string) => (s === 'CONFIRMED' ? 'green' : s === 'CANCELLED' ? 'red' : 'amber') as 'green' | 'red' | 'amber';

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-6">{T.title}</h1>
      <Card title={T.card} className="max-w-xl mb-6">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <input placeholder={T.restId} value={form.restaurantId} onChange={(e) => setForm({ ...form, restaurantId: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input placeholder={T.locId} value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input type="number" min={1} placeholder={T.guests} value={form.guests} onChange={(e) => setForm({ ...form, guests: +e.target.value })} className="border rounded-lg px-3 py-2" />
          <input placeholder={T.custName} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input placeholder={T.custPhone} value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2" />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={submit}>{T.create}</Button>
          {created && <Badge tone={createdOk ? 'green' : 'red'}>{created}</Badge>}
        </div>
        <p className="text-xs text-slate-400 mt-3">{T.tip}</p>
      </Card>

      <Card title={T.list}>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-slate-400 text-xs uppercase"><th className="py-2">{T.restId}</th><th>{T.status}</th><th>{lang === 'ckb' ? 'ڕێکەوت/کات' : 'Date/Time'}</th><th>{T.guests}</th><th>{T.custName}</th><th /></tr></thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 font-mono text-xs">{r.restaurantId}</td>
                <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                <td>{r.date} {r.time}</td>
                <td>{r.guests}</td>
                <td>{r.customer?.name || r.customer?.phone || '—'}</td>
                <td>{r.status !== 'CANCELLED' && <Button variant="ghost" onClick={() => cancelRes(r.id)}>{T.cancel}</Button>}</td>
              </tr>
            ))}
            {reservations.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">{T.empty}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
