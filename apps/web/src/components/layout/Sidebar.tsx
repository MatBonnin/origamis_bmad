'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, GraduationCap, FolderOpen, MessageSquare, Calendar } from 'lucide-react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { label: 'Tableau de bord', icon: Home, href: '/dashboard' },
  { label: 'Mentors', icon: GraduationCap, href: '/mentors' },
  { label: 'Projets', icon: FolderOpen, href: '/projets' },
  { label: 'Messages', icon: MessageSquare, href: '/messages' },
  { label: 'Calendrier', icon: Calendar, href: '/calendrier' },
] as const;

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const sidebarClassName = [
    styles.sidebar,
    isOpen ? styles.sidebarOpen : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={onClose}
          aria-hidden="true"
          data-testid="sidebar-overlay"
        />
      )}
      <aside className={sidebarClassName} aria-label="Navigation principale">
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? styles.navItemActive : styles.navItem}
                aria-current={isActive ? 'page' : undefined}
                onClick={onClose}
              >
                <Icon size={24} aria-hidden="true" />
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
