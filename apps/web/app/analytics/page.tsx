'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface AnalyticsResp {
  counters: { totalRestaurants: number; totalReservations: number; confirmedReservations: number; failedReservations: number; totalCalls: number };
  reservations: { status: string; count: number }[];
}

export default function AnalyticsPage() {
  const { lang, dir } = useLanguage();
  const [data, setData] = useState<AnalyticsResp | null>(null);

  useEffect(() => { api<AnalyticsResp>('/analytics/dashboard').then((r) => r.ok && r.data && setData(r.data)); }, []);

  const T = {
    title: lang === 'ckb' ? 'شیکاری' : 'Analytics',
    restaurants: lang === 'ckb' ? 'ڕێستۆرانتەکان' : 'Restaurants',
    reservations: lang === 'ckb' ? 'حجزەکان' : 'Reservations',
    confirmed: lang === 'ckb' ? 'پشتڕاستکراو' : 'Confirmed',
    failed: lang === 'ckb' ? 'شکست' : 'Failed',
    calls: lang === 'ckb' ? 'پەیوەندییەکان' : 'Calls',
  };
  const c = data?.counters ?? { totalRestaurants: 7, totalReservations: 0, confirmedReservations: 0, failedReservations: 0, totalCalls: 0 };

  const stat = (label: string, value: number) => (
    <Card className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </Card>
  );

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-6">{T.title}</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stat(T.restaurants, c.totalRestaurants)}
        {stat(T.reservations, c.totalReservations)}
        {stat(T.confirmed, c.confirmedReservations)}
        {stat(T.failed, c.failedReservations)}
        {stat(T.calls, c.totalCalls)}
      </div>
    </div>
  );
}
