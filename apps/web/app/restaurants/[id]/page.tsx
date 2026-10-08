'use client';
import { useEffect, useState } from 'react';
import { api, apiPost } from '../../../lib/api';
import { Card, Badge, Button } from '../../../components/ui';
import { useLanguage } from '../../../components/LanguageContext';

interface Restaurant {
  id: string; name: string; description?: string; cuisineTypes: string[]; priceRange?: string;
  rating?: number; features: string[]; phoneNumbers: string[];
  locations: { id: string; name: string; address: string; city: string; timezone: string; phone?: string }[];
}

export default function RestaurantDetail({ params }: { params: { id: string } }) {
  const { lang, dir } = useLanguage();
  const [r, setR] = useState<Restaurant | null>(null);
  const [booking, setBooking] = useState({ date: '', time: '19:30', guests: 4, locationId: '' });
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    api<Restaurant>(`/restaurants/${params.id}`).then((x) => x.ok && x.data && setR(x.data));
  }, [params.id]);

  const T = {
    loading: lang === 'ckb' ? 'ڕێستۆرانت بار دەکرێت…' : 'Loading restaurant…',
    general: lang === 'ckb' ? 'گشتی' : 'General',
    branches: lang === 'ckb' ? 'لقەکان' : 'Branches',
    avail: lang === 'ckb' ? 'پشکنینی بەردەستبوون' : 'Availability Check',
    cuisine: lang === 'ckb' ? 'چێشت' : 'Cuisine',
    price: lang === 'ckb' ? 'نرخ' : 'Price',
    rating: lang === 'ckb' ? 'هەڵسەنگاندن' : 'Rating',
    features: lang === 'ckb' ? 'تایبەتمەندییەکان' : 'Features',
    phone: lang === 'ckb' ? 'تەلەفۆن' : 'Phone',
    selectBranch: lang === 'ckb' ? 'لق هەڵبژێرە' : 'Select branch',
    check: lang === 'ckb' ? 'پشکنین' : 'Check',
    available: lang === 'ckb' ? '✅ بەردەستە' : '✅ Available',
    notAvailable: lang === 'ckb' ? '❌ بەردەست نییە' : '❌ Not available',
    error: lang === 'ckb' ? 'هەڵە' : 'Error',
  };

  const checkAvailability = async () => {
    const res = await apiPost<{ available: boolean; message?: string }>(`/restaurants/${params.id}/availability`, booking);
    setResult(res.ok && res.data ? (res.data.available ? T.available : T.notAvailable) : `${T.error}: ${res.error?.message}`);
  };

  if (!r) return <Card><p className="text-sm">{T.loading}</p></Card>;

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-1">{r.name}</h1>
      <p className="text-slate-500 text-sm mb-4">{r.description}</p>

      <div className="grid md:grid-cols-3 gap-6">
        <Card title={T.general}>
          <div className="space-y-1 text-sm">
            <p><b>{T.cuisine}:</b> {r.cuisineTypes.join(', ')}</p>
            <p><b>{T.price}:</b> {r.priceRange || '—'}</p>
            <p><b>{T.rating}:</b> {r.rating ?? '—'} ⭐</p>
            <p><b>{T.features}:</b></p>
            <div className="flex flex-wrap gap-1">{r.features.map((f) => <Badge key={f}>{f}</Badge>)}</div>
            <p className="pt-2"><b>{T.phone}:</b> {r.phoneNumbers.join(', ')}</p>
          </div>
        </Card>

        <Card title={T.branches}>
          <ul className="space-y-3">
            {r.locations.map((l) => (
              <li key={l.id} className="border rounded-lg p-2 text-sm">
                <div className="font-medium">{l.name}</div>
                <div className="text-slate-500">{l.address} · {l.city}</div>
                <div className="text-slate-400 text-xs">{l.timezone} {l.phone && `· ${l.phone}`}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={T.avail}>
          <div className="space-y-2 text-sm">
            <select value={booking.locationId} onChange={(e) => setBooking({ ...booking, locationId: e.target.value })} className="w-full border rounded-lg px-2 py-2">
              <option value="">{T.selectBranch}</option>
              {r.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input type="date" value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value })} className="w-full border rounded-lg px-2 py-2" />
            <div className="flex gap-2">
              <input type="time" value={booking.time} onChange={(e) => setBooking({ ...booking, time: e.target.value })} className="w-full border rounded-lg px-2 py-2" />
              <input type="number" min={1} value={booking.guests} onChange={(e) => setBooking({ ...booking, guests: +e.target.value })} className="w-20 border rounded-lg px-2 py-2" />
            </div>
            <Button onClick={checkAvailability}>{T.check}</Button>
            {result && <p className="text-sm font-medium pt-1">{result}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
