'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from './LanguageContext';

interface NavItem {
  href: string;
  icon: string;
  ckb: string;
  en: string;
  page:
    | 'dashboard' | 'restaurants' | 'branches' | 'reservations' | 'providers' | 'agent'
    | 'customers' | 'calls' | 'users' | 'tenants' | 'analytics' | 'settings' | 'voice'
    | 'llm' | 'stt' | 'tts' | 'telephony';
  /** Only the real page entries are highlightable; shared-href placeholders are not. */
  primary: boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard', icon: '📊', ckb: 'داشبۆرد', en: 'Dashboard', page: 'dashboard', primary: true },
  { href: '/restaurants', icon: '🍽️', ckb: 'ڕێستۆرانتەکان', en: 'Restaurants', page: 'restaurants', primary: true },
  { href: '/branches', icon: '🏙️', ckb: 'لقەکان', en: 'Branches', page: 'branches', primary: true },
  { href: '/reservations', icon: '📅', ckb: 'حجزەکان', en: 'Reservations', page: 'reservations', primary: true },
  { href: '/customers', icon: '👤', ckb: 'کڕیارەکان', en: 'Customers', page: 'customers', primary: true },
  { href: '/calls', icon: '📞', ckb: 'پەیوەندییەکان', en: 'Calls', page: 'calls', primary: true },
  { href: '/agent', icon: '🤖', ckb: 'ئەیجێنتی AI', en: 'AI Agent', page: 'agent', primary: true },
  { href: '/providers', icon: '🔌', ckb: 'پرۆڤایدەرەکان', en: 'Providers', page: 'providers', primary: true },
  { href: '/voice', icon: '🎙️', ckb: 'دەنگ', en: 'Voice', page: 'voice', primary: true },
  { href: '/llm', icon: '🧠', ckb: 'LLM', en: 'LLM', page: 'llm', primary: true },
  { href: '/stt', icon: '👂', ckb: 'STT', en: 'STT', page: 'stt', primary: true },
  { href: '/tts', icon: '🔊', ckb: 'TTS', en: 'TTS', page: 'tts', primary: true },
  { href: '/telephony', icon: '☎️', ckb: 'تەلەفۆنی', en: 'Telephony', page: 'telephony', primary: true },
  { href: '/users', icon: '🪪', ckb: 'بەکارهێنەران', en: 'Users', page: 'users', primary: true },
  { href: '/tenants', icon: '🏢', ckb: 'تێنانتەکان', en: 'Tenants', page: 'tenants', primary: true },
  { href: '/analytics', icon: '📈', ckb: 'شیکاری', en: 'Analytics', page: 'analytics', primary: true },
  { href: '/settings', icon: '⚙️', ckb: 'ڕێکخستنەکان', en: 'Settings', page: 'settings', primary: true },
];

/** Determine the single "current page" from the pathname. */
function currentPage(pathname: string): NavItem['page'] | null {
  const top = pathname.split('/')[1] || 'dashboard';
  const map: Record<string, NavItem['page']> = {
    dashboard: 'dashboard', restaurants: 'restaurants', branches: 'branches', reservations: 'reservations',
    providers: 'providers', agent: 'agent', customers: 'customers', calls: 'calls', users: 'users',
    tenants: 'tenants', analytics: 'analytics', settings: 'settings', voice: 'voice', llm: 'llm', stt: 'stt', tts: 'tts', telephony: 'telephony',
  };
  return map[top] ?? null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { lang, setLang, dir } = useLanguage();
  const current = currentPage(pathname);

  return (
    <aside className={`w-60 shrink-0 h-screen sticky top-0 bg-slate-900 text-slate-100 flex flex-col ${dir === 'rtl' ? 'text-right' : ''}`} dir={dir}>
      <div className="p-4 border-b border-slate-700">
        <h1 className="font-bold text-lg text-white">Rojin Sorani AI</h1>
        <div className="flex gap-1 mt-3 text-xs">
          <button
            onClick={() => setLang('ckb')}
            className={`px-2 py-1 rounded ${lang === 'ckb' ? 'bg-brand-600 text-white' : 'bg-slate-700'}`}
          >
            کوردی
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-2 py-1 rounded ${lang === 'en' ? 'bg-brand-600 text-white' : 'bg-slate-700'}`}
          >
            EN
          </button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV.map((item) => {
          const active = item.primary && current === item.page;
          return (
            <Link
              key={item.en}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition ${
                active ? 'bg-brand-600 text-white' : 'text-slate-100 hover:bg-slate-700/60'
              }`}
            >
              <span>{item.icon}</span>
              <span>{lang === 'ckb' ? item.ckb : item.en}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-700 text-xs text-slate-400 flex flex-col gap-1">
        <span>{lang === 'ckb' ? 'ئەیجێنت: ڕۆژین · دەنگی مێینەی کوردی سۆرانی' : 'Agent: Rojin · Female Sorani Voice'}</span>
        <Link href="/login" className="text-brand-400 hover:underline">{lang === 'ckb' ? 'چوونەژوورەوە' : 'Login'}</Link>
      </div>
    </aside>
  );
}
