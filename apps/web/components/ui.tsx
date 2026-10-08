export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${className}`}>
      {title && <h2 className="font-semibold text-slate-700 mb-3">{title}</h2>}
      {children}
    </div>
  );
}

export function Button({ children, onClick, variant = 'primary', className = '' }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
}) {
  const base =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : variant === 'outline'
        ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
        : 'text-brand-600 hover:bg-brand-50';
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${base} ${className}`}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'green' | 'amber' | 'red' | 'slate' | 'brand' }) {
  const map: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    brand: 'bg-indigo-100 text-indigo-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[tone]}`}>{children}</span>;
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />;
}
