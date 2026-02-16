'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Menu } from 'lucide-react';
import logo from '@/app/assets/logo.png';
import styles from './AppHeader.module.css';

const ROLE_LABELS: Record<string, string> = {
  etudiant: 'Profil Etudiant',
  mentor: 'Profil Mentor',
  admin: 'Administrateur',
  support: 'Support',
};

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { data: session } = useSession();

  const firstName = session?.user?.firstName ?? '';
  const lastName = session?.user?.lastName ?? '';
  const roles = session?.user?.roles ?? [];
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const fullName = `${firstName} ${lastName}`.trim();
  const roleLabel = ROLE_LABELS[roles[0]] ?? roles[0] ?? '';

  return (
    <header className={styles.header}>
      <button
        className={styles.hamburger}
        onClick={onMenuToggle}
        aria-label="Ouvrir le menu de navigation"
        type="button"
      >
        <Menu size={24} />
      </button>

      <div className={styles.logo}>
        <Image src={logo} alt="Orig'AMI" height={40} priority />
      </div>

      {session && (
        <Link href="/profil" className={styles.profileBadge}>
          <div className={styles.avatar} aria-hidden="true">
            {initials}
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{fullName}</span>
            <span className={styles.profileRole}>{roleLabel}</span>
          </div>
        </Link>
      )}
    </header>
  );
}
