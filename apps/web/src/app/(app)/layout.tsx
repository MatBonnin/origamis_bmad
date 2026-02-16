'use client';

import { useState, useCallback } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Sidebar, AppHeader } from '@/components/layout';
import styles from './layout.module.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <SessionProvider>
      <div className={styles.wrapper}>
        <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />
        <AppHeader onMenuToggle={handleMenuToggle} />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
