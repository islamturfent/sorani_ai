'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { useLanguage } from '../../components/LanguageContext';

interface User { id: string; email: string; name?: string; role: string; }

export default function UsersPage() {
  const { lang, dir } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => { api<User[]>('/users').then((r) => r.ok && r.data && setUsers(r.data)); }, []);

  const T = {
    title: lang === 'ckb' ? 'بەکارهێنەران' : 'Users',
    name: lang === 'ckb' ? 'ناو' : 'Name',
    email: lang === 'ckb' ? 'ئیمەیل' : 'Email',
    role: lang === 'ckb' ? 'دۆر' : 'Role',
    empty: lang === 'ckb' ? 'هیچ بەکارهێنەرێک نییە.' : 'No users.',
  };

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-bold mb-6">{T.title}</h1>
      <Card title={T.title}>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-slate-400 text-xs uppercase"><th className="py-2">{T.name}</th><th>{T.email}</th><th>{T.role}</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2">{u.name || '—'}</td><td>{u.email}</td>
                <td><Badge tone="brand">{u.role}</Badge></td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-400">{T.empty}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
