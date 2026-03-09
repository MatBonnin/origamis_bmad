import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  studentId: string;
  studentName: string;
  title: string;
  status: string;
  milestones: Array<{ title: string; status: string; dueAt?: string }>;
  lastSessionAt?: string;
}

interface MentorStats {
  totalSessions: number;
  totalHours: number;
  activeStudents: number;
  averageRating: number;
}

interface MentorRequest {
  requestId: string;
  studentId: string;
  studentName: string;
  message?: string;
  createdAt: string;
}

interface StudentProgression {
  completionRate: number;
  totalMilestones: number;
  completedMilestones: number;
  inProgressMilestones: number;
  milestones: Array<{
    id: string;
    title: string;
    status: string;
    dueAt?: string;
  }>;
}

interface StudentMentor {
  mentorId: string;
  fullName: string;
  avatarUrl?: string;
  domain: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function formatDueDate(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function toSafeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStudentProgression(
  data: StudentProgression | null,
): StudentProgression {
  const milestones = Array.isArray(data?.milestones) ? data.milestones : [];
  const metadataLike = data as unknown as {
    metadata?: {
      total?: number;
      totalCompleted?: number;
      totalPending?: number;
      completionRate?: number;
    };
  };
  const metadata = metadataLike?.metadata;

  const totalMilestones =
    Math.max(0, toSafeNumber(data?.totalMilestones)) ||
    Math.max(0, toSafeNumber(metadata?.total));
  const completedMilestones =
    Math.max(0, toSafeNumber(data?.completedMilestones)) ||
    Math.max(0, toSafeNumber(metadata?.totalCompleted));
  const inferredInProgress = Math.max(0, totalMilestones - completedMilestones);
  const inProgressMilestones =
    Math.max(0, toSafeNumber(data?.inProgressMilestones)) ||
    Math.max(0, toSafeNumber(metadata?.totalPending)) ||
    inferredInProgress;

  return {
    completionRate:
      Math.max(0, toSafeNumber(data?.completionRate)) ||
      Math.max(0, toSafeNumber(metadata?.completionRate)),
    totalMilestones,
    completedMilestones,
    inProgressMilestones,
    milestones,
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/connexion');

  const { accessToken, user } = session;
  const isMentor = user.roles.includes('mentor');
  const isAdmin = user.roles.includes('admin');
  const isSupport = user.roles.includes('support');

  // Fetch common data
  const [bookingsData, conversationsData] = await Promise.all([
    fetchJson<{ bookings: BookingItem[] }>(
      `${API_URL}/bookings?status=confirmed`,
      accessToken,
    ),
    fetchJson<{ conversations: ConversationItem[] }>(
      `${API_URL}/messaging/conversations`,
      accessToken,
    ),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingBookings = (bookingsData?.bookings ?? [])
    .filter((b) => new Date(b.bookingDate) >= today)
    .slice(0, 4);

  const recentConversations = (conversationsData?.conversations ?? []).slice(0, 4);
  const totalUnread = (conversationsData?.conversations ?? []).reduce(
    (sum, c) => sum + c.unreadCount,
    0,
  );

  // ─── MENTOR DASHBOARD ────────────────────────────────────────────────────────
  if (isMentor) {
    // Fetch mentor-specific data
    const [programsData, requestsData, statsData] = await Promise.all([
      fetchJson<{ programs: ProgramItem[] }>(`${API_URL}/mentor/programs`, accessToken),
      fetchJson<{ requests: MentorRequest[] }>(`${API_URL}/mentor/requests`, accessToken),
      fetchJson<MentorStats>(`${API_URL}/mentor/stats`, accessToken),
    ]);

    const activePrograms = (programsData?.programs ?? [])
      .filter((p) => p.status === 'active')
      .slice(0, 5);

    const pendingRequests = (requestsData?.requests ?? [])
      .filter((r) => true) // already filtered by API
      .slice(0, 3);

    const stats: MentorStats = statsData ?? {
      totalSessions: upcomingBookings.length,
      totalHours: upcomingBookings.length * 1,
      activeStudents: activePrograms.length,
      averageRating: 4.8,
    };

    return (
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <h1 className={styles.greeting}>Bonjour, {user.firstName}</h1>
            <p className={styles.subtitle}>
              Voici un apercu de votre impact en tant que mentor
            </p>
            <span className={styles.roleBadge}>Mentor</span>
          </header>

          {/* Impact Stats */}
          <div className={styles.impactGrid}>
            <div className={styles.impactCard}>
              <div className={`${styles.impactIcon} ${styles.sessions}`}>📅</div>
              <div className={styles.impactContent}>
                <span className={styles.impactValue}>{stats.totalSessions}</span>
                <span className={styles.impactLabel}>Sessions</span>
              </div>
            </div>
            <div className={styles.impactCard}>
              <div className={`${styles.impactIcon} ${styles.hours}`}>⏱️</div>
              <div className={styles.impactContent}>
                <span className={styles.impactValue}>{stats.totalHours}h</span>
                <span className={styles.impactLabel}>Heures de mentorat</span>
              </div>
            </div>
            <div className={styles.impactCard}>
              <div className={`${styles.impactIcon} ${styles.students}`}>👥</div>
              <div className={styles.impactContent}>
                <span className={styles.impactValue}>{stats.activeStudents}</span>
                <span className={styles.impactLabel}>Etudiants actifs</span>
              </div>
            </div>
            <div className={styles.impactCard}>
              <div className={`${styles.impactIcon} ${styles.rating}`}>⭐</div>
              <div className={styles.impactContent}>
                <span className={styles.impactValue}>{stats.averageRating.toFixed(1)}</span>
                <span className={styles.impactLabel}>Note moyenne</span>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className={styles.mainGrid}>
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <section className={`${styles.card} ${styles.wideCard}`}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <span className={styles.cardTitleIcon}>🔔</span>
                    Demandes en attente
                  </h2>
                  <Link href="/mentor/requests" className={styles.seeAllLink}>
                    Tout voir →
                  </Link>
                </div>
                <ul className={styles.requestsList}>
                  {pendingRequests.map((req) => (
                    <li key={req.requestId} className={styles.requestItem}>
                      <div className={styles.requestAvatar}>
                        {req.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.requestInfo}>
                        <p className={styles.requestName}>{req.studentName}</p>
                        <p className={styles.requestDetails}>
                          {req.message
                            ? req.message.slice(0, 60) + (req.message.length > 60 ? '...' : '')
                            : `Demande reçue ${timeAgo(req.createdAt)}`}
                        </p>
                      </div>
                      <div className={styles.requestActions}>
                        <button className={`${styles.requestBtn} ${styles.accept}`}>
                          Accepter
                        </button>
                        <button className={`${styles.requestBtn} ${styles.decline}`}>
                          Refuser
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* My Mentees */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <span className={styles.cardTitleIcon}>👨‍🎓</span>
                  Mes mentores
                </h2>
                <Link href="/mentor/programs" className={styles.seeAllLink}>
                  Tout voir →
                </Link>
              </div>
              {activePrograms.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>👥</span>
                  <p className={styles.emptyText}>Aucun etudiant actif pour le moment</p>
                </div>
              ) : (
                <ul className={styles.menteesList}>
                  {activePrograms.map((prog) => {
                    const done = prog.milestones.filter((m) => m.status === 'done').length;
                    const total = prog.milestones.length;
                    return (
                      <li key={prog.programId} className={styles.menteeItem}>
                        <div className={styles.menteeAvatar}>
                          {prog.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.menteeInfo}>
                          <p className={styles.menteeName}>{prog.studentName}</p>
                          <p className={styles.menteeMeta}>
                            {prog.title} • {done}/{total} jalons
                          </p>
                        </div>
                        <span className={styles.menteeBadge}>Actif</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Upcoming Bookings */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <span className={styles.cardTitleIcon}>📆</span>
                  Prochains rendez-vous
                </h2>
                <Link href="/bookings" className={styles.seeAllLink}>
                  Tout voir →
                </Link>
              </div>
              {upcomingBookings.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>📅</span>
                  <p className={styles.emptyText}>Aucun rendez-vous prevu</p>
                  <Link href="/mentor/availability" className={styles.emptyAction}>
                    Gerer mes disponibilites
                  </Link>
                </div>
              ) : (
                <ul className={styles.bookingsList}>
                  {upcomingBookings.map((b) => {
                    const { day, month } = formatDate(b.bookingDate);
                    const studentName = `${b.student.firstName} ${b.student.lastName}`;
                    return (
                      <li key={b.bookingId} className={styles.bookingItem}>
                        <div className={styles.bookingDate}>
                          <span className={styles.bookingDay}>{day}</span>
                          <span className={styles.bookingMonth}>{month}</span>
                        </div>
                        <div className={styles.bookingInfo}>
                          <p className={styles.bookingTime}>
                            {b.startTime} – {b.endTime}
                          </p>
                          <p className={styles.bookingPeer}>{studentName}</p>
                        </div>
                        <span className={styles.bookingStatus}>Confirme</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Messages */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <span className={styles.cardTitleIcon}>💬</span>
                  Messages
                  {totalUnread > 0 && (
                    <span className={styles.unreadBadge}>{totalUnread}</span>
                  )}
                </h2>
                <Link href="/mentor/messages" className={styles.seeAllLink}>
                  Tout voir →
                </Link>
              </div>
              {recentConversations.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>💬</span>
                  <p className={styles.emptyText}>Aucun message recent</p>
                </div>
              ) : (
                <ul className={styles.messagesList}>
                  {recentConversations.map((c) => (
                    <li key={c.conversationId} className={styles.messageItem}>
                      <div className={styles.messageAvatar}>
                        {c.peer.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.messageContent}>
                        <div className={styles.messageHeader}>
                          <span className={styles.messageName}>{c.peer.fullName}</span>
                          <span className={styles.messageTime}>
                            {timeAgo(c.lastMessageAt)}
                          </span>
                        </div>
                        <p className={styles.messagePreview}>
                          {c.lastMessage?.body ?? '—'}
                        </p>
                      </div>
                      {c.unreadCount > 0 && <span className={styles.unreadDot} />}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Quick Links */}
          <div className={styles.quickLinks}>
            <Link href="/mentor/availability" className={styles.quickLink}>
              Disponibilites
            </Link>
            <Link href="/mentors/profil" className={styles.quickLink}>
              Mon profil mentor
            </Link>
            <Link href="/preferences-notifications" className={styles.quickLink}>
              Notifications
            </Link>
            {(isAdmin || isSupport) && (
              <>
                <Link href="/admin/incidents" className={styles.quickLink}>
                  Incidents
                </Link>
                {isAdmin && (
                  <Link href="/admin/mentors/validation" className={styles.quickLink}>
                    Validation mentors
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── STUDENT DASHBOARD ───────────────────────────────────────────────────────

  // Fetch student-specific data
  const [progressionData, mentorData] = await Promise.all([
    fetchJson<StudentProgression>(`${API_URL}/milestones/progression?user_id=${user.id}`, accessToken),
    fetchJson<StudentMentor>(`${API_URL}/students/me/mentor`, accessToken),
  ]);

  const progression = normalizeStudentProgression(progressionData);
  const upcomingMilestones = Math.max(
    0,
    progression.totalMilestones -
      progression.completedMilestones -
      progression.inProgressMilestones,
  );

  const recentMilestones = progression.milestones
    .filter((m) => m.status !== 'done')
    .slice(0, 4);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>Bonjour, {user.firstName}</h1>
          <p className={styles.subtitle}>Continuez votre progression vers vos objectifs</p>
          <span className={styles.roleBadge}>Etudiant</span>
        </header>

        {/* Main Grid */}
        <div className={styles.mainGrid}>
          {/* Progression Card */}
          <section className={`${styles.card} ${styles.progressionCard} ${styles.wideCard}`}>
            <div className={styles.progressionHeader}>
              <div>
                <h2 className={styles.progressionTitle}>Ma progression</h2>
                <p className={styles.progressionSubtitle}>
                  Parcours d&apos;apprentissage
                </p>
              </div>
              <span className={styles.progressionPercent}>
                {Math.round(progression.completionRate)}%
              </span>
            </div>
            <div className={styles.progressionBar}>
              <div
                className={styles.progressionFill}
                style={{ width: `${progression.completionRate}%` }}
              />
            </div>
            <div className={styles.progressionStats}>
              <div className={styles.progressionStat}>
                <span className={styles.progressionStatValue}>
                  {progression.completedMilestones}
                </span>
                <span className={styles.progressionStatLabel}>Completes</span>
              </div>
              <div className={styles.progressionStat}>
                <span className={styles.progressionStatValue}>
                  {progression.inProgressMilestones}
                </span>
                <span className={styles.progressionStatLabel}>En cours</span>
              </div>
              <div className={styles.progressionStat}>
                <span className={styles.progressionStatValue}>
                  {upcomingMilestones}
                </span>
                <span className={styles.progressionStatLabel}>A venir</span>
              </div>
            </div>
          </section>

          {/* My Mentor or Find Mentor CTA */}
          {mentorData ? (
            <section className={`${styles.card} ${styles.myMentorCard}`}>
              <div className={styles.myMentorAvatar}>
                {mentorData.avatarUrl ? (
                  <img src={mentorData.avatarUrl} alt={mentorData.fullName} />
                ) : (
                  mentorData.fullName.charAt(0).toUpperCase()
                )}
              </div>
              <div className={styles.myMentorInfo}>
                <p className={styles.myMentorLabel}>Mon mentor</p>
                <h3 className={styles.myMentorName}>{mentorData.fullName}</h3>
                <p className={styles.myMentorDomain}>{mentorData.domain}</p>
              </div>
              <div className={styles.myMentorActions}>
                <Link
                  href={`/messages?mentor=${mentorData.mentorId}`}
                  className={`${styles.myMentorBtn} ${styles.primary}`}
                >
                  Message
                </Link>
                <Link
                  href={`/mentors/${mentorData.mentorId}/book`}
                  className={`${styles.myMentorBtn} ${styles.secondary}`}
                >
                  Reserver
                </Link>
              </div>
            </section>
          ) : (
            <section className={`${styles.card} ${styles.findMentorCta}`}>
              <span className={styles.findMentorIcon}>🎯</span>
              <h3 className={styles.findMentorTitle}>Trouvez votre mentor</h3>
              <p className={styles.findMentorText}>
                Connectez-vous avec un expert qui vous guidera vers vos objectifs
              </p>
              <Link href="/mentors" className={styles.findMentorBtn}>
                Parcourir les mentors →
              </Link>
            </section>
          )}

          {/* Current Milestones */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span className={styles.cardTitleIcon}>🎯</span>
                Objectifs en cours
              </h2>
              <Link href="/projets" className={styles.seeAllLink}>
                Tout voir →
              </Link>
            </div>
            {recentMilestones.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✨</span>
                <p className={styles.emptyText}>
                  Aucun objectif en cours. Reservez une session pour commencer !
                </p>
              </div>
            ) : (
              <ul className={styles.milestonesList}>
                {recentMilestones.map((m) => {
                  const statusClass =
                    m.status === 'done'
                      ? styles.done
                      : m.status === 'in_progress'
                        ? styles.inProgress
                        : styles.pending;
                  const statusLabel =
                    m.status === 'done'
                      ? 'Termine'
                      : m.status === 'in_progress'
                        ? 'En cours'
                        : 'A faire';
                  const icon =
                    m.status === 'done' ? '✅' : m.status === 'in_progress' ? '🔄' : '⏳';
                  return (
                    <li key={m.id} className={styles.milestoneItem}>
                      <div className={`${styles.milestoneIcon} ${statusClass}`}>{icon}</div>
                      <div className={styles.milestoneInfo}>
                        <p className={styles.milestoneTitle}>{m.title}</p>
                        {m.dueAt && (
                          <p className={styles.milestoneDue}>
                            Echeance : {formatDueDate(m.dueAt)}
                          </p>
                        )}
                      </div>
                      <span className={`${styles.milestoneStatus} ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Upcoming Bookings */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span className={styles.cardTitleIcon}>📆</span>
                Mes rendez-vous
              </h2>
              <Link href="/bookings" className={styles.seeAllLink}>
                Tout voir →
              </Link>
            </div>
            {upcomingBookings.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📅</span>
                <p className={styles.emptyText}>Aucun rendez-vous prevu</p>
                <Link href="/mentors" className={styles.emptyAction}>
                  Trouver un mentor
                </Link>
              </div>
            ) : (
              <ul className={styles.bookingsList}>
                {upcomingBookings.map((b) => {
                  const { day, month } = formatDate(b.bookingDate);
                  const mentorName = `${b.mentor.firstName} ${b.mentor.lastName}`;
                  return (
                    <li key={b.bookingId} className={styles.bookingItem}>
                      <div className={styles.bookingDate}>
                        <span className={styles.bookingDay}>{day}</span>
                        <span className={styles.bookingMonth}>{month}</span>
                      </div>
                      <div className={styles.bookingInfo}>
                        <p className={styles.bookingTime}>
                          {b.startTime} – {b.endTime}
                        </p>
                        <p className={styles.bookingPeer}>{mentorName}</p>
                      </div>
                      <span className={styles.bookingStatus}>Confirme</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Messages */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span className={styles.cardTitleIcon}>💬</span>
                Messages
                {totalUnread > 0 && (
                  <span className={styles.unreadBadge}>{totalUnread}</span>
                )}
              </h2>
              <Link href="/messages" className={styles.seeAllLink}>
                Tout voir →
              </Link>
            </div>
            {recentConversations.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>💬</span>
                <p className={styles.emptyText}>Aucun message recent</p>
              </div>
            ) : (
              <ul className={styles.messagesList}>
                {recentConversations.map((c) => (
                  <li key={c.conversationId} className={styles.messageItem}>
                    <div className={styles.messageAvatar}>
                      {c.peer.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.messageContent}>
                      <div className={styles.messageHeader}>
                        <span className={styles.messageName}>{c.peer.fullName}</span>
                        <span className={styles.messageTime}>
                          {timeAgo(c.lastMessageAt)}
                        </span>
                      </div>
                      <p className={styles.messagePreview}>
                        {c.lastMessage?.body ?? '—'}
                      </p>
                    </div>
                    {c.unreadCount > 0 && <span className={styles.unreadDot} />}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Quick Links */}
        <div className={styles.quickLinks}>
          <Link href="/mentors" className={styles.quickLink}>
            Trouver un mentor
          </Link>
          <Link href="/projets" className={styles.quickLink}>
            Ma progression
          </Link>
          <Link href="/preferences-notifications" className={styles.quickLink}>
            Notifications
          </Link>
          <Link href="/rgpd/suppression" className={styles.quickLink}>
            Mes donnees
          </Link>
        </div>
      </div>
    </div>
  );
}
