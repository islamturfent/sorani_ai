'use client';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

/**
 * App shell that shows the management sidebar on dashboard routes but renders
 * public routes ('/', '/chat') full-width without the sidebar.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname === '/' || pathname.startsWith('/chat');

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
