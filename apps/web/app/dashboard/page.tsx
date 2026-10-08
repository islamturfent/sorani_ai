'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Card, Button, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface CounterData { totalRestaurants: number; totalReservations: number; confirmedReservations: number; failedReservations: number; totalCalls: number; }
interface AnalyticsResp { counters: CounterData; reservations: { status: string; count: number }[]; }

export default function DashboardPage() {
  const { lang, dir } = useLanguage();
  const [data, setData] = useState<AnalyticsResp | null>(null);

  useEffect(() => {
    api<AnalyticsResp>('/analytics/dashboard').then((r) => r.ok && r.data && setData(r.data));
  }, []);

  const c = data?.counters ?? { totalRestaurants: 7, totalReservations: 0, confirmedReservations: 0, failedReservations: 0, totalCalls: 0 };

  const T = {
    welcome: lang === 'ckb' ? 'بەخێربێیت بۆ سۆرانی' : 'Welcome to Sorani',
    subtitle: lang === 'ckb' ? 'پلاتفۆرمی بانگەوتی فرەڕێستۆرانتەکەی AI ی سۆرانی' : 'Sorani Multi-Restaurant AI Call Center',
    startCall: lang === 'ckb' ? '🎙️ بانگەوتی AI دەستپێبکە' : '🎙️ Start AI Call',
    restaurants: lang === 'ckb' ? 'ڕێستۆرانتەکان' : 'Restaurants',
    reservations: lang === 'ckb' ? 'حجزەکان' : 'Reservations',
    confirmed: lang === 'ckb' ? 'پشتڕاستکراو' : 'Confirmed',
    calls: lang === 'ckb' ? 'پەیوەندییەکان' : 'Calls',
    summary: lang === 'ckb' ? 'پوختەی حجزەکان' : 'Reservation Summary',
    active: lang === 'ckb' ? 'چالاک' : 'Active',
    empty: lang === 'ckb' ? 'هێشتا هیچ حجزێک نییە — لە سیمولەیشنی ئەیجێنت تاقیبکەرەوە.' : 'No reservations yet — try the AI Agent simulation.',
  };

  const stat = (label: string, value: number, icon: string) => (
    <Card className="flex items-center gap-3">
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </Card>
  );

  return (
    <div dir={dir} className={dir === 'rtl' ? 'text-right' : ''}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{T.welcome}</h1>
          <p className="text-slate-500 text-sm">{T.subtitle}</p>
        </div>
        <Link href="/agent"><Button>{T.startCall}</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stat(T.restaurants, c.totalRestaurants, '🍽️')}
        {stat(T.reservations, c.totalReservations, '📅')}
        {stat(T.confirmed, c.confirmedReservations, '✅')}
        {stat(T.calls, c.totalCalls, '📞')}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title={T.restaurants}>
          <ul className="divide-y">
            {['Hewar Restaurant', 'Machu Restaurant', 'Italian House', 'ABC Steakhouse', 'Erbil Garden', 'Family Restaurant', 'Sushi Restaurant'].map((r) => (
              <li key={r} className="flex justify-between py-2 text-sm">
                <span>{r}</span>
                <Badge tone="green">{T.active}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={T.summary}>
          {data?.reservations?.length ? (
            <ul className="divide-y">
              {data.reservations.map((r) => (
                <li key={r.status} className="flex justify-between py-2 text-sm">
                  <span>{r.status}</span>
                  <span className="font-semibold">{r.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{T.empty}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
