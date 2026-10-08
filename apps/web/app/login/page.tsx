'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '../../lib/api';
import { Card, Button, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

export default function LoginPage() {
  const { lang, dir } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [loggedIn, setLoggedIn] = useState('');

  useEffect(() => { setLoggedIn(window.localStorage.getItem('sorani-user') || ''); }, []);

  const T = {
    title: lang === 'ckb' ? 'چوونەژوورەوە' : 'Login',
    email: lang === 'ckb' ? 'ئیمەیل' : 'Email',
    login: lang === 'ckb' ? 'چوونەژوورەوە' : 'Sign in',
    users: lang === 'ckb' ? 'دەمو کڕیارەکان' : 'Demo users',
    welcome: lang === 'ckb' ? 'بەخێربێیت' : 'Welcome',
    back: lang === 'ckb' ? 'گەڕانەوە بۆ داشبۆرد' : 'Go to dashboard',
  };

  const submit = async () => {
    const res = await apiPost<{ token: string; role: string; name?: string }>('/auth/login', { email });
    if (res.ok && res.data) {
      window.localStorage.setItem('sorani-token', res.data.token);
      window.localStorage.setItem('sorani-user', `${res.data.name || email} (${res.data.role})`);
      setMsg('');
      setOk(true);
      setLoggedIn(`${res.data.name || email} (${res.data.role})`);
    } else {
      setMsg(res.error?.message || 'Error');
      setOk(false);
    }
  };

  const demo = ['admin@sorani.ai', 'erbil@sorani.ai', 'agent@sorani.ai'];

  return (
    <div dir={dir} className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">{T.title}</h1>
      {loggedIn ? (
        <Card>
          <p className="text-sm">{T.welcome}, <b>{loggedIn}</b></p>
          <div className="mt-3"><Button onClick={() => router.push('/dashboard')}>{T.back}</Button></div>
        </Card>
      ) : (
        <Card>
          <input placeholder={T.email} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3" />
          <Button onClick={submit}>{T.login}</Button>
          {msg && <div className="mt-3"><Badge tone="red">{msg}</Badge></div>}
          <p className="text-xs text-slate-500 mt-4">{T.users}:</p>
          <div className="flex flex-col gap-1 mt-1">
            {demo.map((e) => <button key={e} onClick={() => setEmail(e)} className="text-xs text-brand-600 hover:underline text-left">{e}</button>)}
          </div>
        </Card>
      )}
    </div>
  );
}
