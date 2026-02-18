import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface BookingItem {
  bookingId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  student: { id: string; firstName: string; lastName: string };
  mentor: { id: string; firstName: string; lastName: string };
}

interface ConversationItem {
  conversationId: string;
  peer: { userId: string; fullName: string; role: string };
  lastMessage: { body: string; createdAt: string } | null;
  unreadCount: number;
  lastMessageAt: string;
}

interface ProgramItem {
  programId: string;
  title: string;
  status: string;
  milestones: Array<{ status: string }>;
}

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return json.data ?? null;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string): { day: string; month: string } {
  const d = new Date(dateStr);
  return {
    day: d.getDate().toString().padStart(2, '0'),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }),
  };
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/connexion');

  const { accessToken, user } = session;
  const isMentor = user.roles.includes('mentor');
  const isAdmin = user.roles.includes('admin');
  const isSupport = user.roles.includes('support');

  const [bookingsData, conversationsData, programsData] = await Promise.all([
    fetchJson<{ bookings: BookingItem[] }>(
      `${API_URL}/bookings?status=confirmed`,
      accessToken,
    ),
    fetchJson<{ conversations: ConversationItem[] }>(
      `${API_URL}/messaging/conversations`,
      accessToken,
    ),
    isMentor
      ? fetchJson<{ programs: ProgramItem[] }>(
          `${API_URL}/mentor/programs`,
          accessToken,
        )
      : Promise.resolve(null),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingBookings = (bookingsData?.bookings ?? [])
    .filter((b) => new Date(b.bookingDate) >= today)
    .slice(0, 3);

  const recentConversations = (conversationsData?.conversations ?? []).slice(
    0,
    3,
  );
  const totalUnread = (conversationsData?.conversations ?? []).reduce(
    (sum, c) => sum + c.unreadCount,
    0,
  );

  const activePrograms = (programsData?.programs ?? [])
    .filter((p) => p.status === 'active')
    .slice(0, 4);

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Bonjour, {user.firstName} !</h1>
          <p className={styles.subtitle}>Voici un résumé de votre activité.</p>
        </div>

        {/* Grille 3 sections */}
        <div className={styles.grid}>
          {/* Section 1 : Rendez-vous à venir */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Rendez-vous à venir</h2>
              <Link href="/bookings" className={styles.seeAll}>
                Tout voir
              </Link>
            </div>
            {upcomingBookings.length === 0 ? (
              <p className={styles.empty}>Aucun rendez-vous prévu.</p>
            ) : (
              <ul className={styles.itemList}>
                {upcomingBookings.map((b) => {
                  const { day, month } = formatDate(b.bookingDate);
                  const peer = isMentor
                    ? `${b.student.firstName} ${b.student.lastName}`
                    : `${b.mentor.firstName} ${b.mentor.lastName}`;
                  return (
                    <li key={b.bookingId} className={styles.bookingItem}>
                      <div className={styles.bookingDate}>
                        <span className={styles.bookingDay}>{day}</span>
                        <span className={styles.bookingMonth}>{month}</span>
                      </div>
                      <div className={styles.bookingInfo}>
                        <span className={styles.bookingTime}>
                          {b.startTime} – {b.endTime}
                        </span>
                        <span className={styles.bookingPeer}>{peer}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/mentors" className={styles.cardAction}>
              + Réserver un créneau
            </Link>
          </section>

          {/* Section 2 : Programmes (mentor) ou CTA découverte (étudiant) */}
          {isMentor ? (
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Programmes en cours</h2>
                <Link href="/mentor/programs" className={styles.seeAll}>
                  Tout voir
                </Link>
              </div>
              {activePrograms.length === 0 ? (
                <p className={styles.empty}>Aucun programme actif.</p>
              ) : (
                <ul className={styles.itemList}>
                  {activePrograms.map((p) => {
                    const done = p.milestones.filter(
                      (m) => m.status === 'done',
                    ).length;
                    const total = p.milestones.length;
                    const pct =
                      total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <li key={p.programId} className={styles.programItem}>
                        <div className={styles.programInfo}>
                          <span className={styles.programTitle}>{p.title}</span>
                          <span className={styles.programMeta}>
                            {done}/{total} jalons
                          </span>
                        </div>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : (
            <section className={`${styles.card} ${styles.ctaCard}`}>
              <div className={styles.ctaIcon}>🎓</div>
              <h2 className={styles.cardTitle}>Trouver un mentor</h2>
              <p className={styles.ctaText}>
                Explorez nos mentors disponibles et réservez une séance
                d&apos;accompagnement personnalisée.
              </p>
              <Link href="/mentors" className={styles.ctaButton}>
                Parcourir les mentors
              </Link>
            </section>
          )}

          {/* Section 3 : Messages récents */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                Messages
                {totalUnread > 0 && (
                  <span className={styles.unreadBadge}>{totalUnread}</span>
                )}
              </h2>
              <Link href="/messages" className={styles.seeAll}>
                Tout voir
              </Link>
            </div>
            {recentConversations.length === 0 ? (
              <p className={styles.empty}>Aucun message récent.</p>
            ) : (
              <ul className={styles.itemList}>
                {recentConversations.map((c) => (
                  <li key={c.conversationId} className={styles.messageItem}>
                    <div className={styles.avatar}>
                      {c.peer.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.messageInfo}>
                      <div className={styles.messageTop}>
                        <span className={styles.messagePeer}>
                          {c.peer.fullName}
                        </span>
                        <span className={styles.messageTime}>
                          {timeAgo(c.lastMessageAt)}
                        </span>
                      </div>
                      <p className={styles.messagePreview}>
                        {c.lastMessage?.body ?? '—'}
                      </p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className={styles.unreadDot} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Liens rapides */}
        <div className={styles.quickLinks}>
          <Link href="/preferences-notifications" className={styles.quickLink}>
            Préférences notifications
          </Link>
          <Link href="/rgpd/suppression" className={styles.quickLink}>
            Mes données RGPD
          </Link>
          {(isAdmin || isSupport) && (
            <>
              <Link href="/admin/incidents" className={styles.quickLink}>
                Incidents support
              </Link>
              <Link href="/admin/analytics" className={styles.quickLink}>
                Analytics
              </Link>
              {isAdmin && (
                <>
                  <Link
                    href="/admin/utilisateurs"
                    className={styles.quickLink}
                  >
                    Utilisateurs
                  </Link>
                  <Link
                    href="/admin/mentors/validation"
                    className={styles.quickLink}
                  >
                    Validation mentors
                  </Link>
                  <Link
                    href="/admin/mentors/visibilite"
                    className={styles.quickLink}
                  >
                    Visibilité mentors
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
